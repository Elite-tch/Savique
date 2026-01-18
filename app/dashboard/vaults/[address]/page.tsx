"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { VAULT_ABI, ERC20_ABI, CONTRACTS } from "@/lib/contracts";
import { formatUnits } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, ArrowLeft, Clock, Wallet, AlertTriangle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { VaultBreakModal } from "@/components/VaultBreakModal";
import { useProofRails } from "@proofrails/sdk/react";
import { saveReceipt } from "@/lib/receiptService";
import { createNotification } from "@/lib/notificationService";

const MOTIVATION_QUOTES = [
    "Discipline is doing what needs to be done, even if you don't want to do it.",
    "The secret of getting ahead is getting started.",
    "Do something today that your future self will thank you for.",
    "Savings represent the option to buy your freedom in the future.",
    "Patience is not the ability to wait, but the ability to keep a good attitude while waiting.",
    "Wealth is the ability to fully experience life.",
    "Small steps in the right direction can turn out to be the biggest step of your life."
];

function useCountdown(targetDate: Date) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false
    });

    useEffect(() => {
        const targetTime = targetDate.getTime();
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const difference = targetTime - now;
            if (difference <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
                return;
            }
            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000),
                isExpired: false
            });
        };
        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(interval);
    }, [targetDate.getTime()]);

    return timeLeft;
}

export default function VaultDetailPage() {
    const params = useParams();
    const router = useRouter();
    const address = params?.address as `0x${string}`;

    const [quote, setQuote] = useState("");
    const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
    const { address: userAddress, isConnected } = useAccount();



    // Add toast ref
    const toastId = useRef<string | number | null>(null);
    const [withdrawingAmount, setWithdrawingAmount] = useState<string>("0");

    // ProofRails Integration
    const sdk = useProofRails();
    const [isGeneratingProof, setIsGeneratingProof] = useState(false);

    // Brand Styled Toast
    const toastStyle = {
        className: "bg-[#E62058]/10 border-[#E62058]/20 text-[#E62058]",
        style: {
            backgroundColor: 'rgba(230, 32, 88, 0.1)',
            borderColor: 'rgba(230, 32, 88, 0.2)',
            color: '#E62058'
        }
    };

    // Contract interactions
    const { data: purpose } = useReadContract({ address, abi: VAULT_ABI, functionName: "purpose" });
    const { data: balanceResult } = useReadContract({ address, abi: VAULT_ABI, functionName: "totalAssets" });
    const { data: unlockTimeResult } = useReadContract({ address, abi: VAULT_ABI, functionName: "unlockTimestamp" });
    const { data: decimals } = useReadContract({
        address: CONTRACTS.coston2.USDTToken,
        abi: ERC20_ABI,
        functionName: 'decimals',
    });

    // Withdrawal for unlocked vault
    const { writeContract, data: hash, isPending: isWithdrawPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

    const balance = balanceResult ? formatUnits(balanceResult, decimals || 18) : "0";
    const unlockDate = unlockTimeResult ? new Date(Number(unlockTimeResult) * 1000) : new Date();
    const isLocked = new Date() < unlockDate;
    const countdown = useCountdown(unlockDate);

    useEffect(() => {
        // Set random quote on mount
        setQuote(MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]);
    }, []);

    // Handle Write Error
    useEffect(() => {
        if (writeError) {
            if (toastId.current) toast.dismiss(toastId.current);
            toast.error(`Transaction Failed: ${writeError.message.split('\n')[0]}`, toastStyle);
        }
    }, [writeError]);

    useEffect(() => {
        if (isSuccess && hash && receipt && !isGeneratingProof) {
            if (toastId.current) toast.dismiss(toastId.current);
            setIsGeneratingProof(true);

            toast.success("Transaction Successful", toastStyle);

            const generateReceipt = async () => {
                const amountToSave = withdrawingAmount !== "0" ? withdrawingAmount : balance;
                try {
                    console.log(`[Withdraw] Generating receipt for ${amountToSave} USDT0...`);
                    // Generate ProofRails Receipt
                    const receiptResult = await sdk.templates.payment({
                        amount: parseFloat(amountToSave),
                        from: address, // Vault
                        to: receipt.from, // User
                        purpose: `Vault Withdrawal: ${purpose}`,
                        transactionHash: receipt.transactionHash
                    });

                    // Save "Completed" receipt to Firestore
                    await saveReceipt({
                        walletAddress: userAddress!.toLowerCase(),
                        vaultAddress: address,
                        txHash: receipt.transactionHash,
                        timestamp: Date.now(),
                        purpose: purpose || "Vault Withdrawal",
                        amount: parseFloat(amountToSave).toFixed(2),
                        type: 'completed',
                        verified: !!receiptResult?.id,
                        proofRailsId: receiptResult?.id
                    });

                    // Notify
                    await createNotification(
                        userAddress!,
                        "Withdrawal & Receipt Verified",
                        `Successfully withdrew funds from your "${purpose}" vault. Your digital receipt has been verified.`,
                        'success',
                        '/dashboard/history',
                        receiptResult?.id
                    );

                    toast.success("Receipt Generated", toastStyle);
                    router.push("/dashboard/vaults");
                } catch (error) {
                    console.error("Failed to generate receipt:", error);
                    toast.error("Receipt Generation Failed", toastStyle);

                    // Fallback: save to Firestore even on error
                    await saveReceipt({
                        walletAddress: userAddress!.toLowerCase(),
                        vaultAddress: address,
                        txHash: receipt.transactionHash,
                        timestamp: Date.now(),
                        purpose: purpose || "Vault Withdrawal",
                        amount: parseFloat(amountToSave).toFixed(2),
                        type: 'completed',
                        verified: false
                    });

                    // Notify fallback
                    await createNotification(
                        userAddress!,
                        "Withdrawal Success - Receipt Pending",
                        `Funds from "${purpose}" are back in your wallet. Your receipt is still processing and will verify soon.`,
                        'info',
                        '/dashboard/history'
                    );

                    router.push("/dashboard/vaults");
                }
            };
            generateReceipt();
        }
    }, [isSuccess, router, hash, purpose, balance, receipt, sdk, isGeneratingProof, withdrawingAmount, userAddress, address]);

    const handleWithdrawUnlocked = () => {
        try {
            setWithdrawingAmount(balance); // Capture balance
            toastId.current = toast.loading("Initializing Transaction...", toastStyle);
            writeContract({
                address,
                abi: VAULT_ABI,
                functionName: "withdraw",
            });
        } catch (error) {
            console.error(error);
            if (toastId.current) toast.dismiss(toastId.current);
        }
    };

    if (!isConnected) {
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

    if (!address) return <div>Invalid Vault Address</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/vaults">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        {purpose || "Vault Details"}
                        <span className={`px-2 py-0.5 rounded text-xs border ${isLocked ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                            {isLocked ? "Locked" : "Active"}
                        </span>
                    </h1>
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Status Card */}
                <Card className="md:col-span-2 p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10 flex flex-col items-center justify-center text-center h-full py-8 space-y-6">
                        {isLocked ? (
                            <>
                                <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                                    <Lock className="w-10 h-10 text-orange-500" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-zinc-500 font-medium tracking-wide text-sm uppercase">Time Remaining</p>
                                    <div className="flex items-baseline justify-center gap-2 text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight">
                                        {countdown.days > 0 && <span>{countdown.days}<span className="text-lg text-zinc-600 ml-1 mr-3">d</span></span>}
                                        {<span>{countdown.hours.toString().padStart(2, '0')}<span className="text-lg text-zinc-600 ml-1 mr-3">h</span></span>}
                                        {<span>{countdown.minutes.toString().padStart(2, '0')}<span className="text-lg text-zinc-600 ml-1 mr-3">m</span></span>}
                                        {<span className="text-zinc-500">{countdown.seconds.toString().padStart(2, '0')}<span className="text-lg text-zinc-600 ml-1">s</span></span>}
                                    </div>
                                    <p className="text-sm text-zinc-500">Until {unlockDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                                    <Unlock className="w-10 h-10 text-green-500" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-bold text-white mb-2">Goal Achieved!</h2>
                                    <p className="text-zinc-400 max-w-sm mx-auto">
                                        You have successfully completed your savings goal. Your funds are ready for withdrawal.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

                {/* Info & Actions Column */}
                <div className="space-y-6">
                    {/* Balance Card */}
                    <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-sm text-zinc-500 mb-1">Total Balance</p>
                                <h3 className="text-2xl font-bold text-white flex items-baseline gap-1">
                                    {parseFloat(balance).toFixed(2)} <span className="text-sm font-normal text-zinc-500">USDT0</span>
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 pt-4 border-t border-zinc-800/50">
                            <ShieldCheck className="w-3 h-3 text-primary" />
                            Secured by Smart Contract
                        </div>
                    </Card>

                    {/* Motivation Card */}
                    <Card className="p-6 bg-primary/5 border-primary/20">
                        <p className="text-primary/80 font-medium text-sm italic leading-relaxed">
                            "{quote}"
                        </p>
                    </Card>

                    {/* Actions */}
                    <div className="space-y-3 pt-2">
                        {isLocked ? (
                            <Button
                                variant="ghost"
                                size="md"
                                className="w-full  hover:text-red-400 bg-primary border border-red-500/20"
                                onClick={() => setIsBreakModalOpen(true)}
                            >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Break Vault Early
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                                onClick={handleWithdrawUnlocked}
                                disabled={isWithdrawPending || isConfirming}
                            >
                                {isWithdrawPending || isConfirming ? "Processing..." : "Withdraw Funds"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <VaultBreakModal
                isOpen={isBreakModalOpen}
                onClose={() => setIsBreakModalOpen(false)}
                address={address}
                purpose={purpose || ""}
                balance={balance}
            />
        </div>
    );
}
