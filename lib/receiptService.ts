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
    vaultAddress?: string; // Optinal for backward compatibility
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
 * Update an existing receipt in Firestore
 */
export async function updateReceipt(id: string, updates: Partial<Receipt>): Promise<void> {
    try {
        const { updateDoc, doc } = await import('firebase/firestore');
        const docRef = doc(db, RECEIPTS_COLLECTION, id);
        await updateDoc(docRef, { ...updates });
        console.log('[Firebase] Receipt updated:', id);
    } catch (error) {
        console.error('[Firebase] Error updating receipt:', error);
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
 * Get all receipts for a specific vault address
 */
export async function getReceiptsByVault(vaultAddress: string): Promise<Receipt[]> {
    try {
        const receiptsRef = collection(db, RECEIPTS_COLLECTION);
        const q = query(
            receiptsRef,
            where('vaultAddress', '==', vaultAddress.toLowerCase()),
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

        return receipts;
    } catch (error) {
        console.error('[Firebase] Error loading receipts by vault:', error);
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
    targetAmount?: string; // New: Sinking Fund Goal
}

export async function saveVault(data: SavedVault): Promise<string> {
    try {
        const normalizedAddress = data.vaultAddress.toLowerCase();
        const vaultsRef = collection(db, VAULTS_COLLECTION);
        const q = query(vaultsRef, where('vaultAddress', '==', normalizedAddress));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            const { updateDoc, doc } = await import('firebase/firestore');
            const docRef = doc(db, VAULTS_COLLECTION, docId);

            // Update existing vault with new data (like targetAmount)
            await updateDoc(docRef, {
                ...data,
                vaultAddress: normalizedAddress,
                updatedAt: Timestamp.now()
            });
            console.log("Vault updated:", normalizedAddress);
            return docId;
        }

        const docRef = await addDoc(vaultsRef, {
            ...data,
            vaultAddress: normalizedAddress,
            createdAt: Timestamp.now()
        });
        console.log('[Firebase] Vault saved:', normalizedAddress);
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

export async function getVaultByAddress(vaultAddress: string): Promise<SavedVault | null> {
    try {
        const vaultsRef = collection(db, VAULTS_COLLECTION);
        const q = query(vaultsRef, where('vaultAddress', '==', vaultAddress.toLowerCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const data = snapshot.docs[0].data();
        let createdDay = data.createdAt;
        if (createdDay && typeof createdDay.toMillis === 'function') {
            createdDay = createdDay.toMillis();
        }

        return {
            vaultAddress: data.vaultAddress,
            owner: data.owner,
            factoryAddress: data.factoryAddress,
            createdAt: createdDay || Date.now(),
            purpose: data.purpose,
            targetAmount: data.targetAmount // Retrieve target
        };
    } catch (error) {
        console.error('Error fetching vault by address:', error);
        return null;
    }
}

/**
 * Get ALL vaults for Admin Dashboard
 */
export async function getAllVaults(): Promise<SavedVault[]> {
    try {
        const vaultsRef = collection(db, VAULTS_COLLECTION);
        const q = query(vaultsRef, orderBy('createdAt', 'desc'));

        const querySnapshot = await getDocs(q);
        const vaults: SavedVault[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Map Firestore Timestamp to number if needed, or keep as is.
            // SavedVault interface says createdAt is number.
            // But we saved it as Timestamp.now() in saveVault.
            // Let's handle both.
            let created = data.createdAt;
            if (created && typeof created.toMillis === 'function') {
                created = created.toMillis();
            }

            vaults.push({
                vaultAddress: data.vaultAddress,
                owner: data.owner,
                factoryAddress: data.factoryAddress,
                createdAt: created || Date.now(),
                purpose: data.purpose
            });
        });

        console.log(`[Admin] Loaded ${vaults.length} total vaults`);
        return vaults;
    } catch (error) {
        console.error('[Admin] Error fetching all vaults:', error);
        return [];
    }
}

/**
 * Get ALL receipts for Admin Metrics
 */
export async function getAllReceipts(): Promise<Receipt[]> {
    try {
        const receiptsRef = collection(db, RECEIPTS_COLLECTION);
        const q = query(receiptsRef, orderBy('timestamp', 'desc'));

        const querySnapshot = await getDocs(q);
        const receipts: Receipt[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            receipts.push({
                id: doc.id,
                ...data
            } as Receipt);
        });

        return receipts;
    } catch (error) {
        console.error('[Admin] Error fetching all receipts:', error);
        return [];
    }
}

