import { db } from './firebase';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp
} from 'firebase/firestore';

export interface Receipt {
    id?: string;
    walletAddress: string;
    txHash: string;
    timestamp: number;
    purpose: string;
    amount: string;
    verified: boolean;
    type: 'created' | 'breaked' | 'completed';
    penalty?: string;
    proofRailsId?: string;
}

const RECEIPTS_COLLECTION = 'receipts';

/**
 * Save a receipt to Firestore
 */
export async function saveReceipt(receipt: Omit<Receipt, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, RECEIPTS_COLLECTION), {
            ...receipt,
            createdAt: Timestamp.now()
        });
        console.log('[Firebase] Receipt saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[Firebase] Error saving receipt:', error);
        throw error;
    }
}

/**
 * Get all receipts for a specific wallet address
 */
export async function getReceiptsByWallet(walletAddress: string): Promise<Receipt[]> {
    try {
        const receiptsRef = collection(db, RECEIPTS_COLLECTION);
        const q = query(
            receiptsRef,
            where('walletAddress', '==', walletAddress.toLowerCase()),
            orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const receipts: Receipt[] = [];

        querySnapshot.forEach((doc) => {
            receipts.push({
                id: doc.id,
                ...doc.data()
            } as Receipt);
        });

        console.log(`[Firebase] Loaded ${receipts.length} receipts for wallet:`, walletAddress);
        return receipts;
    } catch (error) {
        console.error('[Firebase] Error loading receipts:', error);
        throw error;
    }
}

/**
 * Migrate receipts from localStorage to Firestore
 */
export async function migrateLocalStorageToFirestore(walletAddress: string): Promise<number> {
    try {
        let migratedCount = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('receipt_')) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);

                        // Only migrate if it belongs to this wallet or has no wallet address
                        if (!parsed.walletAddress || parsed.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
                            await saveReceipt({
                                walletAddress: walletAddress.toLowerCase(),
                                txHash: parsed.txHash,
                                timestamp: parsed.timestamp,
                                purpose: parsed.purpose,
                                amount: parsed.amount,
                                verified: parsed.verified || false,
                                type: parsed.type || 'created',
                                penalty: parsed.penalty,
                                proofRailsId: parsed.id
                            });

                            migratedCount++;
                            console.log('[Firebase] Migrated receipt:', parsed.purpose);
                        }
                    } catch (e) {
                        console.error('[Firebase] Error migrating receipt:', e);
                    }
                }
            }
        }

        console.log(`[Firebase] Migration complete: ${migratedCount} receipts migrated`);
        return migratedCount;
    } catch (error) {
        console.error('[Firebase] Migration error:', error);
        throw error;
    }
}

// --- Vault Persistence ---
const VAULTS_COLLECTION = 'user_vaults';

export interface SavedVault {
    vaultAddress: string;
    owner: string;
    factoryAddress: string;
    createdAt: number;
    purpose?: string;
}

export async function saveVault(data: SavedVault): Promise<string> {
    try {
        // Check if exists first to avoid duplicates
        const vaultsRef = collection(db, VAULTS_COLLECTION);
        const q = query(vaultsRef, where('vaultAddress', '==', data.vaultAddress));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            console.log("Vault already saved:", data.vaultAddress);
            return snapshot.docs[0].id;
        }

        const docRef = await addDoc(vaultsRef, {
            ...data,
            createdAt: Timestamp.now()
        });
        console.log('[Firebase] Vault saved:', data.vaultAddress);
        return docRef.id;
    } catch (error) {
        console.error('Error saving vault:', error);
        throw error;
    }
}

export async function getUserVaultsFromDb(ownerAddress: string): Promise<string[]> {
    try {
        const vaultsRef = collection(db, VAULTS_COLLECTION);
        const q = query(
            vaultsRef,
            where('owner', '==', ownerAddress.toLowerCase()),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const addresses: string[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.vaultAddress) {
                addresses.push(data.vaultAddress);
            }
        });
        return addresses;
    } catch (error) {
        console.error('Error fetching vaults from DB:', error);
        return [];
    }
}
