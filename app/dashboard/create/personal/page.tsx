"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, AlertTriangle, Coins, Lock, Calendar, TrendingUp, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance } from "wagmi";
import { CONTRACTS, VAULT_FACTORY_ABI } from "@/lib/contracts";
import { useEffect } from "react";
import { parseEther, formatEther } from "viem";

export default function CreatePersonalVault() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });

    const [formData, setFormData] = useState({
        purpose: "",
        amount: "",
        duration: "30",
        penalty: "10"
    });

    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isSuccess) {
            router.push("/dashboard/vaults");
        }
    }, [isSuccess, router]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected || !address) {
            alert("Please connect your wallet first");
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            alert("Please enter a valid deposit amount");
            return;
        }

        const unlockTimestamp = Math.floor(Date.now() / 1000) + (parseInt(formData.duration) * 24 * 60 * 60);
        const penaltyBps = parseInt(formData.penalty) * 100;

        try {
            writeContract({
                address: CONTRACTS.coston2.VaultFactory,
                abi: VAULT_FACTORY_ABI,
                functionName: "createPersonalVault",
                args: [
                    formData.purpose,
                    BigInt(unlockTimestamp),
                    BigInt(penaltyBps)
                ],
            });
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const unlockDate = new Date(Date.now() + parseInt(formData.duration) * 24 * 60 * 60 * 1000);
    const potentialPenalty = formData.amount ? (parseFloat(formData.amount) * parseInt(formData.penalty) / 100).toFixed(4) : "0";

    return (
        <div className="max-w-4xl mx-auto">
            <Link href="/dashboard/create" className="text-gray-400 hover:text-white flex items-center gap-2 mb-6 text-sm">
                <ArrowLeft className="w-4 h-4" /> Back to selection
            </Link>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="md:col-span-2">
                    <Card className="p-8">
                        <div className="mb-8">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                                <Lock className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Create Personal Vault</h2>
                            <p className="text-gray-400">Lock your C2FLR with time-based penalties to enforce savings discipline</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Purpose */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-white flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                    Savings Goal
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., New Laptop, Emergency Fund, Vacation"
                                    required
                                    maxLength={50}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                />
                                <p className="text-xs text-gray-500">What are you saving for? This helps you stay motivated.</p>
                            </div>

                            {/* Amount */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-white flex items-center gap-2">
                                    <Coins className="w-4 h-4 text-primary" />
                                    Initial Deposit Amount
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        required
                                        step="0.0001"
                                        min="0.0001"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-20 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">C2FLR</span>
                                </div>
                                {balance && (
                                    <p className="text-xs text-gray-500">
                                        Available: {parseFloat(formatEther(balance.value)).toFixed(4)} C2FLR
                                    </p>
                                )}
                            </div>

                            {/* Lock Duration */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-white flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    Lock Duration
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { days: '7', label: '1 Week' },
                                        { days: '30', label: '1 Month' },
                                        { days: '90', label: '3 Months' },
                                        { days: '180', label: '6 Months' },
                                        { days: '365', label: '1 Year' },
                                        { days: '730', label: '2 Years' }
                                    ].map((option) => (
                                        <button
                                            type="button"
                                            key={option.days}
                                            onClick={() => setFormData({ ...formData, duration: option.days })}
                                            className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${formData.duration === option.days
                                                ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/20'
                                                : 'border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <div className="font-bold">{option.label}</div>
                                            <div className="text-xs opacity-70">{option.days} days</div>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500">Funds will be locked until: <span className="text-white font-medium">{unlockDate.toLocaleDateString()}</span></p>
                            </div>

                            {/* Penalty */}
                            <div className="p-5 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-white mb-1">Early Withdrawal Penalty</h4>
                                        <p className="text-sm text-gray-300">
                                            Breaking your commitment early costs you. Set a penalty that will keep you disciplined.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-300">Penalty Rate</span>
                                        <span className="text-2xl font-bold text-red-400">{formData.penalty}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        step="5"
                                        value={formData.penalty}
                                        onChange={(e) => setFormData({ ...formData, penalty: e.target.value })}
                                        className="w-full accent-red-500 h-2 bg-gray-700/50 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>5% (Gentle)</span>
                                        <span>25% (Moderate)</span>
                                        <span>50% (Strict)</span>
                                    </div>
                                </div>
                            </div>

                            {writeError && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-sm text-red-400">
                                        {writeError.message?.includes("RPC")
                                            ? "⚠️ Network issue - Please wait a moment and try again"
                                            : `Error: ${writeError.message || "Failed to create vault"}`}
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full mt-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white font-semibold shadow-lg shadow-primary/20"
                                disabled={isPending || isConfirming || !isConnected}
                            >
                                {isPending ? "Confirm in Wallet..." : isConfirming ? "Creating Vault..." : "🔒 Lock Funds & Create Vault"}
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-4">
                    <Card className="p-6 bg-gradient-to-br from-white/5 to-white/10 border-white/10">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5 text-primary" />
                            Summary
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">You're Locking</p>
                                <p className="text-2xl font-bold text-white">{formData.amount || "0"} C2FLR</p>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Unlock Date</p>
                                <p className="text-sm font-medium text-white">{unlockDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Early Exit Penalty</p>
                                <p className="text-sm font-medium text-red-400">{formData.penalty}% ({potentialPenalty} C2FLR)</p>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <p className="text-xs text-blue-300">
                                    💡 <strong>Tip:</strong> Higher penalties = stronger commitment. Choose wisely!
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
                        <h4 className="text-sm font-semibold text-green-400 mb-2">✨ What Happens Next?</h4>
                        <ul className="space-y-2 text-xs text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">1.</span>
                                <span>Vault contract deploys to blockchain</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">2.</span>
                                <span>Your funds are locked until unlock date</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">3.</span>
                                <span>Early withdrawal triggers penalty</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">4.</span>
                                <span>After unlock: withdraw anytime, penalty-free</span>
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
}
