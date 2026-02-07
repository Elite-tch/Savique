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
