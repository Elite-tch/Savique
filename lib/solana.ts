import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

// Program ID - Deployed on Solana Devnet
export const SAVIQUE_PROGRAM_ID = new PublicKey("EXfgq3u62BMSyPDT9hvyfYUCjEGuTcbq1ftkydqttAyA");

// Devnet USDC Mint
export const DEVNET_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// SHIP Token Mint - Deployed on Devnet (9 decimals)
export const DEVNET_SHIP_MINT = new PublicKey("E9zvTs2QfqXA2QFZ3Ht6YX5w4yzfJxbKWoWDHd2CtBEX");

/**
 * Derives the Vault PDA address for a user and a specific vault index.
 * Seeds: ["vault", user_pubkey, index_as_u64]
 */
export async function deriveVaultPDA(userPubkey: PublicKey, index: number) {
    const [address] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("vault"),
            userPubkey.toBuffer(),
            new Uint8Array(new BigUint64Array([BigInt(index)]).buffer)
        ],
        SAVIQUE_PROGRAM_ID
    );
    return address;
}

/**
 * Derives the Global Registry PDA (equivalent to Factory on Flare)
 * Seeds: ["registry"]
 */
export async function deriveRegistryPDA() {
    const [address] = PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        SAVIQUE_PROGRAM_ID
    );
    return address;
}

/**
 * Derives the Vault Associated Token Account (ATA)
 */
export function deriveVaultTokenAccount(vaultPDA: PublicKey, mint: PublicKey = DEVNET_SHIP_MINT) {
    return getAssociatedTokenAddressSync(
        mint,
        vaultPDA,
        true // allowOwnerOffCurve = true because the owner is a PDA
    );
}

export function deriveVaultPDAByPurpose(owner: PublicKey, purpose: string) {
    const [address] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("vault"),
            owner.toBuffer(),
            Buffer.from(purpose)
        ],
        SAVIQUE_PROGRAM_ID
    );
    return address;
}
