"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, AlertTriangle, Coins, Lock, Calendar, TrendingUp, Info, Plus, Wallet, Receipt, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance, useReadContract, usePublicClient } from "wagmi";
import { CONTRACTS, VAULT_FACTORY_ABI, ERC20_ABI, VAULT_ABI } from "@/lib/contracts";
import { toast } from "sonner";
import { parseUnits, formatUnits, decodeEventLog } from "viem";
import { useProofRails } from "@proofrails/sdk/react";
import { saveReceipt } from "@/lib/receiptService";

export default function CreatePersonalVault() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();

    // USDT Balance
    const { data: balance } = useReadContract({
        address: CONTRACTS.coston2.USDTToken,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        query: { enabled: !!address },
    });

    const { data: decimals } = useReadContract({
        address: CONTRACTS.coston2.USDTToken,
        abi: ERC20_ABI,
        functionName: 'decimals',
    });

    const [formData, setFormData] = useState({
        purpose: "",
        amount: "",
        duration: "30"
    });

    const [customDuration, setCustomDuration] = useState("");
    const FIXED_PENALTY = 10; // Fixed 10% penalty
    const toastId = useRef<string | number | null>(null);

    // Multi-step state
    type Step = 'idle' | 'creating' | 'approving' | 'depositing' | 'generating_proof' | 'done';
    const [currentStep, setCurrentStep] = useState<Step>('idle');
    const [createdVaultAddress, setCreatedVaultAddress] = useState<`0x${string}` | null>(null);
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

    // Brand Styled Toast
    const toastStyle = {
        className: "bg-[#E62058]/10 border-[#E62058]/20 text-[#E62058]",
        style: {
            backgroundColor: 'rgba(230, 32, 88, 0.1)',
            borderColor: 'rgba(230, 32, 88, 0.2)',
            color: '#E62058'
        }
    };

    const { writeContract, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

    // ProofRails Integration
    const sdk = useProofRails();

    // Reset loop when transaction succeeds
    useEffect(() => {
        const processStep = async () => {
            if (isSuccess && receipt) {
                if (currentStep === 'creating') {
                    // 1. Vault Created - Find address
                    // We need to parse logs to find the PersonalVaultCreated event
                    // or just query getUserVaults but logs are better
                    // For simplicity, let's fetch the user's latest vault
                    // But events are safer.
                    // Let's try to decode logs if possible, or just fetch last vault
                    try {
                        // Find the event
                        // For now, simpler approach: fetch user vaults and get last one
                        // But we can't do that easily inside useEffect without another hook.
                        // Let's assume the last log is the one or verify efficiently?
                        // Better: Parse logs properly

                        // Simple workaround: Just get the last vault from the factory which we know belongs to user? 
                        // No, better to decode log.

                        // Let's try fetching the vaults again
                        const userVaults = await publicClient!.readContract({
                            address: CONTRACTS.coston2.VaultFactory,
                            abi: VAULT_FACTORY_ABI,
                            functionName: 'getUserVaults',
                            args: [address!]
                        });
                        const newVault = userVaults[userVaults.length - 1]; // Assume last one is ours
                        setCreatedVaultAddress(newVault);

                        toast.success("Vault Created! Now approve USDT.", toastStyle);
                        setCurrentStep('approving');
                        handleApprove(newVault);
                    } catch (e) {
                        console.error("Error finding new vault:", e);
                        toast.error("Could not find new vault address", toastStyle);
                        setCurrentStep('idle');
                    }
                } else if (currentStep === 'approving') {
                    // 2. Approved - Move to Deposit
                    toast.success("USDT Approved! Now depositing...", toastStyle);
                    setCurrentStep('depositing');
                    handleDeposit(createdVaultAddress!);
                } else if (currentStep === 'depositing') {
                    // 3. Deposited - Generate Proof
                    toast.success("Deposit Successful!", toastStyle);
                    setCurrentStep('generating_proof');
                    handleProofGeneration(receipt.transactionHash);
                }
            }
        };

        if (isSuccess && receipt) {
            processStep();
        }
    }, [isSuccess, receipt]);

    // Error handling
    useEffect(() => {
        if (writeError) {
            console.error("Write error:", writeError);
            toast.error(`Transaction Failed: ${writeError.message.split('\n')[0]}`, toastStyle);
            // Reset to idle or previous step? allows retry
            setTxHash(undefined);
            // keep current step to retry
        }
    }, [writeError]);

    const handleCreate = async () => {
        if (!address) return;

        try {
            setCurrentStep('creating');
            toastId.current = toast.loading("Creating Vault...", toastStyle);

            const durationDays = customDuration ? parseInt(customDuration) : parseInt(formData.duration);
            const unlockTimestamp = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);
            const penaltyBps = FIXED_PENALTY * 100;

            writeContract({
                address: CONTRACTS.coston2.VaultFactory,
                abi: VAULT_FACTORY_ABI,
                functionName: "createPersonalVault",
                args: [formData.purpose, BigInt(unlockTimestamp), BigInt(penaltyBps)]
            }, {
                onSuccess: (hash) => setTxHash(hash)
            });
        } catch (e) {
            console.error(e);
            setCurrentStep('idle');
        }
    };

    const handleApprove = (spender: `0x${string}`) => {
        try {
            toastId.current = toast.loading("Approving USDT...", toastStyle);
            const amountUnits = parseUnits(formData.amount, decimals || 18); // USDT decimals

            writeContract({
                address: CONTRACTS.coston2.USDTToken,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [spender, amountUnits]
            }, {
                onSuccess: (hash) => setTxHash(hash)
            });
        } catch (e) {
            console.error(e);
            // stay in approving step
        }
    };

    const handleDeposit = (vaultAddr: `0x${string}`) => {
        try {
            toastId.current = toast.loading("Depositing USDT...", toastStyle);
            const amountUnits = parseUnits(formData.amount, decimals || 18);

            writeContract({
                address: vaultAddr,
                abi: VAULT_ABI,
                functionName: "deposit",
                args: [amountUnits]
            }, {
                onSuccess: (hash) => setTxHash(hash)
            });
        } catch (e) {
            console.error(e);
            // stay in depositing
        }
    };

    const handleProofGeneration = async (txHashStr: string) => {
        try {
            console.log("🔄 Starting ProofRails receipt generation...");

            // Create a "Savings" receipt
            const receiptResult = await sdk.templates.payment({
                amount: parseFloat(formData.amount),
                from: address!,
                to: createdVaultAddress!,
                purpose: `SafeVault: ${formData.purpose}`,
                transactionHash: txHashStr
            });

            console.log("✅ ProofRails Receipt Created:", receiptResult);

            // Save receipt to Firestore
            await saveReceipt({
                walletAddress: address!.toLowerCase(),
                txHash: txHashStr,
                timestamp: Date.now(),
                purpose: formData.purpose,
                amount: formData.amount,
                verified: !!receiptResult?.id,
                type: 'created',
                proofRailsId: receiptResult?.id
            });

            setCurrentStep('done');
            toast.success("All Done! Vault Created.", toastStyle);
            setTimeout(() => router.push("/dashboard/vaults"), 1500);
        } catch (e: any) {
            console.error("❌ Proof generation failed:", e);

            // Even on error, save the transaction
            await saveReceipt({
                walletAddress: address!.toLowerCase(),
                txHash: txHashStr,
                timestamp: Date.now(),
                purpose: formData.purpose,
                amount: formData.amount,
                verified: false,
                type: 'created'
            });

            toast.error("Receipt Gen Failed but Vault Created", toastStyle);
            setCurrentStep('done');
            setTimeout(() => router.push("/dashboard/vaults"), 2000);
        }
    };

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

        handleCreate();
    };

    const durationDays = customDuration ? parseInt(customDuration) : parseInt(formData.duration);
    const unlockDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const potentialPenalty = formData.amount ? (parseFloat(formData.amount) * FIXED_PENALTY / 100).toFixed(4) : "0";

    // UI Helpers
    const isProcessing = currentStep !== 'idle' && currentStep !== 'done';
    const getButtonText = () => {
        if (currentStep === 'creating') return "Creating Vault...";
        if (currentStep === 'approving') return "Approving USDT0...";
        if (currentStep === 'depositing') return "Depositing USDT0...";
        if (currentStep === 'generating_proof') return "Finalizing Receipt...";
        if (currentStep === 'done') return "Redirecting...";
        return "Create & Lock Funds";
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="md:col-span-2">
                    <Card className="p-8">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Create USDT0 Vault</h2>
                            <p className="text-gray-400">Lock your USDT0 with time-based penalties to enforce savings discipline</p>
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
                                    placeholder="e.g., New Laptop, Emergency Fund"
                                    required
                                    maxLength={50}
                                    disabled={isProcessing}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary/50 focus:outline-none"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                />
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
                                        step="0.01"
                                        min="0.1"
                                        disabled={isProcessing}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-20 text-white focus:border-primary/50 focus:outline-none"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDT0</span>
                                </div>
                                {balance !== undefined && (
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-500">
                                            Available: {formatUnits(balance, decimals || 18)} USDT0
                                        </p>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                writeContract({
                                                    address: CONTRACTS.coston2.USDTToken,
                                                    abi: ERC20_ABI,
                                                    functionName: 'mint',
                                                    args: [address!, parseUnits('1000', decimals || 18)]
                                                }, {
                                                    onSuccess: () => toast.success("Minted 1000 USDT0!")
                                                });
                                            }}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            (Mint 1000 Test Tokens)
                                        </button>
                                    </div>
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
                                            onClick={() => {
                                                setFormData({ ...formData, duration: option.days });
                                                setCustomDuration("");
                                            }}
                                            disabled={isProcessing}
                                            className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${formData.duration === option.days ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400'}`}
                                        >
                                            <div className="font-bold">{option.label}</div>
                                            <div className="text-xs opacity-70">{option.days} days</div>
                                        </button>
                                    ))}
                                </div>
                                {/* Custom Duration */}
                                <div className="mt-4">
                                    <input
                                        type="number"
                                        placeholder="Custom days..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white"
                                        value={customDuration}
                                        disabled={isProcessing}
                                        onChange={(e) => {
                                            setCustomDuration(e.target.value);
                                            setFormData({ ...formData, duration: "" });
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Unlocks on: {unlockDate.toLocaleDateString()}</p>
                            </div>

                            {/* Steps Progress, visual only if processing */}
                            {isProcessing && (
                                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 space-y-2">
                                    <div className="flex items-center gap-2">
                                        {currentStep === 'creating' ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Check className="w-4 h-4 text-green-500" />}
                                        <span className={`text-sm ${currentStep === 'creating' ? 'text-primary font-bold' : 'text-gray-400'}`}>1. Create Vault</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {currentStep === 'approving' ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : ((currentStep === 'depositing' || currentStep === 'generating_proof') ? <Check className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border border-gray-500" />)}
                                        <span className={`text-sm ${currentStep === 'approving' ? 'text-primary font-bold' : 'text-gray-400'}`}>2. Approve USDT0</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {currentStep === 'depositing' ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : (currentStep === 'generating_proof' ? <Check className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border border-gray-500" />)}
                                        <span className={`text-sm ${currentStep === 'depositing' ? 'text-primary font-bold' : 'text-gray-400'}`}>3. Deposit USDT0</span>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {getButtonText()}
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
                                <p className="text-xs text-gray-500 mb-1">Locking Amount</p>
                                <p className="text-2xl font-bold text-white">{formData.amount || "0"} USDT0</p>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Early Exit Penalty</p>
                                <p className="text-sm font-medium text-red-400">{FIXED_PENALTY}% ({potentialPenalty} USDT0)</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
