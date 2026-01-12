"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lock, Search, Wallet, Clock, AlertTriangle, Calendar, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, VAULT_FACTORY_ABI, VAULT_ABI } from "@/lib/contracts";
import { formatUnits } from "viem";
import { motion } from "framer-motion";
import { getReceiptsByWallet, Receipt } from "@/lib/receiptService";

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
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
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


function VaultCard({ address }: { address: `0x${string}` }) {
    const { data: purpose } = useReadContract({
        address,
        abi: VAULT_ABI,
        functionName: "purpose",
    });

    const { data: balanceResult } = useReadContract({
        address,
        abi: VAULT_ABI,
        functionName: "totalAssets",
    });

    const { data: unlockTimeResult } = useReadContract({
        address,
        abi: VAULT_ABI,
        functionName: "unlockTimestamp",
    });

    const [isVisible, setIsVisible] = useState(false);
    const [creationDate, setCreationDate] = useState<Date | null>(null);
    const { address: userAddress } = useAccount();

    const balance = balanceResult ? formatUnits(balanceResult, 18) : "0";
    const unlockDate = unlockTimeResult ? new Date(Number(unlockTimeResult) * 1000) : new Date();
    const isLocked = new Date() < unlockDate;

    const countdown = useCountdown(unlockDate);

    // Fetch actual creation date from Firestore
    useEffect(() => {
        const fetchCreationDate = async () => {
            if (!userAddress) return;

            try {
                const receipts = await getReceiptsByWallet(userAddress);
                // Find the creation receipt for this vault by matching purpose
                const creationReceipt = receipts.find(
                    r => r.type === 'created' && r.purpose === purpose
                );

                if (creationReceipt) {
                    setCreationDate(new Date(creationReceipt.timestamp));
                }
            } catch (error) {
                console.error('[VaultCard] Error fetching creation date:', error);
            }
        };

        if (purpose) {
            fetchCreationDate();
        }
    }, [userAddress, purpose]);

    if (parseFloat(balance) <= 0) return null;

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link href={`/dashboard/vaults/${address}`}>
                <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
                    <div className="p-3 space-y-4">
                        <div className="flex justify-end items-start">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${isLocked ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                {isLocked ? 'Locked' : 'Unlocked'}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white mb-2 truncate">{purpose || "Loading..."}</h3>

                            {/* Creation Time */}
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                                <Calendar className="w-3 h-3" />
                                <span>Created: {creationDate ? creationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Loading...'}</span>
                            </div>

                            {/* Countdown Timer */}
                            {isLocked ? (
                                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 mb-1">Time remaining:</p>
                                    <div className="font-mono text-lg font-bold text-orange-400">
                                        {formatCountdown()}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Until {unlockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                    <p className="text-xs text-green-400 font-medium">✓ Unlocked - Withdraw anytime!</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Total Savings</p>
                                    <div className="text-lg font-bold text-white flex items-center gap-1">
                                        {isVisible ? parseFloat(balance).toFixed(2) : "••••••"} <span className="text-xs font-normal text-gray-500">USDT0</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.preventDefault(); setIsVisible(!isVisible); }}
                                    className="p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors"
                                >
                                    {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}

export default function VaultsPage() {
    const { address, isConnected } = useAccount();

    const { data: vaultAddresses, isLoading } = useReadContract({
        address: CONTRACTS.coston2.VaultFactory,
        abi: VAULT_FACTORY_ABI,
        functionName: "getUserVaults",
        args: address ? [address] : undefined,
        query: { enabled: !!address && isConnected }
    });

    const hasVaults = vaultAddresses && vaultAddresses.length > 0;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">My Vaults</h1>
                    <p className="text-gray-400 mt-1">Manage and track your active savings plans.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Link href="/dashboard/create">
                        <Button className="gap-2 shrink-0 bg-primary hover:bg-primary/90">
                            <Plus className="w-4 h-4" /> New Vault
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Vaults Grid */}
            <div className="min-h-[300px]">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="h-64 animate-pulse bg-white/5 border-transparent">
                                {null}
                            </Card>
                        ))}
                    </div>
                ) : hasVaults ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...vaultAddresses].reverse().map((addr) => (
                            <VaultCard key={addr} address={addr} />
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed border-white/10 bg-transparent flex flex-col items-center justify-center p-12 text-center col-span-full h-96">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Lock className="w-10 h-10 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">No Active Vaults</h3>
                        <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                            You don't have any active savings vaults yet. Create one to start earning proof and securing your future.
                        </p>
                        <Link href="/dashboard/create">
                            <Button size="lg" className="border-white/20 hover:bg-white/10">Start Your First Vault</Button>
                        </Link>
                    </Card>
                )}
            </div>
        </div>
    );
}
