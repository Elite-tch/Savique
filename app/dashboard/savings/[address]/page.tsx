"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { VAULT_ABI, ERC20_ABI, CONTRACTS } from "@/lib/contracts";
import { formatUnits, parseUnits } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, ArrowLeft, Clock, Wallet, AlertTriangle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { VaultBreakModal } from "@/components/VaultBreakModal";
import { useProofRails } from "@proofrails/sdk/react";
import { saveReceipt, getVaultByAddress, SavedVault, updateReceipt, saveVault } from "@/lib/receiptService";
import { createNotification } from "@/lib/notificationService";
import { Progress } from "../../../../components/ui/progress";
import { Loader2, Plus, ArrowUpCircle } from "lucide-react";

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
                setTimeLeft(prev => prev.isExpired ? prev : { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
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
    const [withdrawingAmount, setWithdrawingAmount] = useState<string>("0");

    // ProofRails Integration
    const sdk = useProofRails();
    const [isGeneratingProof, setIsGeneratingProof] = useState(false);
    const lastProcessedHash = useRef<string | null>(null);
    const toastId = useRef<string | number | null>(null);
    const [vaultData, setVaultData] = useState<SavedVault | null>(null);
    const [isTopUpMode, setIsTopUpMode] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState("");
    const [topUpStep, setTopUpStep] = useState<'idle' | 'approving' | 'depositing' | 'done'>('idle');
    const [topUpTxHash, setTopUpTxHash] = useState<`0x${string}` | undefined>(undefined);

    useEffect(() => {
        const fetchVault = async () => {
            if (address) {
                const data = await getVaultByAddress(address);
                setVaultData(data);
            }
        };
        fetchVault();
    }, [address]);

    // Contract interactions
    const { data: purpose } = useReadContract({ address, abi: VAULT_ABI, functionName: "purpose" });
    const { data: balanceResult, refetch: refetchBalance } = useReadContract({ address, abi: VAULT_ABI, functionName: "totalAssets" });
    const { data: unlockTimeResult } = useReadContract({ address, abi: VAULT_ABI, functionName: "unlockTimestamp" });
    const { data: decimals } = useReadContract({
        address: CONTRACTS.coston2.USDTToken,
        abi: ERC20_ABI,
        functionName: 'decimals',
    });

    // Check Allowance for Top-up
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.coston2.USDTToken,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, address],
        query: { enabled: !!userAddress && !!address },
    });

    // Balance for Top-up
    const { data: userBalance, refetch: refetchUserBalance } = useReadContract({
        address: CONTRACTS.coston2.USDTToken,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
        query: { enabled: !!userAddress },
    });

    const accruedBonus = useMemo(() => {
        if (!balanceResult || !vaultData || !decimals) return "0.000";
        const bal = parseFloat(formatUnits(balanceResult, decimals as number || 18));
        const now = Date.now();
        const start = vaultData.createdAt;
        const elapsedYears = (now - start) / (1000 * 60 * 60 * 24 * 365);
        // Assuming 10% yield, user gets 10% share = 1% APY effective
        return (bal * 0.01 * elapsedYears).toFixed(4);
    }, [balanceResult, vaultData, decimals]);

    // Brand Styled Toast
    const toastStyle = {
        className: "bg-[#E62058]/10 border-[#E62058]/20 text-[#E62058]",
        style: {
            backgroundColor: 'rgba(230, 32, 88, 0.1)',
            borderColor: 'rgba(230, 32, 88, 0.2)',
            color: '#E62058'
        }
    };

    // Withdrawal for unlocked vault
    const { writeContract, data: hash, isPending: isWithdrawPending, error: writeError } = useWriteContract();

    // Handle Write Error & Loading Dismissal
    useEffect(() => {
        if (writeError) {
            if (toastId.current) toast.dismiss(toastId.current);
            toast.error(`Transaction Failed: ${writeError.message.split('\n')[0]}`, toastStyle);
            setTopUpStep('idle');
        }
    }, [writeError]);

    const { isLoading: isConfirming, isSuccess, data: receipt, error: confirmError } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (confirmError) {
            console.error("Confirmation Error Details:", confirmError);
            if (toastId.current) toast.dismiss(toastId.current);
            // Show the actual error to help debugging
            const errMsg = confirmError instanceof Error ? confirmError.message.split('\n')[0] : "Transaction Confirmation Failed";
            toast.error(errMsg, toastStyle);
            setTopUpStep('idle');
            setIsGeneratingProof(false);
        }
    }, [confirmError]);

    const balance = balanceResult ? formatUnits(balanceResult as bigint, decimals as number || 18) : "0";
    const unlockDate = unlockTimeResult ? new Date(Number(unlockTimeResult) * 1000) : new Date();
    const isLocked = new Date() < unlockDate;
    const countdown = useCountdown(unlockDate);

    useEffect(() => {
        // Set random quote on mount
        setQuote(MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]);
    }, []);

    useEffect(() => {
        // Only generate receipts for actual deposits/withdrawals, NOT for approvals
        if (isSuccess && hash && receipt && !isGeneratingProof &&
            lastProcessedHash.current !== receipt.transactionHash &&
            (topUpStep === 'depositing' || withdrawingAmount !== "0")) {
            // Check for reverted status
            if (receipt.status === 'reverted') {
                console.error("Transaction Reverted:", receipt.transactionHash);
                toast.error("Transaction Reverted on-chain. Please check your balance and try again.", toastStyle);
                setTopUpStep('idle');
                lastProcessedHash.current = receipt.transactionHash; // Mark as seen so we don't repeat the error toast
                return;
            }

            lastProcessedHash.current = receipt.transactionHash;

            if (toastId.current) {
                toast.success("Transaction Successful", { ...toastStyle, id: toastId.current });
                toastId.current = null;
            }
            setIsGeneratingProof(true);

            const generateReceipt = async () => {
                const amountToSave = withdrawingAmount !== "0" ? withdrawingAmount : (topUpAmount !== "" ? topUpAmount : balance);
                const isDeposit = topUpStep === 'depositing' || topUpStep === 'done';
                const currentTotal = parseFloat(balance);
                const target = vaultData?.targetAmount ? parseFloat(vaultData.targetAmount) : 0;
                const isGoalReached = isDeposit && target > 0 && (currentTotal + parseFloat(amountToSave)) >= target;

                const customPurpose = isDeposit
                    ? (isGoalReached ? `Target Reached: ${purpose}` : `Contributed: ${purpose}`)
                    : `Withdrawal: ${purpose}`;

                try {
                    console.log(`[${isDeposit ? 'Deposit' : 'Withdraw'}] Generating receipt for ${amountToSave} USDT0...`);

                    // 1. Generate ProofRails Receipt
                    const receiptResult = await sdk.templates.payment({
                        amount: parseFloat(amountToSave),
                        from: isDeposit ? userAddress! : address,
                        to: isDeposit ? address : userAddress!,
                        purpose: isDeposit ? `Savings Deposit: ${purpose}` : `Savings Withdrawal: ${purpose}`,
                        transactionHash: receipt.transactionHash
                    });

                    // 2. Save Receipt to Firestore
                    await saveReceipt({
                        walletAddress: userAddress!.toLowerCase(),
                        vaultAddress: address,
                        txHash: receipt.transactionHash,
                        timestamp: Date.now(),
                        purpose: customPurpose,
                        amount: parseFloat(amountToSave).toFixed(2),
                        type: isDeposit ? 'created' : 'completed',
                        verified: !!receiptResult?.id,
                        proofRailsId: receiptResult?.id
                    });

                    // 3. Notify User
                    await createNotification(
                        userAddress!,
                        isDeposit ? "Deposit & Receipt Verified" : "Withdrawal & Receipt Verified",
                        isDeposit
                            ? `Successfully added ${amountToSave} to your "${purpose}" savings. Your digital receipt is verified.`
                            : `Successfully withdrew funds from your "${purpose}" savings. Your digital receipt is verified.`,
                        'success',
                        isDeposit ? `/dashboard/savings/${address}` : '/dashboard/history',
                        receiptResult?.id
                    );

                    toast.success("Receipt Generated", toastStyle);

                    // Refetch all data to update UI immediately
                    refetchBalance();
                    refetchUserBalance();

                    if (isDeposit) {
                        setTopUpStep('done');
                        setTopUpAmount("");
                        setWithdrawingAmount("0");
                        setIsGeneratingProof(false); // Allow further actions

                        // Redirect after a short delay so user sees success
                        setTimeout(() => {
                            router.push("/dashboard/savings");
                        }, 2000);
                    } else {
                        router.push("/dashboard/savings");
                    }
                } catch (error) {
                    console.error("Failed to generate receipt:", error);
                    toast.error("Receipt Generation Failed", toastStyle);

                    // Fallback: save to Firestore even on error
                    await saveReceipt({
                        walletAddress: userAddress!.toLowerCase(),
                        vaultAddress: address,
                        txHash: receipt.transactionHash,
                        timestamp: Date.now(),
                        purpose: customPurpose,
                        amount: parseFloat(amountToSave).toFixed(2),
                        type: isDeposit ? 'created' : 'completed',
                        verified: false
                    });

                    // Notify fallback
                    await createNotification(
                        userAddress!,
                        isDeposit ? "Deposit Success" : "Withdrawal Success - Receipt Pending",
                        isDeposit
                            ? `Successfully added ${amountToSave} to your savings. Your digital receipt is pending.`
                            : `Funds from "${purpose}" are back in your wallet. Your receipt is still processing.`,
                        'info',
                        isDeposit ? `/dashboard/savings/${address}` : '/dashboard/history'
                    );

                    // Refetch data even on error fallback
                    refetchBalance();
                    refetchUserBalance();

                    if (isDeposit) {
                        setTopUpStep('done');
                        setTopUpAmount("");
                        setWithdrawingAmount("0");
                        setIsGeneratingProof(false);

                        setTimeout(() => {
                            router.push("/dashboard/savings");
                        }, 2000);
                    } else {
                        router.push("/dashboard/savings");
                    }
                }
            };
            generateReceipt();
        }
    }, [isSuccess, router, hash, purpose, balance, receipt, sdk, isGeneratingProof, withdrawingAmount, userAddress, address, topUpStep, topUpAmount]);

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

    const handleTopUp = async (bypassAllowance = false) => {
        if (!userAddress || !topUpAmount) return;

        const amountUnits = parseUnits(topUpAmount, decimals as number || 18);
        const currentTotal = parseFloat(balance);
        const adding = parseFloat(topUpAmount);
        const target = vaultData?.targetAmount ? parseFloat(vaultData.targetAmount) : 0;

        // Issue 3: Prevent topping up more than goal
        if (target > 0 && currentTotal + adding > target) {
            toast.error(`Deposit exceeds goal! Your target is $${target}. Reach this milestone or create a new vault.`, toastStyle);
            return;
        }

        try {
            // If we aren't bypassing, and we don't have enough allowance, trigger approval
            if (!bypassAllowance && (!allowance || (allowance as bigint) < amountUnits)) {
                setTopUpStep('approving');
                if (toastId.current) toast.dismiss(toastId.current);
                toastId.current = toast.loading("Approving USDT...", toastStyle);
                writeContract({
                    address: CONTRACTS.coston2.USDTToken,
                    abi: ERC20_ABI,
                    functionName: "approve",
                    args: [address, BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935")]
                });
            } else {
                setTopUpStep('depositing');
                const msg = "Depositing USDT...";
                if (toastId.current) {
                    toast.loading(msg, { ...toastStyle, id: toastId.current });
                } else {
                    toastId.current = toast.loading(msg, toastStyle);
                }
                writeContract({
                    address,
                    abi: VAULT_ABI,
                    functionName: "deposit",
                    args: [amountUnits]
                });
                // Ensure allowance is refreshed after we've used it
                refetchAllowance();
            }
        } catch (e) {
            console.error(e);
            setTopUpStep('idle');
        }
    };

    // Watch for successful deposit to transition steps
    useEffect(() => {
        if (isSuccess && receipt && topUpStep === 'approving') {
            if (receipt.status === 'reverted') {
                toast.error("Approval Reverted. Please try again.", toastStyle);
                setTopUpStep('idle');
                return;
            }
            if (toastId.current) {
                toast.success("Approved! Now depositing...", { ...toastStyle, id: toastId.current });
            }
            setTopUpStep('depositing');
            // Force the next step to skip the allowance check, as we just approved
            handleTopUp(true);
            refetchAllowance();
        } else if (isSuccess && receipt && topUpStep === 'depositing') {
            if (receipt.status === 'reverted') {
                toast.error("Deposit Reverted. Please check your balance.", toastStyle);
                setTopUpStep('idle');
                return;
            }
            setTopUpStep('done');
            refetchAllowance();
        }
    }, [isSuccess, receipt, topUpStep]);

    const progressValue = useMemo(() => {
        if (!vaultData?.targetAmount || !balance) return 0;
        const current = parseFloat(balance);
        const target = parseFloat(vaultData.targetAmount);
        if (target === 0) return 100;
        return Math.min(100, (current / target) * 100);
    }, [vaultData, balance]);

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
                <Link href="/dashboard/savings">
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

                                {/* Progress Bar */}
                                {vaultData?.targetAmount && parseFloat(vaultData.targetAmount) > 0 ? (
                                    <div className="w-full max-w-md space-y-3 mt-4">
                                        <div className="flex justify-between items-end">
                                            <div className="text-left">
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Goal Progress</p>
                                                <p className="text-sm font-bold text-white">{progressValue.toFixed(1)}%</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Target</p>
                                                <p className="text-sm font-bold text-primary">${parseFloat(vaultData.targetAmount).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <Progress value={progressValue} className="h-2 bg-white/5 border border-white/10 overflow-hidden" />
                                        <div className="flex justify-between text-[10px] text-zinc-600">
                                            <span>${parseFloat(balance).toLocaleString()} Saved</span>
                                            <span>${(parseFloat(vaultData.targetAmount) - parseFloat(balance) > 0 ? parseFloat(vaultData.targetAmount) - parseFloat(balance) : 0).toLocaleString()} Remaining</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full max-w-md mt-4 p-4 rounded-xl border border-dashed border-white/10 bg-white/5">
                                        <p className="text-xs text-zinc-400 mb-2">No target set for this vault.</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-[10px] border-primary/20 hover:bg-primary/10 text-primary"
                                            onClick={() => {
                                                const newTarget = prompt("Enter target amount for this goal:", balance);
                                                if (newTarget && !isNaN(parseFloat(newTarget))) {
                                                    saveVault({
                                                        ...vaultData!,
                                                        vaultAddress: address,
                                                        owner: userAddress!.toLowerCase(),
                                                        factoryAddress: CONTRACTS.coston2.VaultFactory,
                                                        targetAmount: newTarget
                                                    }).then(() => {
                                                        window.location.reload();
                                                    });
                                                }
                                            }}
                                        >
                                            Set Target Goal
                                        </Button>
                                    </div>
                                )}
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
                                <p className="text-sm text-zinc-500 mb-1">Total Principal</p>
                                <h3 className="text-2xl font-bold text-white flex items-baseline gap-1">
                                    {parseFloat(balance).toFixed(2)} <span className="text-sm font-normal text-zinc-500">USDT0</span>
                                </h3>
                            </div>
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
                            <>
                                {isTopUpMode ? (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-zinc-500">Amount to Add</span>
                                                {userBalance !== undefined && (
                                                    <span className="text-zinc-400">Bal: {formatUnits(userBalance as bigint, decimals as number || 18)} USDT0</span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={topUpAmount}
                                                    onChange={(e) => setTopUpAmount(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                className="flex-1 h-9 rounded-lg"
                                                onClick={() => handleTopUp()}
                                                disabled={topUpStep !== 'idle' || isConfirming || !topUpAmount}
                                            >
                                                {(topUpStep === 'approving' || topUpStep === 'depositing' || isConfirming) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
                                                {topUpStep === 'approving' ? 'Approving...' : (topUpStep === 'depositing' || isConfirming) ? 'Processing...' : 'Confirm'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="h-9 w-9 p-0 rounded-lg hover:bg-white/10"
                                                onClick={() => { setIsTopUpMode(false); setTopUpAmount(""); }}
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <Button
                                        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
                                        onClick={() => setIsTopUpMode(true)}
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Top Up Savings
                                    </Button>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-zinc-500 hover:text-red-400 hover:bg-red-500/5 mt-2"
                                    onClick={() => setIsBreakModalOpen(true)}
                                >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Break Vault Early
                                </Button>
                            </>
                        ) : parseFloat(balance) <= 0 ? (
                            <Button disabled className="w-full bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed">
                                Vault Empty
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
