"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt as ReceiptIcon, ExternalLink, CheckCircle, Calendar, Clock, Wallet, Download, FileText, Loader2, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAccount, usePublicClient } from "wagmi";
import { getReceiptsByWallet, Receipt, updateReceipt } from "@/lib/receiptService";
import { toast } from "sonner";
import { proofRailsService, ISORecipt } from "@/lib/proofRailsService";

export default function HistoryPage() {
    const { address: currentAddress, isConnected, isConnecting, isReconnecting } = useAccount();
    const publicClient = usePublicClient();


    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadReceipts = async () => {
            if (!currentAddress) {
                console.log("[History] No current address, clearing receipts");
                setReceipts([]);
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                console.log("[History] Loading receipts from Firestore for:", currentAddress);

                const fetchedReceipts = await getReceiptsByWallet(currentAddress);
                
                // Cross-chain filtering: only show receipts if their vault exists on the current connected chain
                if (publicClient) {
                    const validReceipts = [];
                    for (const receipt of fetchedReceipts) {
                        if (!receipt.vaultAddress || receipt.vaultAddress === "0x") {
                            // If there is no specific vault address, we can't definitively exclude it
                            validReceipts.push(receipt);
                            continue;
                        }
                        
                        try {
                            const bytecode = await publicClient.getBytecode({ address: receipt.vaultAddress as `0x${string}` });
                            if (bytecode && bytecode !== '0x') {
                                validReceipts.push(receipt);
                            }
                        } catch (e) {
                            // If RPC fails intermittently, assume invalid for safety
                            console.warn(`[History] Failed to verify cross-chain vault ${receipt.vaultAddress}`);
                        }
                    }
                    setReceipts(validReceipts);
                    console.log("[History] Filtered cross-chain receipts:", validReceipts.length);
                } else {
                    setReceipts(fetchedReceipts);
                    console.log("[History] Loaded receipts (unfiltered):", fetchedReceipts.length);
                }

            } catch (error) {
                console.error("[History] Error loading receipts:", error);
                // Silently fail - user will see empty state
                setReceipts([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadReceipts();
    }, [currentAddress, publicClient]);

    const viewOnExplorer = (txHash: string) => {
        window.open(`https://coston2-explorer.flare.network/tx/${txHash}`, '_blank');
    };

    const handleSync = async (receipt: Receipt) => {
        if (!receipt.id) return;
        
        try {
            toast.loading("Syncing with ISO Ledger...", { id: `sync-${receipt.id}` });
            
            const prRes = await proofRailsService.recordTransaction({
                amount: receipt.amount,
                currency: "USDT0",
                txHash: receipt.txHash,
                sender: currentAddress!,
                receiver: receipt.vaultAddress || "0x",
                reference: receipt.purpose || "Historical Sync"
            });

            if (prRes && prRes.receipt_id) {
                await updateReceipt(receipt.id, { proofRailsId: prRes.receipt_id });
                
                // Update local state
                setReceipts(prev => prev.map(r => 
                    r.id === receipt.id ? { ...r, proofRailsId: prRes.receipt_id } : r
                ));
                
                toast.success("Transaction Anchored to ISO Ledger", { id: `sync-${receipt.id}` });
            }
        } catch (error) {
            console.error("Sync failed:", error);
            toast.error("Sync failed", { id: `sync-${receipt.id}` });
        }
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
        <div className="space-y-8">
            <div className="flex md:items-center justify-between md:flex-row flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
                    <p className="text-gray-400">View your transaction history on the network</p>
                </div>
            </div>


            {isLoading ? (
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="h-32 animate-pulse bg-white/5 border-transparent">
                            <div className="w-full h-full" />
                        </Card>
                    ))}
                </div>
            ) : receipts.length === 0 ? (
                <Card className="border-dashed border-white/10 bg-transparent flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <ReceiptIcon className="w-10 h-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No Receipts Yet</h3>
                    <p className="text-gray-400 max-w-sm mx-auto">
                        Create your first savings to start generating transaction receipts
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {receipts.map((receipt, index) => (
                        <motion.div
                            key={receipt.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="p-6 bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="flex items-start gap-4">

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-white">{receipt.purpose}</h3>
                                                {/* Tags */}
                                                {receipt.type === 'breaked' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/10 text-red-500 border border-red-500/20">Breaked Early</span>
                                                )}
                                                {receipt.type === 'completed' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-500/10 text-green-400 border border-green-500/20">Withdrawn</span>
                                                )}
                                                {receipt.type === 'created' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-orange-500/10 text-orange-500 border border-blue-500/20">
                                                        {receipt.purpose.toLowerCase().includes('target reached')
                                                            ? 'Goal Reached'
                                                            : (receipt.purpose.toLowerCase().includes('contributed') ? 'Contributed' : 'Initial Deposit')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{new Date(receipt.timestamp).toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <ReceiptIcon className="w-3 h-3" />
                                                    <span className="font-mono text-xs">
                                                        TX: {receipt.txHash.slice(0, 10)}...{receipt.txHash.slice(-8)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:items-end gap-3">
                                        <div className="text-left md:text-right">
                                            <p className="text-xs text-gray-500 mb-1">Amount</p>
                                            <p className="text-lg font-bold text-white">{receipt.amount} USDT0</p>
                                            {receipt.penalty && (
                                                <p className="text-xs text-red-500 font-medium mt-1">
                                                    -{receipt.penalty} Penalty
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {receipt.isoStatus === 'anchored' ? (
                                                <div 
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium cursor-pointer hover:bg-primary/20 transition-all"
                                                    onClick={() => receipt.proofRailsId && window.open(proofRailsService.getReceiptPortalUrl(receipt.proofRailsId), '_blank')}
                                                    title="View Full ISO Documentation Portal"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    ISO 20022 Anchored
                                                </div>
                                            ) : receipt.proofRailsId ? (
                                                <ISOStatusIndicator 
                                                    id={receipt.proofRailsId!} 
                                                    createdAt={receipt.timestamp}
                                                    onAnchored={async (flareTx) => {
                                                        if (!receipt.id) return;
                                                        // Persist to database so we never poll for this again
                                                        await updateReceipt(receipt.id, { 
                                                            isoStatus: 'anchored',
                                                            isoFlareTx: flareTx 
                                                        });
                                                        // Update local state instantly
                                                        setReceipts(prev => prev.map(r => 
                                                            r.id === receipt.id 
                                                                ? { ...r, isoStatus: 'anchored', isoFlareTx: flareTx } 
                                                                : r
                                                        ));
                                                    }}
                                                />
                                            ) : (Date.now() - receipt.timestamp < 24 * 60 * 60 * 1000) ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSync(receipt)}
                                                    className="gap-2 border-primary/20 text-primary hover:bg-primary/10"
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    Retry ISO Sync
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Phase 3 Component: Real-time Status Indicator
 */
function ISOStatusIndicator({ id, createdAt, onAnchored }: { id: string, createdAt: number, onAnchored?: (flareTx: string) => void }) {
    // If it's more than 5 minutes old, don't show the aggressive loading state instantly
    const isOld = Date.now() - createdAt > 5 * 60 * 1000;
    const [status, setStatus] = useState<string>(isOld ? 'checking_silently' : 'pending');
    const [flareTx, setFlareTx] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let pollInterval: NodeJS.Timeout | null = null;

        const checkStatus = async () => {
            const details = await proofRailsService.getReceiptDetails(id);
            if (!isMounted) return;

            if (details) {
                setStatus(details.status);
                if (details.flare_txid) setFlareTx(details.flare_txid);
                
                if (details.status === 'anchored') {
                    if (onAnchored && details.flare_txid) onAnchored(details.flare_txid);
                    if (pollInterval) clearInterval(pollInterval);
                }
                if (details.status === 'failed') {
                    if (pollInterval) clearInterval(pollInterval);
                }
            } else {
                // If it's null, the record does not exist on the middleware anymore.
                setStatus('not_found');
                if (pollInterval) clearInterval(pollInterval);
            }
        };

        // Initial check
        checkStatus();

        // ONLY start polling if the transaction is fresh (less than 5 minutes old)
        // This prevents burning user data on stuck or corrupted transactions from days ago
        if (!isOld) {
            pollInterval = setInterval(checkStatus, 5000);
        }

        return () => {
            isMounted = false;
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [id, isOld]);

    if (status === 'not_found') {
        if (isOld) return null;
        
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium cursor-help" title="Middleware server returned 404 or crashed">
                <XCircle className="w-3.5 h-3.5" />
                ISO Record Not Found
            </div>
        );
    }

    if (status === 'anchored') {
        return (
            <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium cursor-pointer hover:bg-green-500/20 transition-all"
                onClick={() => flareTx && window.open(`https://coston2-explorer.flare.network/tx/${flareTx}`, '_blank')}
                title="View Integrity Anchor on Explorer"
            >
                <CheckCircle2 className="w-3.5 h-3.5" />
                ISO 20022 Anchored
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                <XCircle className="w-3.5 h-3.5" />
                Anchoring Failed
            </div>
        );
    }

    // Do not show the loader if it is an old, stuck transaction. Just hide it cleanly.
    if (status === 'checking_silently' || (isOld && status === 'pending')) {
        return null; 
    }

    // Default to pending visually ONLY for fresh transactions waiting for the first response
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-medium animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Anchoring ISO 20022
        </div>
    );
}
