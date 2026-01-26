"use client";

import { useEffect, useState, useMemo } from "react";
import { getAllReceipts, Receipt } from "@/lib/receiptService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Search,
    SearchX,
    ChevronLeft,
    ChevronRight,
    XCircle,
    FileText,
    ExternalLink
} from "lucide-react";
import { generateStatement } from "@/lib/statementGenerator";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 8;

export default function BrokenSavingsPage() {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const load = async () => {
            try {
                const r = await getAllReceipts();
                setReceipts(r.filter(item => item.type === 'breaked'));
            } catch (e) {
                toast.error("Failed to load broken savings");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredList = useMemo(() => {
        return receipts.filter(r =>
            r.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.txHash.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => b.timestamp - a.timestamp);
    }, [receipts, searchQuery]);

    const paginatedList = filteredList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);

    const handleExportReceipt = (receipt: Receipt) => {
        const toastId = toast.loading("Preparing verified evidence...");

        const createWithQR = (qrData?: string) => {
            try {
                generateStatement({
                    receipts: [receipt],
                    walletAddress: receipt.walletAddress,
                    startDate: new Date(receipt.timestamp),
                    endDate: new Date(receipt.timestamp),
                    qrImageData: qrData
                });
                toast.success("Evidence PDF generated", { id: toastId });
            } catch (e) {
                toast.error("Failed to generate PDF", { id: toastId });
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
                createWithQR(dataURL);
            };
            img.onerror = () => createWithQR();
        } else {
            createWithQR();
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-red-500">Broken Savings</h1>
                    <p className="text-gray-500 text-xs md:text-sm italic">Audit of early liquidations and penalty revenue</p>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search address or purpose..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-red-600/50 w-full transition-all"
                    />
                </div>
            </header>

            <Card className="bg-black/40 border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-500 uppercase text-[10px] tracking-wider bg-white/5">
                            <tr>
                                <th className="px-6 py-4">Vault Purpose</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4 text-right">Original Amount</th>
                                <th className="px-6 py-4 text-right">Penalty Collected</th>
                                <th className="px-6 py-4 text-right">Evidence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : paginatedList.length > 0 ? (
                                paginatedList.map((receipt, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <XCircle size={12} className="text-red-500" />
                                                <span className="font-medium text-white">{receipt.purpose}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-500 text-xs">{receipt.walletAddress}</td>
                                        <td className="px-6 py-4 text-right font-bold text-white">
                                            {parseFloat(receipt.amount).toFixed(2)} USDT
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-red-500">
                                            -{parseFloat(receipt.penalty || "0").toFixed(2)} USDT
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 text-[10px]">
                                                <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => window.open(`https://coston2-explorer.flare.network/tx/${receipt.txHash}`, '_blank')}>
                                                    <ExternalLink size={12} /> TX
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 gap-1 text-red-400" onClick={() => handleExportReceipt(receipt)}>
                                                    <FileText size={12} /> PDF
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <SearchX className="mx-auto mb-4 opacity-10" size={48} />
                                        <p className="text-gray-500">No broken savings found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                        <p className="text-xs text-gray-400">Showing {paginatedList.length} of {filteredList.length} records</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                <ChevronLeft size={16} />
                            </Button>
                            <div className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
