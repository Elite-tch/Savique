import { Program, AnchorProvider, Idl, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, Commitment } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { SAVIQUE_PROGRAM_ID } from "./solana";
import IDL from "./idl/savique_vault.json";

/** Vault account data as decoded by Anchor */
export interface VaultAccountData {
    owner: PublicKey;
    mint: PublicKey;
    purpose: string;
    unlockTimestamp: BN;
    createdAt: BN;
    lastActivity: BN;
    penaltyBps: number;
    isActive: boolean;
    beneficiary: PublicKey | null;
    totalDeposited: BN;
    bump: number;
}

/**
 * Creates a read-only Anchor provider (no wallet needed for reads)
 */
export function getReadOnlyProvider(connection: Connection) {
    const commitment: Commitment = "confirmed";
    const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
    };
    return new AnchorProvider(connection, dummyWallet as any, { commitment });
}

/**
 * Creates a fully-signed Anchor provider with the user's wallet
 */
export function getSigningProvider(connection: Connection, wallet: AnchorWallet) {
    return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

/**
 * Returns an initialized Anchor Program instance
 * Uses 'as any' cast because Anchor 0.32 IDL JSON doesn't perfectly match
 * the strict TypeScript types — this is the recommended pattern.
 */
export function getSaviqueProgram(provider: AnchorProvider): Program {
    return new Program(IDL as any, provider);
}

/**
 * Fetch all VaultAccounts owned by a specific user pubkey
 */
export async function fetchUserVaults(
    connection: Connection,
    userPubkey: PublicKey
): Promise<{ pubkey: PublicKey; account: VaultAccountData }[]> {
    const provider = getReadOnlyProvider(connection);
    const program = getSaviqueProgram(provider);

    try {
        const accounts = await (program.account as any).vaultAccount.all([
            {
                memcmp: {
                    offset: 8, // Skip Anchor discriminator (8 bytes)
                    bytes: userPubkey.toBase58(),
                },
            },
        ]);

        return accounts.map((a: any) => ({
            pubkey: a.publicKey as PublicKey,
            account: a.account as VaultAccountData,
        }));
    } catch (err) {
        console.error("fetchUserVaults error:", err);
        return [];
    }
}

/**
 * Fetch a single VaultAccount by its PDA pubkey
 */
export async function fetchVaultAccount(
    connection: Connection,
    vaultPubkey: PublicKey
): Promise<VaultAccountData | null> {
    const provider = getReadOnlyProvider(connection);
    const program = getSaviqueProgram(provider);

    try {
        const account = await (program.account as any).vaultAccount.fetch(vaultPubkey);
        return account as VaultAccountData;
    } catch (err) {
        return null;
    }
}
