import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface UserProfile {
    walletAddress: string;
    email?: string;
    notificationPreferences: {
        deposits: boolean;
        withdrawals: boolean;
        maturityWarnings: boolean;
    };
    createdAt: number;
    updatedAt: number;
}

const USER_COLLECTION = 'users';

/**
 * Get user profile by wallet address
 */
export async function getUserProfile(walletAddress: string): Promise<UserProfile | null> {
    try {
        const docRef = doc(db, USER_COLLECTION, walletAddress.toLowerCase());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
        }
        return null;
    } catch (error) {
        console.error('[UserService] Error fetching profile:', error);
        return null;
    }
}

/**
 * Update user email and preferences
 */
export async function updateUserProfile(walletAddress: string, data: Partial<UserProfile>) {
    try {
        const docRef = doc(db, USER_COLLECTION, walletAddress.toLowerCase());
        const docSnap = await getDoc(docRef);

        const now = Date.now();

        if (!docSnap.exists()) {
            // Create new profile
            const newProfile: UserProfile = {
                walletAddress: walletAddress.toLowerCase(),
                email: data.email || '',
                notificationPreferences: data.notificationPreferences || {
                    deposits: true,
                    withdrawals: true,
                    maturityWarnings: true
                },
                createdAt: now,
                updatedAt: now
            };
            await setDoc(docRef, newProfile);
        } else {
            // Update existing
            await updateDoc(docRef, {
                ...data,
                updatedAt: now
            });
        }
    } catch (error) {
        console.error('[UserService] Error updating profile:', error);
        throw error;
    }
}
/**
 * Ensure a user profile exists for a wallet address.
 * Creates a basic profile if none exists.
 */
export async function ensureUserExists(walletAddress: string) {
    try {
        const docRef = doc(db, USER_COLLECTION, walletAddress.toLowerCase());
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            const now = Date.now();
            const newProfile: UserProfile = {
                walletAddress: walletAddress.toLowerCase(),
                email: '',
                notificationPreferences: {
                    deposits: true,
                    withdrawals: true,
                    maturityWarnings: true
                },
                createdAt: now,
                updatedAt: now
            };
            await setDoc(docRef, newProfile);
            console.log('[UserService] Initial profile created for:', walletAddress);
            return true;
        }
        return false;
    } catch (error) {
        console.error('[UserService] Error ensuring user exists:', error);
        return false;
    }
}
/**
 * Bulk sync users from vault owners.
 * Finds unique owners and ensuring a profile exists for each.
 */
export async function syncUserProfiles(owners: string[]) {
    try {
        const uniqueOwners = Array.from(new Set(owners.map(o => o.toLowerCase())));
        let addedCount = 0;

        for (const owner of uniqueOwners) {
            const added = await ensureUserExists(owner);
            if (added) addedCount++;
        }

        console.log(`[UserService] Sync complete. Created ${addedCount} new user profiles.`);
        return addedCount;
    } catch (error) {
        console.error('[UserService] Error syncing user profiles:', error);
        return 0;
    }
}
