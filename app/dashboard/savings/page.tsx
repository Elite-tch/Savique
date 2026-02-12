"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lock, Unlock, Search, Wallet, Clock, AlertTriangle, Calendar, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, VAULT_FACTORY_ABI, VAULT_ABI, ERC20_ABI } from "@/lib/contracts";
import { formatUnits } from "viem";
import { motion } from "framer-motion";
import { getReceiptsByWallet, Receipt, getUserVaultsFromDb, saveVault, getVaultByAddress, SavedVault } from "@/lib/receiptService";
import { usePublicClient } from "wagmi";
import { Progress } from "@/components/ui/progress";
import { Suspense, useMemo } from "react";
import { ChevronLeft, ChevronRight, FileText, CheckCircle2, History } from "lucide-react";
import { generateReceiptPDF } from "../../../lib/pdfGenerator";
import { saveAs } from "file-saver";
import { useRouter, useSearchParams } from "next/navigation";

function useCountdown(targetDate: Date) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: false
    });

    useEffect(() => {
        const targetTime = targetDate.getTime(); // Convert to timestamp once

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const difference = targetTime - now;

            if (difference <= 0) {
                setTimeLeft(prev => prev.isExpired ? prev : { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [targetDate.getTime()]); // Use timestamp instead of Date object

    return timeLeft;
}


function CompletedVaultCard({
    vault,
    receipt,
    activeTab
}: {
    vault: SavedVault,
    receipt?: Receipt,
    activeTab: string
}) {
    const isBroken = receipt?.type === 'breaked';

    const handleDownload = async () => {
        if (!receipt) return;
        const blob = await generateReceiptPDF(receipt);
        saveAs(blob, `Savique_Receipt_${receipt.txHash.slice(0, 8)}.pdf`);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 transition-all">
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center gap-3">
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-zinc-500" />
                            <h3 className="text-lg font-bold text-white truncate max-w-[150px]">
                                {vault.purpose || "Savings"}
                            </h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] uppercase font-bold tracking-wider border ${isBroken
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-green-500/10 text-green-500 border-green-500/20'
                            }`}>
                            {isBroken ? 'Broken Early' : 'Finished'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Withdrawn</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-white">{receipt?.amount || "0.00"}</span>
                                <span className="text-[10px] text-zinc-500">USDT0</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Date</p>
                            <p className="text-xs text-white">
                                {receipt ? new Date(receipt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 h-8 text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400"
                            onClick={handleDownload}
                            disabled={!receipt}
                        >
                            <FileText className="w-3 h-3 mr-2" />
                            Receipt
                        </Button>
                        <Link href={`/dashboard/savings/${vault.vaultAddress}?tab=${activeTab}`} className="flex-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400"
                            >
                                <Eye className="w-3 h-3 mr-2" />
                                Details
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

// Keep the original VaultCard but update it for integration
function VaultCard({ address, activeTab }: { address: `0x${string}`, activeTab: string }) {
    const { data: purpose } = useReadContract({ address, abi: VAULT_ABI, functionName: "purpose" });
    const { data: decimals } = useReadContract({ address: CONTRACTS.coston2.USDTToken, abi: ERC20_ABI, functionName: 'decimals' });
    const { data: balanceResult } = useReadContract({ address, abi: VAULT_ABI, functionName: "totalAssets" });
    const { data: unlockTimeResult } = useReadContract({ address, abi: VAULT_ABI, functionName: "unlockTimestamp" });

    const [creationDate, setCreationDate] = useState<Date | null>(null);
    const [vaultData, setVaultData] = useState<SavedVault | null>(null);
    const { address: userAddress } = useAccount();

    const balance = balanceResult ? formatUnits(balanceResult, decimals || 18) : "0";
    const unlockDate = unlockTimeResult ? new Date(Number(unlockTimeResult) * 1000) : new Date();
    const isLocked = new Date() < unlockDate;
    const countdown = useCountdown(unlockDate);

    useEffect(() => {
        const fetchVaultData = async () => {
            const data = await getVaultByAddress(address);
            setVaultData(data);
            if (data?.createdAt) {
                setCreationDate(new Date(data.createdAt));
            }
        };
        fetchVaultData();
    }, [address]);

    const progressValue = useMemo(() => {
        if (!vaultData?.targetAmount || !balanceResult || !decimals) return 0;
        const current = parseFloat(formatUnits(balanceResult as bigint, decimals as number || 18));
        const target = parseFloat(vaultData.targetAmount);
        if (target === 0) return 100;
        return Math.min(100, (current / target) * 100);
    }, [vaultData, balanceResult, decimals]);

    // Format countdown parts
    const formatCountdown = () => {
        if (countdown.isExpired) return "Unlocked!";
        const parts = [];
        if (countdown.days > 0) parts.push(`${countdown.days}d`);
        if (countdown.hours > 0 || parts.length > 0) parts.push(`${countdown.hours}h`);
        if (countdown.minutes > 0 || parts.length > 0) parts.push(`${countdown.minutes}m`);
        parts.push(`${countdown.seconds}s`);
        return parts.join(" ");
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Link href={`/dashboard/savings/${address}?tab=${activeTab}`}>
                <Card className="bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer group h-full">
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-white truncate max-w-[200px]">{purpose || "Loading..."}</h3>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500/10 text-green-500 border border-green-500/20`}>
                                {isLocked ? 'Active' : 'Matured'}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-3">
                                <Calendar className="w-3 h-3" />
                                <span>Created: {creationDate ? creationDate.toLocaleDateString() : '...'}</span>
                            </div>

                            {isLocked ? (
                                <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Lock Remaining</p>
                                        <Clock className="w-3 h-3 text-orange-500" />
                                    </div>
                                    <div className="font-mono text-lg font-bold text-white">
                                        {formatCountdown()}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-[#E62058]/5 border border-[#E62058]/10 rounded-xl p-3">
                                    <div className="flex items-center gap-2 text-[#E62058] text-xs font-bold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Matured - Ready for Withdrawal
                                    </div>
                                </div>
                            )}
                        </div>

                        {vaultData?.targetAmount && parseFloat(vaultData.targetAmount) > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-none">Goal Progress</span>
                                    <span className="text-xs font-bold text-primary leading-none">{progressValue.toFixed(0)}%</span>
                                </div>
                                <Progress value={progressValue} className="h-1.5 bg-white/5 border-none" />
                            </div>
                        )}

                        <div className="pt-3 border-t border-white/5">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Total Savings</p>
                            <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                                {parseFloat(balance).toLocaleString()} <span className="text-[10px] font-normal text-zinc-500">USDT0</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}

type TabType = 'active' | 'matured' | 'completed';

export default function SavingsPage() {
    return (
        <Suspense fallback={<div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <SavingsDashboard />
        </Suspense>
    );
}

function SavingsDashboard() {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const router = useRouter();
    const searchParams = useSearchParams();

    // URL is the source of truth for the active tab
    const activeTab = (searchParams.get('tab') as TabType) || 'active';
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(6);
    const [isLoading, setIsLoading] = useState(true);
    const [allVaultsData, setAllVaultsData] = useState<{
        active: string[],
        matured: string[],
        completed: { vault: SavedVault, receipt?: Receipt }[]
    }>({ active: [], matured: [], completed: [] });

    useEffect(() => {
        const loadAndCategorizeVaults = async () => {
            if (!address || !publicClient) return;
            setIsLoading(true);
            try {
                // 1. Get unique vault addresses from DB and Chain in parallel
                const [dbVaults, rawChainVaults] = await Promise.all([
                    getUserVaultsFromDb(address),
                    publicClient.readContract({
                        address: CONTRACTS.coston2.VaultFactory,
                        abi: VAULT_FACTORY_ABI,
                        functionName: "getUserVaults",
                        args: [address]
                    })
                ]);

                const uniqueAddresses = Array.from(new Set([
                    ...dbVaults.map(a => a.toLowerCase()),
                    ...(rawChainVaults as string[]).map(a => a.toLowerCase())
                ])) as `0x${string}`[];

                if (uniqueAddresses.length === 0) {
                    setAllVaultsData({ active: [], matured: [], completed: [] });
                    return;
                }

                // 2. Fetch balance and status for each to categorize in parallel
                // Note: Promise.all is used because Coston2 doesn't have multicall3 configured in viem
                // but wagmiConfig transport handles batching naturally.
                const results = await Promise.all(uniqueAddresses.map(async (vaddr) => {
                    try {
                        const [balanceResult, unlockResult] = await Promise.all([
                            publicClient.readContract({
                                address: vaddr,
                                abi: VAULT_ABI,
                                functionName: "totalAssets"
                            }),
                            publicClient.readContract({
                                address: vaddr,
                                abi: VAULT_ABI,
                                functionName: "unlockTimestamp"
                            })
                        ]);
                        return { vaddr, balanceResult, unlockResult };
                    } catch (e) {
                        console.error(`Error checking vault ${vaddr}:`, e);
                        return null;
                    }
                }));

                const active: string[] = [];
                const matured: string[] = [];
                const completedAddresses: string[] = [];

                results.forEach((res) => {
                    if (!res) return;
                    const { vaddr, balanceResult, unlockResult } = res;

                    const bal = parseFloat(formatUnits(balanceResult as bigint, 18));
                    const unlockTime = Number(unlockResult) * 1000;
                    const maturedStatus = Date.now() >= unlockTime;

                    if (bal > 0) {
                        if (maturedStatus) matured.push(vaddr);
                        else active.push(vaddr);
                    } else {
                        completedAddresses.push(vaddr);
                    }
                });

                // 3. Parallel fetch metadata and receipts for completed vaults
                const [allReceipts, ...allMetadataResults] = await Promise.all([
                    getReceiptsByWallet(address),
                    ...completedAddresses.map(vaddr => getVaultByAddress(vaddr))
                ]);

                const indexedCompleted = completedAddresses.map((vaddr, i) => {
                    const metadata = allMetadataResults[i];
                    if (!metadata) return null;

                    const withdrawReceipt = allReceipts.find(r =>
                        r.vaultAddress?.toLowerCase() === vaddr.toLowerCase() &&
                        (r.type === 'completed' || r.type === 'breaked')
                    );

                    return { vault: metadata, receipt: withdrawReceipt };
                }).filter(Boolean);

                setAllVaultsData({
                    active,
                    matured,
                    completed: indexedCompleted as any
                });

            } catch (error) {
                console.error("Failed to load/categorize vaults:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAndCategorizeVaults();
    }, [address, publicClient]);

    // Pagination Logic
    const currentItems = useMemo(() => {
        const list = allVaultsData[activeTab];
        const start = (currentPage - 1) * itemsPerPage;
        return list.slice(start, start + itemsPerPage);
    }, [activeTab, allVaultsData, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(allVaultsData[activeTab].length / itemsPerPage);
    }, [activeTab, allVaultsData]);

    const handleTabChange = (tab: TabType) => {
        // Update URL to change tab
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.replace(`?${params.toString()}`, { scroll: false });
        setCurrentPage(1);
    };

    if (!isConnected) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="p-12 text-center max-w-md bg-white/5 border-white/10">
                    <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-400">Please connect your wallet to view your dashboard and manage your savings.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">My Savings</h1>
                    <p className="text-zinc-500 mt-1">Track and manage your progressive capital accumulation.</p>
                </div>
                <Link href="/dashboard/create">
                    <Button className="shrink-0 bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 shadow-[0_0_20px_rgba(230,32,88,0.3)]">
                        <Plus className="w-5 h-5 mr-2" /> New Savings
                    </Button>
                </Link>
            </div>

            {/* Tabs - Responsive with scrolling */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl w-full md:w-fit border border-white/10 overflow-x-scroll no-scrollbar flex-wrap gap-4 ">
                {(['active', 'matured', 'completed'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === tab
                            ? 'bg-primary text-white shadow-lg'
                            : 'text-zinc-500 hover:text-zinc-300 border-white/5 border hover:bg-white/5'
                            }`}
                    >
                        <span className="capitalize">{tab}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-white/10 text-zinc-500'
                            }`}>
                            {allVaultsData[tab].length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Grid Area */}
            <div className="min-h-[400px]">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-[280px] rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : currentItems.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeTab === 'completed'
                                ? (currentItems as { vault: SavedVault, receipt?: Receipt }[]).map((item) => (
                                    <CompletedVaultCard key={item.vault.vaultAddress} vault={item.vault} receipt={item.receipt} activeTab={activeTab} />
                                ))
                                : (currentItems as string[]).map((addr) => (
                                    <VaultCard key={addr} address={addr as `0x${string}`} activeTab={activeTab} />
                                ))
                            }
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-12 pb-8">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="bg-white/5 border border-white/10"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                                </Button>
                                <span className="text-zinc-500 text-sm font-medium">
                                    Page <span className="text-white">{currentPage}</span> of {totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="bg-white/5 border border-white/10"
                                >
                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <Card className="border-dashed border-white/10 bg-transparent flex flex-col items-center justify-center p-12 text-center h-[400px]">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            {activeTab === 'active' ? <Lock className="w-10 h-10 text-zinc-600" /> :
                                activeTab === 'matured' ? <Unlock className="w-10 h-10 text-zinc-600" /> :
                                    <History className="w-10 h-10 text-zinc-600" />}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {activeTab === 'active' ? 'No Active Goals' :
                                activeTab === 'matured' ? 'No Matured Savings' :
                                    'No Completed History'}
                        </h3>
                        <p className="text-zinc-500 mb-8 max-w-sm mx-auto">
                            {activeTab === 'active' ? "You don't have any locked commitment plans yet. Create one to secure your future." :
                                activeTab === 'matured' ? "All your locks are currently active. Once a lock expires, it will appear here for withdrawal." :
                                    "You haven't fully withdrawn or broken any Savings yet. Your completed history will be archived here."}
                        </p>
                        {activeTab === 'active' && (
                            <Link href="/dashboard/create">
                                <Button className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8">
                                    Start Your First Goal
                                </Button>
                            </Link>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}
