"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt as ReceiptIcon, ExternalLink, CheckCircle, Calendar, Clock, Wallet, Download, FileText, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { getReceiptsByWallet, Receipt } from "@/lib/receiptService";
import { StatementExportModal } from "@/components/StatementExportModal";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

export default function HistoryPage() {
    const { address: currentAddress, isConnected, isConnecting, isReconnecting } = useAccount();


    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingReceiptId, setIsGeneratingReceiptId] = useState<string | null>(null);
    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

    const generatePDF = (receipt: Receipt) => {
        setIsGeneratingReceiptId(receipt.id || null);
        const toastId = toast.loading("Preparing your receipt...");

        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const primaryColor = "#F97316"; // Orange-500
        const darkColor = "#18181B"; // Zinc-900
        const lightColor = "#71717A"; // Zinc-400

        const createPDF = (qrImageData?: string) => {
            try {
                // Background / Border
                doc.setDrawColor(228, 228, 231); // Border color
                doc.rect(5, 5, 200, 287);

                // Header
                doc.setFillColor(darkColor);
                doc.rect(5, 5, 200, 40, "F");

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(24);
                doc.setFont("helvetica", "bold");
                doc.text("Safira", 15, 22);

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text("DECENTRALIZED SAVINGS RECEIPT", 15, 32);

                doc.setFontSize(12);
                doc.text(`ID: ${receipt.id?.slice(0, 8).toUpperCase()}`, 160, 22);

                // Content Starts
                let y = 60;
                doc.setTextColor(darkColor);
                doc.setFontSize(18);
                doc.text(receipt.purpose || "Saving Transaction", 15, y);
                y += 10;

                // Divider
                doc.setDrawColor(primaryColor);
                doc.setLineWidth(1);
                doc.line(15, y, 60, y);
                y += 15;

                // Details Grid
                doc.setFontSize(10);
                doc.setTextColor(lightColor);
                doc.text("TYPE", 15, y);
                doc.text("TIMESTAMP", 70, y);
                doc.text("STATUS", 150, y);

                y += 7;
                doc.setFontSize(12);
                doc.setTextColor(darkColor);
                doc.text(receipt.type.toUpperCase(), 15, y);
                doc.text(new Date(receipt.timestamp).toLocaleString(), 70, y);
                doc.text(receipt.verified ? "VERIFIED" : "PENDING", 150, y);

                y += 20;
                doc.setFontSize(10);
                doc.setTextColor(lightColor);
                doc.text("AMOUNT", 15, y);
                if (receipt.penalty) doc.text("PENALTY APPLIED", 70, y);

                y += 7;
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(primaryColor);
                doc.text(`${receipt.amount} USDT0`, 15, y);
                if (receipt.penalty) {
                    doc.setTextColor("#EF4444"); // Red-500
                    doc.text(`${receipt.penalty} USDT0`, 70, y);
                }

                y += 25;
                // Blockchain Info Card
                doc.setFillColor(244, 244, 245); // Zinc-100
                doc.rect(15, y - 5, 180, 45, "F");

                doc.setFontSize(10);
                doc.setTextColor(lightColor);
                doc.text("BLOCKCHAIN PROOF", 22, y + 5);

                doc.setFontSize(9);
                doc.setFont("courier", "normal");
                doc.setTextColor(darkColor);
                doc.text(`WALLET: ${receipt.walletAddress}`, 22, y + 15);
                const truncatedHash = receipt.txHash.length > 50 ? receipt.txHash.slice(0, 50) + "..." : receipt.txHash;
                doc.text(`TX HASH: ${truncatedHash}`, 22, y + 25);
                doc.text(`NETWORK: Flare Coston2`, 22, y + 35);

                y += 60;
                // ProofRails Section
                if (receipt.proofRailsId) {
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(12);
                    doc.setTextColor(darkColor);
                    doc.text("ProofRails Verification", 15, y);

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9);
                    doc.setTextColor(lightColor);
                    doc.text(`Receipt ID: ${receipt.proofRailsId}`, 15, y + 7);

                    if (qrImageData) {
                        doc.addImage(qrImageData, "PNG", 150, y - 5, 35, 35);
                    }

                    doc.setTextColor(primaryColor);
                    doc.text("Scan to verify on-chain authenticity", 15, y + 15);
                }

                // Footer
                doc.setFontSize(8);
                doc.setTextColor(lightColor);
                doc.text("This receipt is cryptographically generated and verified by the ProofRails protocol.", 105, 280, { align: "center" });
                doc.text("Visit safira.app for more info.", 105, 285, { align: "center" });

                doc.save(`Safira-Receipt-${receipt.id?.slice(0, 8)}.pdf`);
                toast.success("Receipt downloaded!", { id: toastId });
            } catch (error) {
                console.error("PDF generation failed", error);
                toast.error("Generation failed", { id: toastId });
            } finally {
                setIsGeneratingReceiptId(null);
            }
        };

        if (receipt.proofRailsId) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://proofrails-clone-middleware.onrender.com/receipt/${receipt.proofRailsId}`;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL("image/png");
                createPDF(dataURL);
            };
            img.onerror = () => {
                console.warn("QR loader error");
                createPDF();
            };
        } else {
            createPDF();
        }
    };

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
                setReceipts(fetchedReceipts);

                console.log("[History] Loaded receipts:", fetchedReceipts.length);
            } catch (error) {
                console.error("[History] Error loading receipts:", error);
                // Silently fail - user will see empty state
                setReceipts([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadReceipts();
    }, [currentAddress]);

    const viewOnExplorer = (txHash: string) => {
        window.open(`https://coston2-explorer.flare.network/tx/${txHash}`, '_blank');
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
            <div className="flex items-center justify-between md:flex-row flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
                    <p className="text-gray-400">View your ProofRails verified transaction receipts</p>
                </div>

                {receipts.length > 0 && (
                    <Button
                        onClick={() => setIsStatementModalOpen(true)}
                        className="gap-2 bg-primary hover:bg-primary/90 w-fit md:w-auto"
                    >
                        <FileText className="w-4 h-4" />
                        Export Statement
                    </Button>
                )}
            </div>

            {/* Statement Export Modal */}
            {currentAddress && (
                <StatementExportModal
                    isOpen={isStatementModalOpen}
                    onClose={() => setIsStatementModalOpen(false)}
                    receipts={receipts}
                    walletAddress={currentAddress}
                />
            )}

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
                        Create your first savings to start generating verified ProofRails receipts
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
                            <Card className="p-6 hover:border-primary/50 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="flex items-start gap-4">

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-white">{receipt.purpose}</h3>
                                                {/* Tags */}
                                                {receipt.type === 'breaked' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/10 text-red-500 border border-red-500/20">Breaked</span>
                                                )}
                                                {receipt.type === 'completed' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-500/10 text-green-500 border border-green-500/20">Completed</span>
                                                )}
                                                {receipt.type === 'created' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-orange-500/10 text-orange-500 border border-blue-500/20">Created</span>
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
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => viewOnExplorer(receipt.txHash)}
                                                className="gap-2"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Explorer
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => generatePDF(receipt)}
                                                disabled={isGeneratingReceiptId === receipt.id}
                                                className="gap-2 text-zinc-400 hover:text-white"
                                            >
                                                {isGeneratingReceiptId === receipt.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Download className="w-3 h-3" />
                                                )}
                                                PDF
                                            </Button>

                                            {receipt.verified && receipt.proofRailsId ? (
                                                <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md flex items-center gap-2">
                                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                                    <button
                                                        onClick={() => window.open(`https://proofrails-clone-middleware.onrender.com/receipt/${receipt.proofRailsId}`, '_blank')}
                                                        className="text-xs cursor-pointer text-green-400 font-medium bg-transparent hover:underline">ProofRails Verified </button>
                                                </div>
                                            ) : (
                                                <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-md flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-orange-400" />
                                                    <span className="text-xs text-orange-400 font-medium">Pending</span>
                                                </div>
                                            )}
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
