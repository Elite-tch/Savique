"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lock, Wallet, TrendingUp, CheckCircle, Eye, EyeOff, Coins, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, VAULT_FACTORY_ABI, VAULT_ABI, ERC20_ABI } from "@/lib/contracts";
import { useState, useEffect, useMemo, useCallback } from "react";
import { VaultPreviewCard } from "@/components/VaultPreviewCard";
import { useContractAddresses } from "@/hooks/useContractAddresses";
import { Input } from "@/components/ui/input";
import { getUserVaultsFromDb, saveVault } from "@/lib/receiptService";
import { usePublicClient } from "wagmi";
import { useEcosystemAccount } from "@/hooks/useEcosystemAccount";
import { useEcosystem } from "@/context/EcosystemContext";
import { useVaults } from "@/hooks/useVaults";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { DEVNET_SHIP_MINT, DEVNET_USDC_MINT } from "@/lib/solana";
import { toast } from "sonner";


function StatCard({ stat }: { stat: any }) {
    const [isVisible, setIsVisible] = useState(false);
    const Icon = stat.icon;

    return (
        <Card className="relative p-0 overflow-hidden bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 transition-all">
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
    const { address, isConnected } = useEcosystemAccount();
    const { isFlare, isSolana } = useEcosystem();
    const { usdtAddress, factoryAddress, updateUsdtAddress, resetDefaults, isLoaded } = useContractAddresses();
    const [inputAddress, setInputAddress] = useState("");
    const [solanaShipBalance, setSolanaShipBalance] = useState<string | null>(null);
    const [solanaUsdcBalance, setSolanaUsdcBalance] = useState<string | null>(null);
    const [dashboardToken, setDashboardToken] = useState<"SHIP" | "USDC">("USDC");
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [solanaBalanceRefetchKey, setSolanaBalanceRefetchKey] = useState(0);

    // USDT Balance
    const { data: balance, isLoading, isError, error } = useReadContract({
        address: usdtAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        query: {
            enabled: !!address && isLoaded && isFlare,
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

    const fetchSolanaBalances = useCallback(async () => {
        if (!isSolana || !address || !connection) return;
        try {
            const ownerPubkey = new PublicKey(address);

            // Fetch SHIP balance
            const shipAccounts = await connection.getParsedTokenAccountsByOwner(
                ownerPubkey,
                { mint: DEVNET_SHIP_MINT }
            );
            if (shipAccounts.value.length > 0) {
                setSolanaShipBalance(shipAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmountString);
            } else {
                setSolanaShipBalance("0");
            }

            // Fetch USDC balance
            const usdcAccounts = await connection.getParsedTokenAccountsByOwner(
                ownerPubkey,
                { mint: DEVNET_USDC_MINT }
            );
            if (usdcAccounts.value.length > 0) {
                setSolanaUsdcBalance(usdcAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmountString);
            } else {
                setSolanaUsdcBalance("0");
            }
        } catch (err) {
            console.error("Failed to fetch Solana balances:", err);
            setSolanaShipBalance("---");
            setSolanaUsdcBalance("---");
        }
    }, [isSolana, address, connection]);

    const forceRefetchSolanaBalance = () => {
        setSolanaBalanceRefetchKey(prev => prev + 1);
    };

    // Fetch SHIP & USDC balances on Solana
    useEffect(() => {
        fetchSolanaBalances();
    }, [fetchSolanaBalances, solanaBalanceRefetchKey]);

    const [isMinting, setIsMinting] = useState(false);

    const handleMintShip = async () => {
        if (!publicKey) {
            toast.error("Please connect your wallet first");
            return;
        }

        setIsMinting(true);
        const toastId = toast.loading("Minting 10,000 test SHIP...");

        try {
            const res = await fetch('/api/faucet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetAddress: publicKey.toBase58() })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success("Successfully minted 10,000 SHIP!", { id: toastId });
                // Refresh balance after a short delay to let RPC sync
                setTimeout(() => forceRefetchSolanaBalance(), 2000);
            } else {
                toast.error(data.error || "Failed to mint SHIP", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while minting", { id: toastId });
        } finally {
            setIsMinting(false);
        }
    };

    // Get user's vaults using Unified Hook (Flare + Solana)
    const { vaults: unifiedVaults, loading: loadingVaults } = useVaults();
    const vaultAddresses = useMemo(() => unifiedVaults.map(v => v.address), [unifiedVaults]);

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
            enabled: vaultCount > 0 && isFlare
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
            enabled: vaultCount > 0 && isFlare
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
    const activeVaultList = useMemo(() => {
        if (isFlare) {
            return (vaultAddresses || []).filter((_, index) => {
                const res = vaultBalances?.[index];
                if (res?.status === 'success' && res.result) {
                    return (res.result as bigint) > BigInt(0);
                }
                return false;
            });
        }
        // For Solana: show all active vaults regardless of token, sorted newest first
        return unifiedVaults
            .filter(v => v.isActive && v.balance && v.balance !== "0")
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .map(v => v.address);
    }, [isFlare, vaultAddresses, vaultBalances, unifiedVaults, dashboardToken]);

    const recentActiveVaults = useMemo(() => [...activeVaultList].slice(0, 3), [activeVaultList]);

    // Calculate Active and Completed vaults based on balance

    // Calculate total locked value via memo for absolute sync
    const totalLockedValue = useMemo(() => {
        if (isFlare) {
            if (!vaultBalances || vaultBalances.length === 0) return "0.00";
            let total = BigInt(0);
            vaultBalances.forEach((result) => {
                if (result.status === 'success' && result.result) {
                    total += result.result as bigint;
                }
            });
            return parseFloat(formatUnits(total, decimals || 18)).toFixed(2);
        } else if (isSolana) {
            if (!unifiedVaults || unifiedVaults.length === 0) return "0.00";
            let totalNum = 0;
            unifiedVaults.forEach((v) => {
                if (v.balance && (v.currency === dashboardToken)) {
                    const vaultDecimals = v.decimals || (dashboardToken === 'SHIP' ? 9 : 6);
                    const formatted = parseFloat(formatUnits(BigInt(v.balance), vaultDecimals));
                    totalNum += formatted;
                }
            });
            return totalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return "0.00";
    }, [isFlare, isSolana, vaultBalances, unifiedVaults, decimals, dashboardToken]);

    const activeInfo = useMemo(() => {
        return (vaultBalances || []).reduce((acc, result) => {
            if (result.status === 'success' && result.result) {
                if ((result.result as bigint) > BigInt(0)) {
                    return acc + 1;
                }
            }
            return acc;
        }, 0);
    }, [vaultBalances]);

    // Unified calculation
    const activeVaultCount = useMemo(() => {
        if (isFlare) return vaultBalances ? activeInfo : 0;
        if (isSolana) return unifiedVaults.filter(v => v.isActive && v.currency === dashboardToken).length;
        return 0;
    }, [isFlare, isSolana, activeInfo, unifiedVaults, dashboardToken]);

    const calculatedCompletedCount = useMemo(() => {
        if (isFlare) return (vaultAddresses?.length || 0) - (vaultBalances ? activeInfo : 0);
        if (isSolana) return unifiedVaults.filter(v => !v.isActive && v.currency === dashboardToken).length;
        return 0;
    }, [isFlare, vaultAddresses, vaultBalances, activeInfo, isSolana, unifiedVaults, dashboardToken]);

    // Derived logic cleanup
    const formattedBalance = isConnected && balance
        ? parseFloat(formatUnits(balance as bigint, decimals || 18)).toFixed(2)
        : "---";

    const displayBalance = isSolana
        ? (dashboardToken === 'SHIP' ? solanaShipBalance : solanaUsdcBalance) || "..."
        : formattedBalance;

    const stats = [
        {
            label: isFlare ? "USDT0 Balance" : (dashboardToken === 'SHIP' ? "SHIP Balance" : "USDC Balance"),
            value: (isLoading && isFlare) ? "Loading..." : (isError && isFlare) ? "Error" : `${displayBalance} ${isFlare ? 'USDT0' : dashboardToken}`,
            icon: Wallet,
            color: "text-green-400",
            isPrivacy: true
        },
        {
            label: "Active Savings",
            value: activeVaultCount.toString(),
            icon: Lock,
            color: "text-primary",
            isPrivacy: false
        },
        {
            label: "Total Locked",
            value: isFlare ? `$ ${totalLockedValue}` : `${totalLockedValue} ${dashboardToken}`,
            icon: TrendingUp,
            color: "text-purple-400",
            isPrivacy: true
        },
        {
            label: "Completed Savings",
            value: calculatedCompletedCount.toString(),
            icon: CheckCircle,
            color: "text-primary",
            isPrivacy: false
        },
    ];

    if (!isConnected) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="p-12 text-center max-w-md bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 transition-all">
                    <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-400">
                        Please connect your wallet to view your dashboard and manage your savings.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
                        {isSolana && dashboardToken === 'SHIP' && (
                            <Button
                                onClick={handleMintShip}
                                disabled={isMinting || !publicKey}
                                size="sm"
                                variant="outline"
                                className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:text-white transition-all h-8 flex items-center gap-2"
                            >
                                {isMinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
                                Get 10k Test SHIP
                            </Button>
                        )}
                    </div>
                    <p className="text-gray-400 mt-1">Snapshot of your wealth and Savings activity.</p>
                </div>
                {isSolana && (
                    <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl h-11">
                        {(['SHIP', 'USDC'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setDashboardToken(t)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${dashboardToken === t
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/5">
                                    <img src={t === 'SHIP' ? '/ship.png' : '/usdc.png'} alt={t} className="w-full h-full object-cover" />
                                </div>
                                {t}
                            </button>
                        ))}
                    </div>
                )}
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
                <h2 className="text-2xl font-bold text-white">Recent Savings</h2>
                <div className="flex md:flex-row flex-col gap-4 md:items-center">
                    <div className=" flex justify-end">
                        <Link href="/dashboard/savings">
                            <Button variant="ghost" className="text-gray-400 hover:text-white">
                                View All
                            </Button>
                        </Link>
                    </div>
                    <Link href="/dashboard/create">
                        <Button className="gap-2 bg-primary text-white hover:bg-primary/90">
                            <Plus className="w-4 h-4" /> Create New Savings
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Vaults Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(isBalancesLoading || loadingVaults) ? (
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
                        <h3 className="text-lg font-medium text-white">No Savings Found</h3>
                        <p className="text-gray-400 mb-6 max-w-sm">
                            You don't have any active savings yet. Start by creating your first savings plan.
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
