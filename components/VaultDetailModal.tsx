"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Lock, Unlock, TrendingDown, X } from "lucide-react";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { VAULT_ABI } from "@/lib/contracts";

interface VaultDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    address: `0x${string}`;
    purpose: string;
    balance: string; // in Ether string
    unlockDate: Date;
    isLocked: boolean;
}

export function VaultDetailModal({
    isOpen,
    onClose,
    address,
    purpose,
    balance,
    unlockDate,
    isLocked
}: VaultDetailModalProps) {
    const [isConfirmingBreak, setIsConfirmingBreak] = useState(false);
    const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const handleWithdraw = () => {
        writeContract({
            address,
            abi: VAULT_ABI,
            functionName: "withdraw",
        });
    };

    // Calculate penalty (Assuming 10% fixed)
    const penaltyAmount = isLocked ? parseFloat(balance) * 0.10 : 0;
    const amountToReceive = Math.max(0, parseFloat(balance) - penaltyAmount);

    const handleClose = () => {
        setIsConfirmingBreak(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl w-full max-w-md m-4 p-6 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {isSuccess ? (
                    <div className="text-center py-6">
                        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                            <Unlock className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Success!</h2>
                        <p className="text-zinc-400 mb-6">
                            Funds have been successfully withdrawn from the vault.
                        </p>
                        <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700">
                            Close
                        </Button>
                    </div>
                ) : !isConfirmingBreak ? (
                    <>
                        <div className="mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                                {isLocked ? <Lock className="w-5 h-5 text-orange-500" /> : <Unlock className="w-5 h-5 text-green-500" />}
                                {purpose}
                            </h2>
                            <p className="text-sm text-zinc-400">Savings Details & Management</p>
                        </div>

                        <div className="space-y-6 mb-8">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-zinc-800/50 rounded-lg space-y-1">
                                    <p className="text-xs text-zinc-500">Total Balance</p>
                                    <p className="text-lg font-bold">{parseFloat(balance).toFixed(2)} <span className="text-xs font-normal text-zinc-500">C2FLR</span></p>
                                </div>
                                <div className="p-3 bg-zinc-800/50 rounded-lg space-y-1">
                                    <p className="text-xs text-zinc-500">Status</p>
                                    <p className={`text-lg font-bold ${isLocked ? 'text-orange-500' : 'text-green-500'}`}>
                                        {isLocked ? 'Locked' : 'Unlocked'}
                                    </p>
                                </div>
                            </div>

                            {/* Unlock Info */}
                            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-400" />
                                <div>
                                    <p className="text-sm font-medium text-blue-200">Unlock Date</p>
                                    <p className="text-xs text-blue-300/80">
                                        {unlockDate.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Motivation */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-zinc-300">Goal / Purpose</h4>
                                <p className="text-sm text-zinc-400 bg-zinc-800/30 p-3 rounded-lg border border-zinc-800">
                                    {purpose}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {isLocked ? (
                                <Button
                                    onClick={() => setIsConfirmingBreak(true)}
                                    className="w-full gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    Break Savings (Preview Penalty)
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleWithdraw}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    disabled={isWritePending || isConfirming}
                                >
                                    {isWritePending || isConfirming ? "Processing..." : "Withdraw Funds"}
                                </Button>
                            )}
                            <Button variant="ghost" onClick={handleClose} disabled={isWritePending || isConfirming}>
                                Cancel
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-6 text-center">
                            <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-red-500 mb-2">Break Savings Warning</h2>
                            <p className="text-sm text-zinc-400">
                                Are you sure you want to break this savings before the unlock date?
                            </p>
                        </div>

                        <div className="mb-8 space-y-4">
                            <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Current Balance:</span>
                                    <span className="font-mono">{parseFloat(balance).toFixed(2)} C2FLR</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-red-400">
                                    <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Penalty (10%):</span>
                                    <span className="font-mono font-bold">-{penaltyAmount.toFixed(2)} C2FLR</span>
                                </div>
                                <div className="border-t border-red-500/20 pt-2 flex justify-between items-center">
                                    <span className="text-white font-medium">You Receive:</span>
                                    <span className="font-mono font-bold text-lg text-white">{amountToReceive.toFixed(2)} C2FLR</span>
                                </div>
                            </div>
                            <p className="text-xs text-center text-zinc-500">
                                This action cannot be undone. The penalty amount will be sent to the treasury.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleWithdraw}
                                className="w-full bg-red-600 hover:bg-red-700 text-white border-none"
                                disabled={isWritePending || isConfirming}
                            >
                                {isWritePending || isConfirming ? "Breaking Vault..." : "Confirm & Break Vault"}
                            </Button>
                            <Button variant="ghost" onClick={() => setIsConfirmingBreak(false)} disabled={isWritePending || isConfirming}>
                                Go Back
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
