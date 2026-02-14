import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { ethers } from "ethers";
import { CONTRACTS, VAULT_ABI, ERC20_ABI, VAULT_FACTORY_ABI } from "@/lib/contracts";
import { sendNotificationEmail } from "@/lib/emailService";
import { createNotification } from "@/lib/notificationService";
import { saveReceipt } from "@/lib/receiptService";

// Prevent Vercel from caching this route
export const dynamic = 'force-dynamic';

const PROVIDER_URL = "https://coston2-api.flare.network/ext/C/rpc";

// This route will be triggered by a Cron Job (e.g. Vercel Cron)
export async function GET(req: NextRequest) {
    // 1. Authenticate the request (Security)
    // In production, check for a Bearer token or Vercel Cron signature
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // For now, let's keep it open for testing or use a simple env check
    }

    console.log("[Auto-Deposit Cron] Starting execution...");

    try {
        // Initialize Ethers Wallet (Admin/Operator)
        // This wallet must have FLR to pay for gas
        const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

        // 1. Fetch decimals from USDT contract
        const usdtContract = new ethers.Contract(CONTRACTS.coston2.USDTToken, ERC20_ABI, wallet);
        const decimals = await usdtContract.decimals().catch(() => 18);
        console.log(`[Auto-Deposit Cron] Global decimals for USDT0: ${decimals}`);

        // 2. Query Active Auto-Savings Tasks
        // Find tasks where nextRunAt is in the past (or now) and active is true
        const now = Date.now();
        const savingsRef = collection(db, "auto_savings");
        const q = query(
            savingsRef,
            where("isActive", "==", true)
        );

        const querySnapshot = await getDocs(q);
        const allPendingTasks = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // Filter by time in-memory to avoid index requirement
        const tasks = allPendingTasks.filter(task => task.nextRunAt <= now);

        console.log(`[Auto-Deposit Cron] Found ${tasks.length} pending tasks.`);

        const results = [];

        for (const task of tasks) {
            try {
                console.log(`[Auto-Deposit Cron] Processing task ${task.id} for vault ${task.vaultAddress}`);

                // 3. Vault Contract Instance
                const vaultContract = new ethers.Contract(task.vaultAddress, VAULT_ABI, wallet);

                // Get Purpose for notification
                const purpose = await vaultContract.purpose().catch(() => "Savings Vault");

                // Check if mature? (Ideally DB should flag this, but double check)
                const unlockTime = await vaultContract.unlockTimestamp();
                if (Number(unlockTime) * 1000 < now) {
                    console.log(`[Auto-Deposit Cron] Vault ${task.vaultAddress} has matured. Disabling task.`);
                    await updateDoc(doc(db, "auto_savings", task.id), { isActive: false });
                    continue;
                }

                // 4. Check Allowance & Balance (Optional but saves gas)
                // We'll skip this to keep it simple; if tx fails, we catch the error.

                // 5. Execute Transaction: executeAutoDeposit via Factory
                // The wallet calling this is the \"operator\" (Admin), pulling from \"owner\"
                const amountWei = ethers.parseUnits(task.amount, decimals);

                // Gas estimation might fail if allowance is missing, so we use a high limit or try/catch
                const factoryContract = new ethers.Contract(CONTRACTS.coston2.VaultFactory, VAULT_FACTORY_ABI, wallet);
                const tx = await factoryContract.executeAutoDeposit(task.vaultAddress, amountWei);
                console.log(`[Auto-Deposit Cron] Tx sent via Factory: ${tx.hash}`);

                const receipt = await tx.wait();

                if (receipt.status === 1) {
                    // Success!
                    console.log(`[Auto-Deposit Cron] Success for ${task.vaultAddress}`);

                    // 6. Update Database
                    const nextRun = calculateNextRun(task.frequency, task.executionDay, task.executionTime, now);
                    await updateDoc(doc(db, "auto_savings", task.id), {
                        lastRunAt: now,
                        nextRunAt: nextRun,
                        failures: 0
                    });

                    // 7. Notifications
                    await createNotification(
                        task.ownerAddress,
                        `Auto-Deposit: ${purpose}`,
                        `Successfully deposited ${task.amount} USDT0 into your "${purpose}" goal.`,
                        "success",
                        `/dashboard/savings/${task.vaultAddress}`
                    );

                    // 8. Add to History (Receipt)
                    await saveReceipt({
                        walletAddress: task.ownerAddress.toLowerCase(),
                        vaultAddress: task.vaultAddress.toLowerCase(),
                        txHash: tx.hash,
                        timestamp: Date.now(),
                        purpose: `Auto-Deposit: ${purpose}`,
                        amount: task.amount,
                        type: 'created', // This makes it show as a deposit/contribution in history
                        verified: true
                    });

                    // 9. Send Email
                    try {
                        const userDoc = await getDocs(query(collection(db, "users"), where("walletAddress", "==", task.ownerAddress.toLowerCase())));
                        if (!userDoc.empty) {
                            const userData = userDoc.docs[0].data();
                            const userEmail = userData.email;
                            if (userEmail && userData.notificationPreferences?.deposits !== false) {
                                await sendNotificationEmail("DEPOSIT_CONFIRMED", {
                                    userEmail,
                                    purpose: `Auto-Deposit: ${purpose}`,
                                    amount: task.amount,
                                    txHash: tx.hash,
                                    targetAmount: "0",
                                    proofRailsId: "",
                                    daysRemaining: 0
                                });
                            }
                        }
                    } catch (e) {
                        console.warn("Email failed", e);
                    }

                    results.push({ id: task.id, status: "success", tx: tx.hash });

                } else {
                    throw new Error("Transaction reverted");
                }

            } catch (error: any) {
                console.error(`[Auto-Deposit Cron] Failed task ${task.id}:`, error);

                // Handle Failure
                const newFailures = (task.failures || 0) + 1;
                const updateData: any = { failures: newFailures };

                // If too many failures, disable
                if (newFailures >= 3) {
                    updateData.isActive = false;
                    await createNotification(
                        task.ownerAddress,
                        "Auto-Deposit Cancelled",
                        `Your auto-deposit has failed 3 times in a row. It has been disabled. Please check your balance/allowance.`,
                        "error",
                        `/dashboard/savings/${task.vaultAddress}`
                    );
                } else {
                    // Retry logic? or just wait for next cycle?
                    // Usually we wait for next schedule, or try again in 1 hour if we implement retry queue
                    // For now, let's just stick to schedule but warn user
                    await createNotification(
                        task.ownerAddress,
                        "Auto-Deposit Failed",
                        `Failed to deposit ${task.amount} USDT0. Please ensure you have sufficient balance and allowance.`,
                        "error",
                        `/dashboard/savings/${task.vaultAddress}`
                    );
                }

                await updateDoc(doc(db, "auto_savings", task.id), updateData);
                results.push({ id: task.id, status: "failed", error: error.message });
            }
        }

        return NextResponse.json({ success: true, processed: results.length, details: results });

    } catch (e: any) {
        console.error("[Auto-Deposit Cron] Critical Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

function calculateNextRun(freq: string, day: number, timeStr: string, fromTimestamp: number): number {
    const date = new Date(fromTimestamp);
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Set to the preferred time of the current day
    date.setHours(hours, minutes, 0, 0);

    if (freq === 'daily') {
        date.setDate(date.getDate() + 1);
    } else if (freq === 'weekly') {
        date.setDate(date.getDate() + 7);
        // Ensure it stays on the correct day of week if somehow mismatched
    } else if (freq === 'monthly') {
        date.setMonth(date.getMonth() + 1);
        // Ensure it stays on the correct day of month
    } else if (freq === 'minutely') {
        // For testing, just add 1 minute to fromTimestamp to avoid complicated time logic
        return fromTimestamp + 60000;
    }

    return date.getTime();
}
