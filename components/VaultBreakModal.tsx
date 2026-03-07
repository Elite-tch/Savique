"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, X, Lock, Unlock } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { VAULT_ABI } from "@/lib/contracts";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProofRails } from "@proofrails/sdk/react";
import { saveReceipt } from "@/lib/receiptService";
import { createNotification } from "@/lib/notificationService";
import { getUserProfile } from "@/lib/userService";
import { useEcosystem } from "@/context/EcosystemContext";
import { useEcosystemAccount } from "@/hooks/useEcosystemAccount";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { DEVNET_SHIP_MINT, DEVNET_USDC_MINT, SAVIQUE_PROGRAM_ID } from "@/lib/solana";
import { PublicKey as SolanaPubkey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const TREASURY_PUBKEY = new SolanaPubkey("6heYLiVhJT4q51iv81Q9QEgktT6y3YyJxZmxHSTUAaXb");

interface VaultBreakModalProps {
    isOpen: boolean;
    onClose: () => void;
    address: string;
    purpose: string;
    balance: string; // Ether string
    penaltyBps?: number; // Basis points, e.g., 1000 for 10%
    currency?: string;
}

export function VaultBreakModal({
    isOpen,
    onClose,
    address,
    purpose,
    balance,
    penaltyBps = 1000, // Default 10%
    currency = "SHIP"
}: VaultBreakModalProps) {
    const toastStyle = {
        className: "bg-[#E62058]/10 border-[#E62058]/20 text-[#E62058]",
        style: {
            backgroundColor: 'rgba(230, 32, 88, 0.1)',
            borderColor: 'rgba(230, 32, 88, 0.2)',
            color: '#E62058'
        }
    };

    const router = useRouter();
    const { address: userAddress } = useEcosystemAccount();
    const { isFlare, isSolana } = useEcosystem();
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const anchorWallet = useAnchorWallet();

    const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

    // ProofRails Integration
    const sdk = useProofRails();
    const [isGeneratingProof, setIsGeneratingProof] = useState(false);

    // Toast control
    const toastId = useRef<string | number | null>(null);

    const handleWithdraw = async () => {
        if (isFlare) {
            try {
                toastId.current = toast.loading("Initializing Transaction...", toastStyle);
                writeContract({
                    address: address as `0x${string}`,
                    abi: VAULT_ABI,
                    functionName: "withdraw",
                });
            } catch (error) {
                console.error(error);
                if (toastId.current) toast.dismiss(toastId.current);
            }
        } else if (isSolana && publicKey && connection && anchorWallet) {
            try {
                toastId.current = toast.loading("Confirming on-chain...", toastStyle);

                const { getSigningProvider, getSaviqueProgram } = await import("@/lib/anchor");
                const provider = getSigningProvider(connection, anchorWallet);
                const program = getSaviqueProgram(provider);

                const isUsdc = currency === 'USDC';
                const mint = isUsdc ? DEVNET_USDC_MINT : DEVNET_SHIP_MINT;

                const vaultPubkey = new SolanaPubkey(address);
                const treasuryTokenAccount = getAssociatedTokenAddressSync(
                    mint,
                    TREASURY_PUBKEY,
                    true
                );

                const vaultTokenAccount = getAssociatedTokenAddressSync(
                    mint,
                    vaultPubkey,
                    true
                );

                const ownerTokenAccount = getAssociatedTokenAddressSync(
                    mint,
                    publicKey
                );

                const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } = await import("@solana/spl-token");
                const { Transaction } = await import("@solana/web3.js");

                // Check if treasury ATA exists
                const treasuryInfo = await connection.getAccountInfo(treasuryTokenAccount);
                const instructions = [];

                if (!treasuryInfo) {
                    console.log("Treasury ATA missing, adding creation instruction...");
                    instructions.push(
                        createAssociatedTokenAccountInstruction(
                            publicKey,
                            treasuryTokenAccount,
                            TREASURY_PUBKEY,
                            mint
                        )
                    );
                }

                const breakIx = await (program.methods as any)
                    .breakVault()
                    .accounts({
                        owner: publicKey,
                        vault: vaultPubkey,
                        mint: mint,
                        vaultTokenAccount,
                        ownerTokenAccount,
                        treasuryTokenAccount: treasuryTokenAccount,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SolanaPubkey.default,
                    })
                    .instruction();

                instructions.push(breakIx);

                const tx = new Transaction().add(...instructions);
                const latestBlockhash = await connection.getLatestBlockhash();
                tx.recentBlockhash = latestBlockhash.blockhash;
                tx.feePayer = publicKey;

                const signature = await sendTransaction(tx, connection);
                await connection.confirmTransaction(signature, "confirmed");

                toast.dismiss(toastId.current as string);
                toast.success("Savings Broken! Fund recovered.", toastStyle);

                // Firebase receipt
                await saveReceipt({
                    walletAddress: publicKey.toBase58(),
                    vaultAddress: address,
                    txHash: signature,
                    timestamp: Date.now(),
                    purpose: purpose || "Solana Savings Broken",
                    amount: amountToReceive.toFixed(2),
                    penalty: penaltyAmount.toFixed(2),
                    type: 'breaked',
                    verified: false,
                    currency: currency,
                    decimals: currency === 'USDC' ? 6 : 9
                });

                onClose();

                // Send Email Notification
                try {
                    const profile = await getUserProfile(publicKey.toBase58());
                    if (profile?.email && profile.notificationPreferences.withdrawals) {
                        await fetch('/api/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'SAVINGS_BROKEN',
                                userEmail: profile.email,
                                purpose: purpose,
                                amount: amountToReceive.toFixed(2),
                                txHash: signature,
                                currency: currency
                            })
                        });
                    }
                } catch (emailErr) {
                    console.warn('[Email] Failed to send Solana break notification:', emailErr);
                }

                router.push("/dashboard/savings");
            } catch (error: any) {
                console.error("Solana break vault error:", error);
                if (toastId.current) toast.dismiss(toastId.current as string);
                toast.error(`Transaction Failed: ${error.message}`, toastStyle);

                // Send Failure Email
                try {
                    const profile = await getUserProfile(publicKey.toBase58());
                    if (profile?.email) {
                        await fetch('/api/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'TRANSACTION_FAILED',
                                userEmail: profile.email,
                                purpose: purpose || "Break Solana Savings",
                                amount: balance
                            })
                        });
                    }
                } catch (emailErr) {
                    console.warn('[Email] Failed to send Solana break failure notification:', emailErr);
                }
            }
        }
    };

    // Calculate penalty
    const penaltyPercent = penaltyBps / 100;
    const penaltyAmount = parseFloat(balance) * (penaltyPercent / 100);
    const amountToReceive = Math.max(0, parseFloat(balance) - penaltyAmount);

    useEffect(() => {
        if (writeError) {
            if (toastId.current) toast.dismiss(toastId.current);
            toast.error("Transaction Failed", toastStyle);
        }
    }, [writeError]);

    useEffect(() => {
        if (isSuccess && hash && receipt && !isGeneratingProof) {
            if (toastId.current) toast.dismiss(toastId.current);
            setIsGeneratingProof(true);

            toast.success("Transaction Successful", toastStyle);

            const generateReceipt = async () => {
                try {
                    // Generate ProofRails Receipt
                    const receiptResult = await sdk.templates.payment({
                        amount: amountToReceive,
                        from: address, // Vault
                        to: receipt.from, // User (initiator)
                        purpose: `Savings Broken: ${purpose}`,
                        transactionHash: receipt.transactionHash
                    });

                    // Save "Breaked" receipt to Firestore
                    await saveReceipt({
                        walletAddress: userAddress!.toLowerCase(),
                        vaultAddress: address,
                        txHash: receipt.transactionHash,
                        timestamp: Date.now(),
                        purpose: purpose || "Savings Broken",
                        amount: amountToReceive.toFixed(2),
                        penalty: penaltyAmount.toFixed(2),
                        type: 'breaked',
                        verified: !!receiptResult?.id,
                        proofRailsId: receiptResult?.id,
                        currency: currency,
                        decimals: currency === 'USDC' ? 6 : 9
                    });

                    await createNotification(
                        userAddress!,
                        "Savings Broken & Verified",
                        `You broke "${purpose}" early. Your digital receipt is verified. Penalty applied.`,
                        'warning',
                        '/dashboard/history',
                        receiptResult?.id
                    );

                    // Send Professional Email Notification
                    try {
                        const profile = await getUserProfile(userAddress!);
                        if (profile?.email && profile.notificationPreferences.withdrawals) {
                            await fetch('/api/notify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'SAVINGS_BROKEN',
                                    userEmail: profile.email,
                                    purpose: purpose,
                                    amount: amountToReceive.toFixed(2),
                                    txHash: receipt.transactionHash,
                                    proofRailsId: receiptResult?.id,
                                    currency: currency
                                })
                            });
                        }
                    } catch (emailErr) {
                        console.warn('[Email] Failed to send break notification:', emailErr);
                    }

                    toast.success("Receipt Generated", toastStyle);
                    onClose();
                    router.push("/dashboard/savings");
                } catch (error) {
                    console.error("Failed to generate receipt:", error);
                    toast.error("Receipt Generation Failed", toastStyle);

                    // Fallback: save to Firestore even on error
                    await saveReceipt({
                        walletAddress: userAddress!.toLowerCase(),
                        vaultAddress: address,
                        txHash: receipt.transactionHash,
                        timestamp: Date.now(),
                        purpose: purpose || "Savings Broken",
                        amount: amountToReceive.toFixed(2),
                        penalty: penaltyAmount.toFixed(2),
                        type: 'breaked',
                        verified: false,
                        currency: currency,
                        decimals: currency === 'USDC' ? 6 : 9
                    });

                    // Notify user even on error
                    await createNotification(
                        userAddress!,
                        "Savings Broken - Receipt Pending",
                        `Savings "${purpose}" broken successfully. Funds transferred, receipt will verify automatically soon.`,
                        'info',
                        '/dashboard/history'
                    );

                    // Still send email even if ProofRails fails
                    try {
                        const profile = await getUserProfile(userAddress!);
                        if (profile?.email && profile.notificationPreferences.withdrawals) {
                            await fetch('/api/notify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'SAVINGS_BROKEN',
                                    userEmail: profile.email,
                                    purpose: purpose,
                                    amount: amountToReceive.toFixed(2),
                                    txHash: receipt.transactionHash,
                                    currency: currency
                                })
                            });
                        }
                    } catch (emailErr) {
                        console.warn('[Email] Failed to send break notification:', emailErr);
                    }

                    onClose();
                    router.push("/dashboard/savings");
                }
            };

            generateReceipt();
        }
    }, [isSuccess, router, onClose, hash, receipt, amountToReceive, penaltyAmount, purpose, sdk, isGeneratingProof]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-red-500/20 text-white rounded-2xl w-full max-w-xl m-4 p-6 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                    disabled={isWritePending || isConfirming}
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6 text-center">
                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-500 mb-2">Break Savings?</h2>
                    <p className="text-sm text-zinc-400">
                        Breaking your savings means losing your accrued success bonus and paying a 10% early exit fee.
                    </p>
                </div>

                <div className="mb-8 space-y-4">
                    <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-400">Locked Balance</span>
                            <span className="font-mono text-white">{parseFloat(balance).toFixed(2)} {isSolana ? currency : 'USDT0'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-red-400">
                            <span className="flex items-center gap-1"><TrendingDown className="w-4 h-4" /> Savings Fee ({penaltyPercent}%)</span>
                            <span className="font-mono font-bold">-{penaltyAmount.toFixed(2)} {isSolana ? currency : 'USDT0'}</span>
                        </div>
                        <div className="h-px bg-red-500/20 w-full" />
                        <div className="flex justify-between items-center">
                            <span className="text-white font-medium">You Recover</span>
                            <span className="font-mono font-bold text-xl text-white">{amountToReceive.toFixed(2)} {isSolana ? currency : 'USDT0'}</span>
                        </div>
                    </div>
                    <p className="text-xs text-center text-zinc-500 px-4">
                        All accrued success bonuses and the savings fee will be forfeited to the protocol.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={handleWithdraw}
                        className="w-full bg-red-600 hover:bg-red-700 text-white border-none py-2 text-lg font-semibold shadow-lg shadow-red-900/20"
                        disabled={isWritePending || isConfirming}
                    >
                        {isWritePending || isConfirming ? "Processing Withdrawal..." : "Confirm & Break Savings"}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isWritePending || isConfirming}
                        className="hover:bg-zinc-800"
                    >
                        Keep it Locked (Recommended)
                    </Button>
                </div>
            </div>
        </div>
    );
}
