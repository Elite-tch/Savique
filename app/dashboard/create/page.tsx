"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, AlertTriangle, ShieldCheck, Coins, Lock, Calendar, TrendingUp, Info, Plus, Wallet, Receipt, Loader2, Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance, useReadContract, usePublicClient } from "wagmi";
import { CONTRACTS, VAULT_FACTORY_ABI, ERC20_ABI, VAULT_ABI } from "@/lib/contracts";
import { toast } from "sonner";
import { parseUnits, formatUnits, decodeEventLog } from "viem";
import { useProofRails } from "@proofrails/sdk/react";
import { saveReceipt, saveVault } from "@/lib/receiptService";
import { createNotification } from "@/lib/notificationService";
import { getUserProfile } from "@/lib/userService";
import { saveAutoSavingsConfig } from "@/lib/receiptService";

const MAX_UINT256 = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");

function CustomSelect({ value, onChange, options, label }: { value: string, onChange: (val: string) => void, options: { value: string, label: string }[], label: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            <label className="text-xs text-gray-400">{label}</label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
            >
                <span>{selectedOption?.label || "Select..."}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-50 top-full left-0 w-full mt-2 bg-[#1a1a1d] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                >
                    <div className="max-h-60 overflow-y-auto no-scrollbar">
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-3 text-sm cursor-pointer transition-colors flex items-center justify-between ${value === opt.value ? 'bg-primary/20 text-white font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {opt.label}
                                {value === opt.value && <Check className="w-3 h-3 text-primary" />}
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default function CreatePersonalVault() {
    const router = useRouter();
    const { address, isConnected, isConnecting, isReconnecting } = useAccount();
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

    // Check Allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.coston2.USDTToken,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, CONTRACTS.coston2.VaultFactory],
        query: { enabled: !!address },
    });

    const [formData, setFormData] = useState({
        purpose: "",
        amount: "",
        targetAmount: "",
        duration: "30",
        durationUnit: "days" as "minutes" | "hours" | "days",
        beneficiary: "",

        // Auto-Savings Config
        isAutoSaveEnabled: false,
        autoSaveAmount: "",
        autoSaveFrequency: "daily" as "daily" | "weekly" | "monthly" | "minutely",
        autoSaveTime: "12:00",
        autoSaveDay: "1"
    });

    const [customDuration, setCustomDuration] = useState("");
    const FIXED_PENALTY = 10;
    const toastId = useRef<string | number | null>(null);

    // Multi-step state
    type Step = 'idle' | 'approving' | 'creating' | 'generating_proof' | 'done';
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
    const {
        isLoading: isConfirming,
        isSuccess,
        isError: isConfirmError,
        error: confirmError,
        data: receipt
    } = useWaitForTransactionReceipt({ hash: txHash });

    const sdk = useProofRails();

    // Reset loop when transaction succeeds
    useEffect(() => {
        const processStep = async () => {
            if (isSuccess && receipt) {
                if (currentStep === 'approving') {
                    toast.dismiss(toastId.current as string);
                    toast.success("USDT Approved!", toastStyle);

                    toastId.current = toast.loading("Creating & Funding Savings...", toastStyle);
                    setTxHash(undefined);
                    setCurrentStep('creating');
                    triggerCreateVault();
                } else if (currentStep === 'creating') {
                    toast.dismiss(toastId.current as string);

                    try {
                        let newVault: string | undefined;
                        for (const log of receipt.logs) {
                            try {
                                const decoded = decodeEventLog({
                                    abi: VAULT_FACTORY_ABI,
                                    data: log.data,
                                    topics: log.topics
                                });
                                if (decoded.eventName === 'PersonalVaultCreated') {
                                    newVault = (decoded.args as any).vaultAddress;
                                    break;
                                }
                            } catch (e) { }
                        }

                        if (!newVault) {
                            const userVaults = await publicClient!.readContract({
                                address: CONTRACTS.coston2.VaultFactory,
                                abi: VAULT_FACTORY_ABI,
                                functionName: 'getUserVaults',
                                args: [address!]
                            });
                            newVault = userVaults[userVaults.length - 1];
                        }

                        if (newVault) {
                            setCreatedVaultAddress(newVault as `0x${string}`);
                            toast.success("Savings Created!", toastStyle);
                            setTxHash(undefined);
                            setCurrentStep('generating_proof');
                            handleProofGeneration(receipt.transactionHash, newVault);
                        } else {
                            throw new Error("Could not find new savings address");
                        }
                    } catch (e) {
                        console.error("Error finding new vault:", e);
                        toast.error("Created but failed to find address", toastStyle);
                        setCurrentStep('idle');
                    }
                }
            }
        };

        if (isSuccess && receipt) {
            processStep();
        }
    }, [isSuccess, receipt, currentStep]);

    // Error handling
    useEffect(() => {
        if (writeError) {
            console.error("Write error:", writeError);
            if (toastId.current) toast.dismiss(toastId.current);
            toast.error(`Transaction Failed: ${writeError.message.split('\n')[0]}`, toastStyle);

            const sendFailureEmail = async () => {
                try {
                    const profile = await getUserProfile(address!);
                    if (profile?.email) {
                        await fetch('/api/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'TRANSACTION_FAILED',
                                userEmail: profile.email,
                                purpose: formData.purpose || "New Savings Creation",
                                amount: formData.amount || "0"
                            })
                        });
                    }
                } catch (e) {
                    console.warn('[Email] Failed to send failure notification:', e);
                }
            };
            sendFailureEmail();
            setTxHash(undefined);
            setCurrentStep('idle');
        }
    }, [writeError, address, formData.purpose, formData.amount]);

    useEffect(() => {
        if (isConfirmError || (isSuccess && receipt?.status === 'reverted')) {
            console.error("Transaction confirmation error:", confirmError || "Reverted");
            if (toastId.current) toast.dismiss(toastId.current);

            const errMsg = confirmError
                ? (confirmError as any).shortMessage || confirmError.message.split('\n')[0]
                : "Transaction Reverted on-chain";

            toast.error(`Confirmation Failed: ${errMsg}`, toastStyle);

            const sendFailureEmail = async () => {
                try {
                    const profile = await getUserProfile(address!);
                    if (profile?.email) {
                        await fetch('/api/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'TRANSACTION_FAILED',
                                userEmail: profile.email,
                                purpose: formData.purpose || "New Savings Creation",
                                amount: formData.amount || "0",
                                txHash: receipt?.transactionHash
                            })
                        });
                    }
                } catch (e) {
                    console.warn('[Email] Failed to send failure notification:', e);
                }
            };
            sendFailureEmail();
            setTxHash(undefined);
            setCurrentStep('idle');
        }
    }, [isConfirmError, confirmError, isSuccess, receipt, address, formData.purpose, formData.amount]);

    const triggerCreateVault = () => {
        const val = customDuration ? parseInt(customDuration) : parseInt(formData.duration);
        const unit = formData.durationUnit;

        let seconds = 0;
        if (unit === 'minutes') seconds = val * 60;
        else if (unit === 'hours') seconds = val * 60 * 60;
        else seconds = val * 24 * 60 * 60;

        const unlockTimestamp = Math.floor(Date.now() / 1000) + seconds;
        const penaltyBps = FIXED_PENALTY * 100;
        const amountUnits = parseUnits(formData.amount, decimals || 18);

        writeContract({
            address: CONTRACTS.coston2.VaultFactory,
            abi: VAULT_FACTORY_ABI,
            functionName: "createPersonalVault",
            args: [
                formData.purpose,
                BigInt(unlockTimestamp),
                BigInt(penaltyBps),
                amountUnits,
                (formData.beneficiary || "0x0000000000000000000000000000000000000000") as `0x${string}`
            ]
        }, {
            onSuccess: (hash) => setTxHash(hash)
        });
    };

    const handleCreate = async () => {
        if (!address) return;
        try {
            const amountUnits = parseUnits(formData.amount, decimals || 18);
            if (!allowance || allowance < amountUnits) {
                setCurrentStep('approving');
                toastId.current = toast.loading("Approving USDT...", toastStyle);
                writeContract({
                    address: CONTRACTS.coston2.USDTToken,
                    abi: ERC20_ABI,
                    functionName: "approve",
                    args: [CONTRACTS.coston2.VaultFactory, MAX_UINT256]
                }, {
                    onSuccess: (hash) => setTxHash(hash)
                });
            } else {
                setCurrentStep('creating');
                toastId.current = toast.loading("Creating & Funding Savings...", toastStyle);
                triggerCreateVault();
            }
        } catch (e) {
            console.error(e);
            setCurrentStep('idle');
        }
    };

    const handleProofGeneration = async (txHashStr: string, vaultAddrOverride?: string) => {
        const targetVault = (vaultAddrOverride || createdVaultAddress) as `0x${string}`;

        if (formData.isAutoSaveEnabled && formData.autoSaveAmount) {
            try {
                const firstRun = () => {
                    const now = new Date();
                    const [hours, minutes] = formData.autoSaveTime.split(':').map(Number);
                    const scheduledDate = new Date();
                    scheduledDate.setHours(hours, minutes, 0, 0);

                    if (formData.autoSaveFrequency === 'minutely') return Date.now() + 60000;
                    if (formData.autoSaveFrequency === 'daily') {
                        if (scheduledDate.getTime() <= now.getTime()) scheduledDate.setDate(scheduledDate.getDate() + 1);
                    } else if (formData.autoSaveFrequency === 'weekly') {
                        const targetDay = parseInt(formData.autoSaveDay);
                        const currentDay = now.getDay() || 7;
                        let daysUntil = targetDay - currentDay;
                        if (daysUntil < 0 || (daysUntil === 0 && scheduledDate.getTime() <= now.getTime())) daysUntil += 7;
                        scheduledDate.setDate(scheduledDate.getDate() + daysUntil);
                    } else if (formData.autoSaveFrequency === 'monthly') {
                        const targetDate = parseInt(formData.autoSaveDay);
                        scheduledDate.setDate(targetDate);
                        if (scheduledDate.getTime() <= now.getTime()) scheduledDate.setMonth(scheduledDate.getMonth() + 1);
                    }
                    return scheduledDate.getTime();
                };

                await saveAutoSavingsConfig({
                    vaultAddress: targetVault.toLowerCase(),
                    ownerAddress: address!.toLowerCase(),
                    amount: formData.autoSaveAmount,
                    frequency: formData.autoSaveFrequency,
                    executionDay: parseInt(formData.autoSaveDay),
                    executionTime: formData.autoSaveTime,
                    lastRunAt: 0,
                    nextRunAt: firstRun(),
                    isActive: true,
                    failures: 0
                });
            } catch (err) {
                console.error("❌ Failed to save auto-deposit config:", err);
            }
        }

        try {
            await saveVault({
                vaultAddress: targetVault,
                owner: address!.toLowerCase(),
                factoryAddress: CONTRACTS.coston2.VaultFactory,
                createdAt: Date.now(),
                purpose: formData.purpose,
                targetAmount: formData.targetAmount || formData.amount,
                beneficiary: formData.beneficiary || ""
            });
        } catch (dbError) {
            console.error("❌ Failed to save savings to registry:", dbError);
        }

        try {
            const receiptResult = await sdk.templates.payment({
                amount: parseFloat(formData.amount),
                from: address!,
                to: targetVault,
                purpose: `Safira: ${formData.purpose}`,
                transactionHash: txHashStr
            });

            await createNotification(
                address!,
                "Savings Created & Verified",
                `Your Savings "${formData.purpose}" has been secured and your digital receipt is verified.`,
                'success',
                `/dashboard/savings/${targetVault}`,
                receiptResult.id
            );

            try {
                const profile = await getUserProfile(address!);
                if (profile?.email && profile.notificationPreferences.deposits) {
                    await fetch('/api/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'DEPOSIT_CONFIRMED',
                            userEmail: profile.email,
                            purpose: formData.purpose,
                            amount: formData.amount,
                            txHash: txHashStr,
                            proofRailsId: receiptResult.id,
                            targetAmount: formData.targetAmount || formData.amount
                        })
                    });
                }
            } catch (emailErr) { }

            await saveReceipt({
                walletAddress: address!.toLowerCase(),
                vaultAddress: targetVault,
                txHash: txHashStr,
                timestamp: Date.now(),
                purpose: formData.purpose,
                amount: formData.amount,
                verified: !!receiptResult?.id,
                type: 'created',
                proofRailsId: receiptResult?.id
            });

            setCurrentStep('done');
            toast.success("All Done! Savings Created.", toastStyle);
            setTimeout(() => router.push("/dashboard/savings"), 1500);
        } catch (e: any) {
            console.error("❌ Proof generation failed:", e);
            await saveReceipt({
                walletAddress: address!.toLowerCase(),
                vaultAddress: targetVault,
                txHash: txHashStr,
                timestamp: Date.now(),
                purpose: formData.purpose,
                amount: formData.amount,
                verified: false,
                type: 'created'
            });

            await createNotification(
                address!,
                "Savings Created - Receipt Pending",
                `Your Savings "${formData.purpose}" is active, but your digital receipt is still processing.`,
                'info',
                `/dashboard/savings/${targetVault}`
            );

            setCurrentStep('done');
            setTimeout(() => router.push("/dashboard/savings"), 2000);
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

    const val = customDuration ? parseInt(customDuration) : parseInt(formData.duration);
    const unit = formData.durationUnit;
    let ms = 0;
    if (unit === 'minutes') ms = val * 60 * 1000;
    else if (unit === 'hours') ms = val * 60 * 60 * 1000;
    else ms = val * 24 * 60 * 60 * 1000;

    const unlockDate = new Date(Date.now() + ms);
    const potentialPenalty = formData.amount ? (parseFloat(formData.amount) * FIXED_PENALTY / 100).toFixed(4) : "0";

    const isProcessing = currentStep !== 'idle' && currentStep !== 'done';
    const getButtonText = () => {
        if (currentStep === 'creating') return "Creating Savings...";
        if (currentStep === 'approving') return "Approving USDT0...";
        if (currentStep === 'generating_proof') return "Finalizing Receipt...";
        if (currentStep === 'done') return "Redirecting...";
        return "Create & Lock Funds";
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
        <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Card className="md:p-8">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Commit Your Savings</h2>
                            <p className="text-gray-400">Lock your USDT0 to reach your goals and earn a success bonus upon completion.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
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

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-white flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    Emergency Beneficiary (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter wallet address (0x...)"
                                    disabled={isProcessing}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary/50 focus:outline-none font-mono text-sm"
                                    value={formData.beneficiary}
                                    onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-500 italic">
                                    If you remain inactive for 1 year after the lock ends, this wallet can claim the funds.
                                </p>
                            </div>

                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-white flex items-center gap-2">
                                            <Rocket className="w-4 h-4 text-primary" />
                                            Enable Auto-Deposit
                                        </label>
                                        <p className="text-xs text-gray-400">Automatically grow your savings by scheduling regular deposits.</p>
                                    </div>
                                    <div
                                        onClick={() => !isProcessing && setFormData(prev => ({ ...prev, isAutoSaveEnabled: !prev.isAutoSaveEnabled }))}
                                        className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${formData.isAutoSaveEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isAutoSaveEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>

                                {formData.isAutoSaveEnabled && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6 pt-4 border-t border-white/10">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-400">Deposit Amount</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    placeholder="10.00"
                                                    step="0.01"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={formData.autoSaveAmount}
                                                    onChange={(e) => setFormData({ ...formData, autoSaveAmount: e.target.value })}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-bold">USDT0</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-gray-400">Frequency</label>
                                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full overflow-x-auto">
                                                {(['daily', 'weekly', 'monthly', 'minutely'] as const).map((f) => (
                                                    <button
                                                        key={f}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, autoSaveFrequency: f })}
                                                        className={`flex-1 min-w-[80px] px-3 py-2 rounded-lg text-xs font-bold transition-all capitalize ${formData.autoSaveFrequency === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        {f === 'minutely' ? 'Testing' : f}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {formData.autoSaveFrequency === 'weekly' && (
                                                <CustomSelect
                                                    label="Run Every"
                                                    value={formData.autoSaveDay}
                                                    onChange={(val) => setFormData({ ...formData, autoSaveDay: val })}
                                                    options={[
                                                        { value: "1", label: "Monday" },
                                                        { value: "2", label: "Tuesday" },
                                                        { value: "3", label: "Wednesday" },
                                                        { value: "4", label: "Thursday" },
                                                        { value: "5", label: "Friday" },
                                                        { value: "6", label: "Saturday" },
                                                        { value: "7", label: "Sunday" },
                                                    ]}
                                                />
                                            )}
                                            {formData.autoSaveFrequency === 'monthly' && (
                                                <CustomSelect
                                                    label="Run on Date"
                                                    value={formData.autoSaveDay}
                                                    onChange={(val) => setFormData({ ...formData, autoSaveDay: val })}
                                                    options={Array.from({ length: 28 }, (_, i) => ({
                                                        value: (i + 1).toString(),
                                                        label: (i + 1).toString()
                                                    }))}
                                                />
                                            )}
                                            {formData.autoSaveFrequency !== 'minutely' && (
                                                <div className="space-y-2">
                                                    <label className="text-xs text-gray-400">Execution Time</label>
                                                    <input
                                                        type="time"
                                                        required
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]"
                                                        value={formData.autoSaveTime}
                                                        onChange={(e) => setFormData({ ...formData, autoSaveTime: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <Coins className="w-4 h-4 text-primary" />
                                        Initial Deposit
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            required step="0.01" min="0.1"
                                            disabled={isProcessing}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-20 text-white focus:border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDT0</span>
                                    </div>
                                    {balance !== undefined && (
                                        <p className="text-xs text-gray-500 mt-1">Available: {formatUnits(balance, decimals || 18)} USDT0</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-primary" />
                                        Target Goal (Optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number" step="0.01"
                                            disabled={isProcessing}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-20 text-white focus:border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={formData.targetAmount}
                                            onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDT0</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between md:flex-row flex-col gap-2 md:items-center">
                                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        Lock Duration
                                    </label>
                                    <div className="flex bg-white/5 p-1 rounded-lg border justify-end w-fit ml-auto border-white/10">
                                        {(['minutes', 'hours', 'days'] as const).map((u) => (
                                            <button
                                                key={u} type="button"
                                                onClick={() => setFormData({ ...formData, durationUnit: u })}
                                                className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${formData.durationUnit === u ? 'bg-primary text-white' : 'text-gray-500'}`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {formData.durationUnit === 'days' && [
                                        { val: '7', label: '1 Week' },
                                        { val: '30', label: '1 Month' },
                                        { val: '90', label: '3 Months' },
                                        { val: '180', label: '6 Months' },
                                    ].map((option) => (
                                        <button
                                            type="button" key={option.val}
                                            onClick={() => { setFormData({ ...formData, duration: option.val }); setCustomDuration(""); }}
                                            className={`p-3 rounded-xl border-2 transition-all ${formData.duration === option.val ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400'}`}
                                        >
                                            <div className="font-bold">{option.label}</div>
                                            <div className="text-xs opacity-70">{option.val} days</div>
                                        </button>
                                    ))}

                                    {formData.durationUnit === 'hours' && [
                                        { val: '1', label: '1 Hour' },
                                        { val: '6', label: '6 Hours' },
                                        { val: '12', label: '12 Hours' },
                                        { val: '24', label: '24 Hours' },
                                    ].map((option) => (
                                        <button
                                            type="button" key={option.val}
                                            onClick={() => { setFormData({ ...formData, duration: option.val }); setCustomDuration(""); }}
                                            className={`p-3 rounded-xl border-2 transition-all ${formData.duration === option.val ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400'}`}
                                        >
                                            <div className="font-bold">{option.label}</div>
                                        </button>
                                    ))}

                                    {formData.durationUnit === 'minutes' && [
                                        { val: '5', label: '5 Mins' },
                                        { val: '15', label: '15 Mins' },
                                        { val: '30', label: '30 Mins' },
                                        { val: '45', label: '45 Mins' },
                                    ].map((option) => (
                                        <button
                                            type="button" key={option.val}
                                            onClick={() => { setFormData({ ...formData, duration: option.val }); setCustomDuration(""); }}
                                            className={`p-3 rounded-xl border-2 transition-all ${formData.duration === option.val ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400'}`}
                                        >
                                            <div className="font-bold">{option.label}</div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4">
                                    <input
                                        type="number"
                                        placeholder={`Custom ${formData.durationUnit}...`}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={customDuration}
                                        onChange={(e) => { setCustomDuration(e.target.value); setFormData({ ...formData, duration: "" }); }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Unlocks on: {unlockDate.toLocaleString()}</p>
                            </div>

                            {isProcessing && (
                                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 space-y-2">
                                    <div className="flex items-center gap-2">
                                        {currentStep === 'approving' ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Check className="w-4 h-4 text-green-500" />}
                                        <span className={`text-sm ${currentStep === 'approving' ? 'text-primary font-bold' : 'text-gray-400'}`}>1. Approve USDT0</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {currentStep === 'creating' ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : ((currentStep === 'generating_proof') ? <Check className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border border-gray-500" />)}
                                        <span className={`text-sm ${currentStep === 'creating' ? 'text-primary font-bold' : 'text-gray-400'}`}>2. Create & Deposit</span>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit" size="lg"
                                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
                                disabled={isProcessing}
                            >
                                {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {getButtonText()}
                            </Button>
                        </form>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="p-6 bg-gradient-to-br from-white/5 to-white/10 border-white/10">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5 text-primary" /> Summary
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Locking Amount</p>
                                <p className="text-2xl font-bold text-white">{formData.amount || "0"} USDT0</p>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Early Exit Fee</p>
                                <p className="text-sm font-medium text-red-500">{FIXED_PENALTY}% ({potentialPenalty} USDT0)</p>
                            </div>
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-xs text-red-400 flex gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>Early withdrawal cancels all earned bonuses and incurs a 10% penalty.</span>
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
