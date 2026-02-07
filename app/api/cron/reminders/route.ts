import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { sendNotificationEmail, EmailType } from '@/lib/emailService';
import { getUserProfile } from '@/lib/userService';
import { createPublicClient, http } from 'viem';
import { flareTestnet } from 'viem/chains';
import { VAULT_ABI } from '@/contracts/abis';
import { FACTORY_ADDRESS, FACTORY_ABI } from '@/contracts/factory';

// Secret key to protect the cron endpoint (set in Vercel env vars)
const CRON_SECRET = process.env.CRON_SECRET;

// Create public client for reading blockchain data
const publicClient = createPublicClient({
    chain: flareTestnet,
    transport: http()
});

/**
 * Daily Cron Job for Sending Reminders
 * 
 * Schedule: Run daily at 9:00 AM WAT (8:00 AM UTC)
 * Vercel Cron: "0 8 * * *"
 * 
 * Sends:
 * 1. MATURITY_COUNTDOWN - 7, 3, 1 days before unlock
 * 2. GOAL_REMINDER - Every Monday for active savings with 7+ days remaining
 */
export async function GET(req: NextRequest) {
    try {
        // Verify cron secret (for security in production)
        const authHeader = req.headers.get('authorization');
        if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
            console.warn('[CronReminders] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = Date.now();
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Track sent emails
        const stats = {
            usersChecked: 0,
            vaultsChecked: 0,
            maturityCountdown: 0,
            goalReminder: 0,
            errors: 0
        };

        console.log('[CronReminders] Starting daily reminder check at', today.toISOString());

        // Get all user profiles with vaults
        const profilesRef = collection(db, 'userProfiles');
        const profilesSnapshot = await getDocs(profilesRef);

        // Process each user
        for (const profileDoc of profilesSnapshot.docs) {
            try {
                const profile = profileDoc.data();
                const walletAddress = profileDoc.id;

                // Skip users without email or those who opted out
                if (!profile.email || !profile.notificationPreferences?.maturityWarnings) {
                    continue;
                }

                stats.usersChecked++;

                // Get user's vaults from factory contract
                let vaults: readonly `0x${string}`[] = [];
                try {
                    vaults = await publicClient.readContract({
                        address: FACTORY_ADDRESS as `0x${string}`,
                        abi: FACTORY_ABI,
                        functionName: 'getVaultsByOwner',
                        args: [walletAddress as `0x${string}`]
                    }) as readonly `0x${string}`[];
                } catch (e) {
                    console.warn(`[CronReminders] Failed to get vaults for ${walletAddress.slice(0, 10)}:`, e);
                    continue;
                }

                if (!vaults || vaults.length === 0) {
                    continue;
                }

                // Check each vault
                for (const vaultAddress of vaults) {
                    try {
                        stats.vaultsChecked++;

                        // Get vault data from blockchain
                        const [unlockTime, balance, purpose] = await Promise.all([
                            publicClient.readContract({
                                address: vaultAddress,
                                abi: VAULT_ABI,
                                functionName: 'unlockTimestamp'
                            }),
                            publicClient.readContract({
                                address: vaultAddress,
                                abi: VAULT_ABI,
                                functionName: 'totalDeposits'
                            }),
                            publicClient.readContract({
                                address: vaultAddress,
                                abi: VAULT_ABI,
                                functionName: 'purpose'
                            })
                        ]);

                        const unlockTimestamp = Number(unlockTime) * 1000;
                        const balanceNum = Number(balance) / 1e6; // USDT has 6 decimals

                        // Skip if already unlocked or empty
                        if (unlockTimestamp <= now || balanceNum <= 0) {
                            continue;
                        }

                        // Calculate days remaining
                        const daysRemaining = Math.ceil((unlockTimestamp - now) / (24 * 60 * 60 * 1000));
                        const unlockDateStr = new Date(unlockTimestamp).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });

                        // Send MATURITY_COUNTDOWN for 7, 3, 1 days remaining
                        if ([7, 3, 1].includes(daysRemaining)) {
                            await sendNotificationEmail('MATURITY_COUNTDOWN', {
                                userEmail: profile.email,
                                purpose: purpose as string || 'Your Savings',
                                amount: balanceNum.toFixed(2),
                                unlockDate: unlockDateStr,
                                daysRemaining: daysRemaining
                            });
                            stats.maturityCountdown++;
                            console.log(`[CronReminders] Sent MATURITY_COUNTDOWN: ${profile.email} - ${daysRemaining} days left for "${purpose}"`);
                        }

                        // Send GOAL_REMINDER every Monday for savings with 7+ days remaining  
                        if (dayOfWeek === 1 && daysRemaining > 7) {
                            await sendNotificationEmail('GOAL_REMINDER', {
                                userEmail: profile.email,
                                purpose: purpose as string || 'Your Savings',
                                currentBalance: balanceNum.toFixed(2),
                                amount: balanceNum.toFixed(2),
                                unlockDate: unlockDateStr,
                                daysRemaining: daysRemaining
                            });
                            stats.goalReminder++;
                            console.log(`[CronReminders] Sent GOAL_REMINDER: ${profile.email} for "${purpose}"`);
                        }

                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));

                    } catch (vaultError) {
                        console.warn(`[CronReminders] Error processing vault ${vaultAddress.slice(0, 10)}:`, vaultError);
                        stats.errors++;
                    }
                }

            } catch (userError) {
                console.error(`[CronReminders] Error processing user:`, userError);
                stats.errors++;
            }
        }

        console.log('[CronReminders] Completed:', stats);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            stats
        });

    } catch (error: any) {
        console.error('[CronReminders] Fatal error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// POST for manual testing
export async function POST(req: NextRequest) {
    return GET(req);
}
