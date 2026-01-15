"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lock, Wallet, TrendingUp, CheckCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, VAULT_FACTORY_ABI, VAULT_ABI, ERC20_ABI } from "@/lib/contracts";
import { useState, useEffect } from "react";
import { VaultPreviewCard } from "@/components/VaultPreviewCard";
import { useContractAddresses } from "@/hooks/useContractAddresses";
import { Input } from "@/components/ui/input";
import { usePrivy } from "@privy-io/react-auth";
import { getUserVaultsFromDb, saveVault } from "@/lib/receiptService";
import { usePublicClient } from "wagmi";


function StatCard({ stat }: { stat: any }) {
    const [isVisible, setIsVisible] = useState(false);
    const Icon = stat.icon;

    return (
        <Card className="relative p-0 overflow-hidden bg-white/5 border-white/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
            <div className="relative p-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-black/40 ${stat.color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                    {stat.isPrivacy && (
                        <button
                            onClick={() => setIsVisible(!isVisible)}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                    )}
                </div>
                <h2 className="text-2xl font-bold text-white">
                    {stat.isPrivacy ? (isVisible ? stat.value : "••••••") : stat.value}
                </h2>
            </div>
        </Card>
    );
}

export default function Dashboard() {
    const { authenticated, ready } = usePrivy();
    const { address, isConnected, isConnecting, isReconnecting } = useAccount();
    const { usdtAddress, factoryAddress, updateUsdtAddress, resetDefaults, isLoaded } = useContractAddresses();
    const [inputAddress, setInputAddress] = useState("");
    const [totalLocked, setTotalLocked] = useState("0.00");

    // USDT Balance
    const { data: balance, isLoading, isError, error } = useReadContract({
        address: usdtAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        query: {
            enabled: !!address && isLoaded,
        }
    });


    const { data: decimals } = useReadContract({
        address: usdtAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
    });

    if (isError) {
        console.error("USDT Balance Error:", error);
    }

    // Get user's vaults
    const [vaultAddresses, setVaultAddresses] = useState<string[] | undefined>(undefined);
    const [loadingVaults, setLoadingVaults] = useState(true);

    const publicClient = usePublicClient();

    // Get user's vaults using Hybrid Sync (DB + Chain)
    useEffect(() => {
        const fetchVaults = async () => {
            if (address && publicClient && factoryAddress) {
                try {
                    // 1. Get DB Vaults
                    const dbVaults = await getUserVaultsFromDb(address);

                    // 2. Get Chain Vaults
                    let chainVaults: string[] = [];
                    try {
                        const rawChainVaults = await publicClient.readContract({
                            address: factoryAddress,
                            abi: VAULT_FACTORY_ABI,
                            functionName: "getUserVaults",
                            args: [address]
                        });
                        chainVaults = [...rawChainVaults].reverse();
                    } catch (err) {
                        console.warn("Failed to fetch chain vaults", err);
                    }

                    // 3. Merge
                    const uniqueVaults = Array.from(new Set([...dbVaults, ...chainVaults]));
                    setVaultAddresses(uniqueVaults);

                    // 4. Backfill (Fire & Forget)
                    const missingInDb = chainVaults.filter(v => !dbVaults.includes(v));
                    if (missingInDb.length > 0) {
                        missingInDb.forEach(async (vault) => {
                            await saveVault({
                                vaultAddress: vault,
                                owner: address.toLowerCase(),
                                factoryAddress: factoryAddress,
                                createdAt: Date.now(),
                                purpose: "Imported Vault"
                            });
                        });
                    }

                } catch (e) {
                    console.error("Failed to load vaults", e);
                } finally {
                    setLoadingVaults(false);
                }
            } else {
                setLoadingVaults(false);
            }
        };
        fetchVaults();
    }, [address, publicClient, factoryAddress]);

    const vaultCount = vaultAddresses?.length || 0;

    // Read balances from all vaults
    const vaultBalanceContracts = (vaultAddresses || []).map((vaultAddr) => ({
        address: vaultAddr as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'totalAssets' as const,
    }));

    const { data: vaultBalances, isLoading: isBalancesLoading } = useReadContracts({
        contracts: vaultBalanceContracts,
        query: {
            enabled: vaultCount > 0
        }
    });

    // Read unlock timestamps from all vaults
    const vaultUnlockContracts = (vaultAddresses || []).map((vaultAddr) => ({
        address: vaultAddr as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'unlockTimestamp' as const,
    }));

    const { data: unlockTimestamps } = useReadContracts({
        contracts: vaultUnlockContracts,
        query: {
            enabled: vaultCount > 0
        }
    });

    // Calculate completed vaults (unlocked)
    const completedCount = (unlockTimestamps || []).filter((result) => {
        if (result.status === 'success' && result.result) {
            const unlockTime = Number(result.result) * 1000;
            return Date.now() >= unlockTime;
        }
        return false;
    }).length;

    // Derived active list for Recent Vaults
    const activeVaultList = (vaultAddresses || []).filter((_, index) => {
        const res = vaultBalances?.[index];
        if (res?.status === 'success' && res.result) {
            return (res.result as bigint) > BigInt(0);
        }
        return false;
    });

    const recentActiveVaults = [...activeVaultList].slice(0, 3);

    // Calculate Active and Completed vaults based on balance
    let activeVaultCount = 0;

    // Calculate total locked and active count
    useEffect(() => {
        if (!vaultBalances || vaultBalances.length === 0) {
            setTotalLocked("0.00");
            return;
        }

        let total = BigInt(0);
        let active = 0;

        vaultBalances.forEach((result) => {
            if (result.status === 'success' && result.result) {
                const bal = result.result as bigint;
                total += bal;
                if (bal > BigInt(0)) active++;
            }
        });

        setTotalLocked(parseFloat(formatUnits(total, decimals || 18)).toFixed(2));
        // We can't update a local variable 'activeVaultCount' here to trigger re-render of stats, 
        // so we need a state or calculate it in render body if possible.
        // Actually, since vaultBalances is data, we can calculate derived state in render body.
    }, [vaultBalances, decimals]);

    // Derived state calculation from data
    const activeInfo = (vaultBalances || []).reduce((acc, result) => {
        if (result.status === 'success' && result.result) {
            if ((result.result as bigint) > BigInt(0)) {
                return acc + 1;
            }
        }
        return acc;
    }, 0);

    const calculatedActiveCount = vaultBalances ? activeInfo : 0;
    const calculatedCompletedCount = (vaultAddresses?.length || 0) - calculatedActiveCount;

    const formattedBalance = isConnected && balance
        ? parseFloat(formatUnits(balance as bigint, decimals || 18)).toFixed(2)
        : "---";

    const stats = [
        {
            label: "USDT0 Balance",
            value: isLoading ? "Loading..." : isError ? "Error" : `${formattedBalance} USDT0`,
            icon: Wallet,
            color: "text-green-400",
            isPrivacy: true
        },
        {
            label: "Active Vaults",
            value: calculatedActiveCount.toString(),
            icon: Lock,
            color: "text-primary",
            isPrivacy: false
        },
        {
            label: "Total Locked",
            value: `$ ${totalLocked} `,
            icon: TrendingUp,
            color: "text-purple-400",
            isPrivacy: true
        },
        {
            label: "Completed Vaults",
            value: calculatedCompletedCount.toString(),
            icon: CheckCircle,
            color: "text-primary",
            isPrivacy: false
        },
    ];

    if (!isConnected || !authenticated) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="p-12 text-center max-w-md bg-white/5 border-white/10">
                    <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-400">
                        Please connect your wallet to view your dashboard and manage your vaults.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
                    <p className="text-gray-400 mt-1">Snapshot of your wealth and vault activity.</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <StatCard stat={stat} />
                    </motion.div>
                ))}
            </div>

            {/* Action Row */}
            <div className="flex justify-between md:flex-row flex-col gap-3 md:items-center">
                <h2 className="text-2xl font-bold text-white">Recent Vaults</h2>
                <div className="flex gap-4 items-center">
                    <Link href="/dashboard/vaults">
                        <Button variant="ghost" className="text-gray-400 hover:text-white">
                            View All
                        </Button>
                    </Link>
                    <Link href="/dashboard/create">
                        <Button className="gap-2 bg-primary text-white hover:bg-primary/90">
                            <Plus className="w-4 h-4" /> Create New Vault
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Vaults Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isBalancesLoading ? (
                    [1, 2, 3].map((i) => (
                        <Card key={i} className="h-64 animate-pulse bg-white/5 border-transparent">
                            <div className="w-full h-full" />
                        </Card>
                    ))
                ) : recentActiveVaults.length === 0 ? (
                    <Card className="border-dashed border-white/10 bg-transparent flex flex-col items-center justify-center p-12 text-center col-span-full h-64">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white">No Active Vaults</h3>
                        <p className="text-gray-400 mb-6 max-w-sm">
                            You don't have any active savings plans yet. Start by creating a personal vault.
                        </p>
                        <Link href="/dashboard/create">
                            <Button variant="outline" className="border-white/20 hover:bg-white/10">Get Started</Button>
                        </Link>
                    </Card>
                ) : (
                    recentActiveVaults.map((vaultAddr, index) => (
                        <VaultPreviewCard key={vaultAddr} address={vaultAddr as `0x${string}`} index={index} />
                    ))
                )}
            </div>



        </div>
    );
}
