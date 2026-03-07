"use client";

import { useState, useEffect, useMemo } from "react";
import { usePublicClient } from "wagmi";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEcosystemAccount } from "./useEcosystemAccount";
import { useContractAddresses } from "./useContractAddresses";
import { VAULT_FACTORY_ABI } from "@/lib/contracts";
import { getUserVaultsFromDb, saveVault } from "@/lib/receiptService";
import { SAVIQUE_PROGRAM_ID } from "@/lib/solana";

export interface UnifiedVault {
    address: string;
    chain: 'flare' | 'solana';
    purpose?: string;
    createdAt?: number;
    balance?: string; // Raw units (string to handle large numbers)
    isActive?: boolean;
    currency?: string;
    mint?: string;
    decimals?: number;
}

export function useVaults() {
    const { flareAddress, solanaAddress, isFlareConnected, isSolanaConnected } = useEcosystemAccount();
    const { factoryAddress } = useContractAddresses();
    const publicClient = usePublicClient();
    const { connection } = useConnection();

    const [vaults, setVaults] = useState<UnifiedVault[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        const fetchVaults = async () => {
            if (!isFlareConnected && !isSolanaConnected) {
                if (!ignore) setVaults([]);
                return;
            }

            setLoading(true);
            try {
                let allUnifiedVaults: UnifiedVault[] = [];

                // 1. Fetch Flare if connected
                if (isFlareConnected && flareAddress && publicClient && factoryAddress) {
                    const dbVaults = await getUserVaultsFromDb(flareAddress);
                    let chainVaults: string[] = [];
                    try {
                        const rawChainVaults = await publicClient.readContract({
                            address: factoryAddress as `0x${string}`,
                            abi: VAULT_FACTORY_ABI,
                            functionName: "getUserVaults",
                            args: [flareAddress as `0x${string}`]
                        });
                        chainVaults = [...rawChainVaults].reverse();
                    } catch (err) {
                        console.warn("Failed to fetch Flare chain vaults", err);
                    }

                    const normalizedChainVaults = chainVaults.map(v => v.toLowerCase());
                    const normalizedDbVaults = dbVaults.map(v => v.toLowerCase());
                    const uniqueFlareAddresses = Array.from(new Set([...normalizedDbVaults, ...normalizedChainVaults]));

                    const flareUnified = uniqueFlareAddresses.map(v => ({
                        address: v,
                        chain: 'flare' as const,
                    }));
                    allUnifiedVaults = [...allUnifiedVaults, ...flareUnified];

                    // Backfill logic
                    const missingInDb = normalizedChainVaults.filter(v => !normalizedDbVaults.includes(v));
                    if (missingInDb.length > 0) {
                        missingInDb.forEach(async (v) => {
                            await saveVault({
                                vaultAddress: v,
                                owner: flareAddress.toLowerCase(),
                                factoryAddress: factoryAddress,
                                createdAt: Date.now(),
                                purpose: "Imported Flare Savings"
                            });
                        });
                    }
                }

                // 2. Fetch Solana if connected
                if (isSolanaConnected && solanaAddress && connection) {
                    try {
                        const userPubkey = new PublicKey(solanaAddress);
                        const { fetchUserVaults } = await import("@/lib/anchor");
                        const solanaVaults = await fetchUserVaults(connection, userPubkey);

                        const { DEVNET_USDC_MINT, deriveVaultTokenAccount } = await import("@/lib/solana");

                        // To be efficient, we should fetch token account balances for all vaults
                        // But for now, let's at least ensure we are determining the correct currency
                        const solanaUnified = await Promise.all(solanaVaults.map(async ({ pubkey, account }) => {
                            const mint = account.mint;
                            const isUsdc = mint.equals(DEVNET_USDC_MINT);
                            const currency = isUsdc ? "USDC" : "SHIP";
                            const decimals = isUsdc ? 6 : 9;

                            // Dynamic balance fetching for accuracy
                            let balance = "0";
                            try {
                                const vaultTokenAccount = deriveVaultTokenAccount(pubkey, mint);
                                const tokenBalance = await connection.getTokenAccountBalance(vaultTokenAccount);
                                balance = tokenBalance.value.amount;
                            } catch (e) {
                                // Token account may not exist if vault was withdrawn - leave as 0
                            }

                            return {
                                address: pubkey.toBase58(),
                                chain: 'solana' as const,
                                purpose: account.purpose ?? "Solana Savings",
                                createdAt: account.createdAt?.toNumber() * 1000,
                                balance,
                                isActive: account.isActive,
                                currency,
                                mint: mint.toBase58(),
                                decimals
                            };
                        }));
                        allUnifiedVaults = [...allUnifiedVaults, ...solanaUnified];
                    } catch (err) {
                        console.warn("Failed to fetch Solana vaults", err);
                    }
                }

                if (!ignore) setVaults(allUnifiedVaults);
            } catch (err) {
                console.error("Failed to unified fetch vaults:", err);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchVaults();
        return () => { ignore = true; };
    }, [flareAddress, solanaAddress, isFlareConnected, isSolanaConnected, publicClient, factoryAddress, connection]);

    return { vaults, loading };
}
