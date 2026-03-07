"use client";

import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEcosystem } from "@/context/EcosystemContext";
import { VAULT_ABI } from "@/lib/contracts";

export interface VaultData {
    purpose: string;
    balance: string;
    unlockTimestamp: number;
    createdAt: number;
    isLocked: boolean;
    chain: 'flare' | 'solana';
    currency?: string;
    decimals?: number;
}

export function useVaultData(address: string) {
    const { ecosystem } = useEcosystem();
    const publicClient = usePublicClient();
    const { connection } = useConnection();

    const [data, setData] = useState<VaultData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!address) return;
            setLoading(true);

            try {
                if (ecosystem === 'flare' && publicClient) {
                    // Flare Fetching
                    const [purpose, totalAssets, unlockTime] = await Promise.all([
                        publicClient.readContract({
                            address: address as `0x${string}`,
                            abi: VAULT_ABI,
                            functionName: 'purpose'
                        }),
                        publicClient.readContract({
                            address: address as `0x${string}`,
                            abi: VAULT_ABI,
                            functionName: 'totalAssets'
                        }),
                        publicClient.readContract({
                            address: address as `0x${string}`,
                            abi: VAULT_ABI,
                            functionName: 'unlockTimestamp'
                        })
                    ]);

                    setData({
                        purpose: purpose as string,
                        balance: totalAssets.toString(), // Needs formatting later
                        unlockTimestamp: Number(unlockTime),
                        createdAt: 0, // Flare vaults don't store creation date on-chain usually
                        isLocked: Date.now() < Number(unlockTime) * 1000,
                        chain: 'flare',
                        currency: 'USDT0'
                    });
                } else if (ecosystem === 'solana' && connection) {
                    const pubkey = new PublicKey(address);
                    const { fetchVaultAccount } = await import("@/lib/anchor");
                    const { deriveVaultTokenAccount, DEVNET_USDC_MINT } = await import("@/lib/solana");

                    // 1. Fetch vault account data first to get the mint
                    const vaultAccount = await fetchVaultAccount(connection, pubkey);

                    if (vaultAccount) {
                        const mint = vaultAccount.mint;
                        const currency = mint.equals(DEVNET_USDC_MINT) ? "USDC" : "SHIP";

                        // 2. Derive the correct token account for this mint
                        const vaultTokenAccount = await deriveVaultTokenAccount(pubkey, mint);

                        let balance = "0";
                        try {
                            const tokenBalance = await connection.getTokenAccountBalance(vaultTokenAccount);
                            balance = tokenBalance.value.amount;
                        } catch (e) {
                            console.warn("Vault token account not found or empty, defaulting to 0 balance");
                        }

                        setData({
                            purpose: vaultAccount.purpose || "Solana Savings",
                            balance: balance === "0" ? vaultAccount.totalDeposited.toString() : balance, // Fallback to account state if token balance is 0
                            unlockTimestamp: vaultAccount.unlockTimestamp.toNumber(),
                            createdAt: vaultAccount.createdAt.toNumber() * 1000, // To milliseconds
                            isLocked: Date.now() < vaultAccount.unlockTimestamp.toNumber() * 1000,
                            chain: 'solana',
                            currency: currency,
                            decimals: currency === "USDC" ? 6 : 9
                        });
                    }
                }
            } catch (err) {
                console.error("Error fetching vault data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [address, ecosystem, publicClient, connection]);

    return { data, loading };
}
