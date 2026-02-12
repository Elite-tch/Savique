"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, AlertTriangle, ShieldCheck, Coins, Lock, Calendar, TrendingUp, Info, Plus, Wallet, Receipt, Loader2, Check } from "lucide-react";
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

const MAX_UINT256 = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");

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
        targetAmount: "", // New: Sinking Fund Goal
        duration: "30",
        durationUnit: "days" as "minutes" | "hours" | "days",
        beneficiary: ""
    });

    const [customDuration, setCustomDuration] = useState("");
    const FIXED_PENALTY = 10; // Fixed 10% penalty
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

    // ProofRails Integration
    const sdk = useProofRails();

    // Reset loop when transaction succeeds
    useEffect(() => {
        const processStep = async () => {
            if (isSuccess && receipt) {
                if (currentStep === 'approving') {
                    // 1. Approved - Now Create & Deposit
                    toast.dismiss(toastId.current as string);
                    toast.success("USDT Approved!", toastStyle);

                    // Start next step
                    toastId.current = toast.loading("Creating & Funding Savings...", toastStyle);
                    setTxHash(undefined);
                    setCurrentStep('creating');
                    triggerCreateVault();
                } else if (currentStep === 'creating') {
                    // 2. Created & Deposited - Find Address & Generate Proof
                    toast.dismiss(toastId.current as string);

                    try {
                        // Find the PersonalVaultCreated event in the logs
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
                            } catch (e) {
                                // Not our event, ignore
                            }
                        }

                        if (!newVault) {
                            // Fallback to getUserVaults if event parsing fails
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
                            toast.success("Savings Created & Funded!", toastStyle);
                            setTxHash(undefined);
                            setCurrentStep('generating_proof');
                            // Pass address directly to avoid state race condition
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
    }, [isSuccess, receipt]);

    // Error handling
    useEffect(() => {
        if (writeError) {
            console.error("Write error:", writeError);
            if (toastId.current) toast.dismiss(toastId.current);
            toast.error(`Transaction Failed: ${writeError.message.split('\n')[0]}`, toastStyle);

            // Send Failure Email
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

    // Handle Network/On-chain Revert Errors
    useEffect(() => {
        if (isConfirmError || (isSuccess && receipt?.status === 'reverted')) {
            console.error("Transaction confirmation error:", confirmError || "Reverted");
            if (toastId.current) toast.dismiss(toastId.current);

            const errMsg = confirmError
                ? (confirmError as any).shortMessage || confirmError.message.split('\n')[0]
                : "Transaction Reverted on-chain";

            toast.error(`Confirmation Failed: ${errMsg}`, toastStyle);

            // Send Failure Email
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

            // Check if approval is needed
            if (!allowance || allowance < amountUnits) {
                setCurrentStep('approving');
                toastId.current = toast.loading("Approving USDT...", toastStyle);

                // Approve Max to avoid future approvals? Or just amount.
                // User asked for "stress" reduction, so Max is better UX but less secure.
                // Let's approve EXACT amount for now, or MAX if user prefers.
                // Let's approve MAX to solve "poping up" issue for future.
                writeContract({
                    address: CONTRACTS.coston2.USDTToken,
                    abi: ERC20_ABI,
                    functionName: "approve",
                    args: [CONTRACTS.coston2.VaultFactory, MAX_UINT256]
                }, {
                    onSuccess: (hash) => setTxHash(hash)
                });
            } else {
                // Allowance is good, go straight to create
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
        const targetVault = vaultAddrOverride || createdVaultAddress!;

        // CRITICAL: Save Vault to Registry immediately, before any fragile API calls
        try {
            await saveVault({
                vaultAddress: targetVault,
                owner: address!.toLowerCase(),
                factoryAddress: CONTRACTS.coston2.VaultFactory,
                createdAt: Date.now(),
                purpose: formData.purpose,
                targetAmount: formData.targetAmount || formData.amount, // Fallback to initial amount if not set
                beneficiary: formData.beneficiary || ""
            });
            console.log("✅ Savings saved to registry");


        } catch (dbError) {
            console.error("❌ Failed to save savings to registry:", dbError);
            // We continue, but this is bad.
        }

        try {
            console.log("🔄 Starting ProofRails receipt generation...");

            // Create a "Savings" receipt
            const receiptResult = await sdk.templates.payment({
                amount: parseFloat(formData.amount),
                from: address!,
                to: targetVault,
                purpose: `Safira: ${formData.purpose}`,
                transactionHash: txHashStr
            });

            console.log("✅ ProofRails Receipt Created:", receiptResult);

            // Notify User
            await createNotification(
                address!,
                "Savings Created & Verified",
                `Your Savings "${formData.purpose}" has been secured and your digital receipt is verified.`,
                'success',
                `/dashboard/savings/${targetVault}`,
                receiptResult.id
            );

            // Send Professional Email Notification
            try {
                console.log('[Email] Checking user profile for email notifications...');
                const profile = await getUserProfile(address!);
                console.log('[Email] Profile loaded:', profile);

                if (profile?.email && profile.notificationPreferences.deposits) {
                    console.log('[Email] Sending notification to:', profile.email);
                    const response = await fetch('/api/notify', {
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
                    const result = await response.json();
                    console.log('[Email] API Response:', result);
                } else {
                    console.log('[Email] Skipping - No email or deposits disabled');
                }
            } catch (emailErr) {
                console.error('[Email] Failed to trigger notification:', emailErr);
            }

            // Save receipt to Firestore
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

            // Even on error, save the transaction
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

            // Notify user even on error
            await createNotification(
                address!,
                "Savings Created - Receipt Pending",
                `Your Savings "${formData.purpose}" is active, but your digital receipt is still processing. It will verify automatically soon.`,
                'info',
                `/dashboard/savings/${targetVault}`
            );

            // Still send email even if ProofRails fails
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
                            targetAmount: formData.targetAmount || formData.amount
                        })
                    });
                }
            } catch (emailErr) {
                console.warn('[Email] Failed to send fallback notification:', emailErr);
            }

            toast.error("Receipt Gen Failed but Savings Created", toastStyle);
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

    // UI Helpers
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
                    <p className="text-gray-400">
                        Please connect your wallet to view your dashboard and manage your savings.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="md:col-span-2">
                    <Card className="md:p-8">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Commit Your Savings</h2>
                            <p className="text-gray-400">Lock your USDT0 to reach your goals and earn a success bonus upon completion.</p>
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

                            {/* Emergency Beneficiary */}
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
                                    Everything remains private until then.
                                </p>
                            </div>

                            {/* Amount */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <Coins className="w-4 h-4 text-primary" />
                                        Initial Deposit
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            required
                                            step="0.01"
                                            min="0.1"
                                            disabled={isProcessing}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-20 text-white focus:border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDT0</span>
                                    </div>
                                    {balance !== undefined && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Available: {formatUnits(balance, decimals || 18)} USDT0
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-primary" />
                                        Target Goal (Optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder={formData.amount || "0.00"}
                                            step="0.01"
                                            disabled={isProcessing}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-20 text-white focus:border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={formData.targetAmount}
                                            onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDT0</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Total you wish to save</p>
                                </div>
                            </div>

                            {/* Lock Duration */}
                            <div className="space-y-3">
                                <div className="flex justify-between md:flex-row flex-col gap-2 md:items-center">
                                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        Lock Duration
                                    </label>
                                    <div className="flex bg-white/5 p-1 rounded-lg border justify-end w-fit ml-auto border-white/10">
                                        {(['minutes', 'hours', 'days'] as const).map((u) => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, durationUnit: u })}
                                                className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${formData.durationUnit === u ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.durationUnit === 'days' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { val: '7', label: '1 Week' },
                                            { val: '30', label: '1 Month' },
                                            { val: '90', label: '3 Months' },
                                            { val: '180', label: '6 Months' },
                                        ].map((option) => (
                                            <button
                                                type="button"
                                                key={option.val}
                                                onClick={() => {
                                                    setFormData({ ...formData, duration: option.val, durationUnit: 'days' });
                                                    setCustomDuration("");
                                                }}
                                                disabled={isProcessing}
                                                className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${formData.duration === option.val && formData.durationUnit === 'days' && !customDuration ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400'}`}
                                            >
                                                <div className="font-bold">{option.label}</div>
                                                <div className="text-xs opacity-70">{option.val} days</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {formData.durationUnit === 'hours' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { val: '1', label: '1 Hour' },
                                            { val: '6', label: '6 Hours' },
                                            { val: '12', label: '12 Hours' },
                                            { val: '24', label: '24 Hours' },
                                        ].map((option) => (
                                            <button
                                                type="button"
                                                key={option.val}
                                                onClick={() => {
                                                    setFormData({ ...formData, duration: option.val, durationUnit: 'hours' });
                                                    setCustomDuration("");
                                                }}
                                                disabled={isProcessing}
                                                className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${formData.duration === option.val && formData.durationUnit === 'hours' && !customDuration ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400'}`}
                                            >
                                                <div className="font-bold">{option.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {formData.durationUnit === 'minutes' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { val: '5', label: '5 Mins' },
                                            { val: '15', label: '15 Mins' },
                                            { val: '30', label: '30 Mins' },
                                            { val: '45', label: '45 Mins' },
                                        ].map((option) => (
                                            <button
                                                type="button"
                                                key={option.val}
                                                onClick={() => {
                                                    setFormData({ ...formData, duration: option.val, durationUnit: 'minutes' });
                                                    setCustomDuration("");
                                                }}
                                                disabled={isProcessing}
                                                className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${formData.duration === option.val && formData.durationUnit === 'minutes' && !customDuration ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400'}`}
                                            >
                                                <div className="font-bold">{option.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Custom Duration */}
                                <div className="mt-4">
                                    <input
                                        type="number"
                                        placeholder={`Custom ${formData.durationUnit}...`}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={customDuration}
                                        disabled={isProcessing}
                                        onChange={(e) => {
                                            setCustomDuration(e.target.value);
                                            setFormData({ ...formData, duration: "" });
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Unlocks on: {unlockDate.toLocaleString()}</p>
                            </div>

                            {/* Steps Progress, visual only if processing */}
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
                                <p className="text-xs text-gray-500 mb-1">Early Exit Fee</p>
                                <p className="text-sm font-medium text-red-500">{FIXED_PENALTY}% ({potentialPenalty} USDT0)</p>
                            </div>
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-xs text-red-400 flex gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>Early withdrawal cancels all earned bonuses and incurs a 10% penalty on your principal.</span>
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
