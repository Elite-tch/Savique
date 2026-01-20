"use client";

import { useState } from "react";
import { X, FileText, FileSpreadsheet, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Receipt } from "@/lib/receiptService";
import { generateStatement, generateStatementCSV, downloadCSV } from "@/lib/statementGenerator";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface StatementExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipts: Receipt[];
    walletAddress: string;
}

export function StatementExportModal({ isOpen, onClose, receipts, walletAddress }: StatementExportModalProps) {
    const [isExporting, setIsExporting] = useState(false);

    // Get unique months with transactions
    const getAvailableMonths = () => {
        const months = new Map<string, { start: Date; end: Date; count: number }>();

        receipts.forEach(receipt => {
            const date = new Date(receipt.timestamp);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!months.has(key)) {
                const year = date.getFullYear();
                const month = date.getMonth();
                months.set(key, {
                    start: new Date(year, month, 1),
                    end: new Date(year, month + 1, 0),
                    count: 1
                });
            } else {
                const existing = months.get(key)!;
                existing.count += 1;
            }
        });

        return Array.from(months.entries())
            .map(([key, value]) => ({ key, ...value }))
            .sort((a, b) => b.start.getTime() - a.start.getTime());
    };

    const [selectedPeriod, setSelectedPeriod] = useState<string>("custom");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    const availableMonths = getAvailableMonths();

    const handleExport = async (format: 'pdf' | 'csv') => {
        let startDate: Date;
        let endDate: Date;
        let filteredReceipts: Receipt[];

        if (selectedPeriod === "all") {
            filteredReceipts = receipts;
            startDate = new Date(Math.min(...receipts.filter(r => r.timestamp).map(r => r.timestamp)));
            endDate = new Date();
        } else if (selectedPeriod === "custom") {
            if (!customStartDate || !customEndDate) {
                toast.error("Please select both start and end dates");
                return;
            }
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);

            filteredReceipts = receipts.filter(r => {
                const receiptDate = new Date(r.timestamp);
                return receiptDate >= startDate && receiptDate <= endDate;
            });
        } else {
            const month = availableMonths.find(m => m.key === selectedPeriod);
            if (!month) return;

            startDate = month.start;
            endDate = month.end;
            filteredReceipts = receipts.filter(r => {
                const receiptDate = new Date(r.timestamp);
                return receiptDate >= startDate && receiptDate <= endDate;
            });
        }

        if (filteredReceipts.length === 0) {
            toast.error("No transactions found in selected period");
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading(`Generating your ${format.toUpperCase()} statement...`);

        try {
            if (format === 'pdf') {
                generateStatement({
                    receipts: filteredReceipts,
                    walletAddress,
                    startDate,
                    endDate
                });
            } else {
                const csv = generateStatementCSV({
                    receipts: filteredReceipts,
                    walletAddress,
                    startDate,
                    endDate
                });
                const filename = `SafeVault-Statement-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`;
                downloadCSV(csv, filename);
            }

            toast.success(`${format.toUpperCase()} statement exported successfully`, { id: toastId });

            // Wait a moment for the user to see success before closing
            setTimeout(() => {
                onClose();
                setIsExporting(false);
            }, 1000);
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to generate statement", { id: toastId });
            setIsExporting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                    >
                        <Card className="w-full max-w-lg bg-zinc-900 border-zinc-800 relative z-10">
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                            <FileText className="w-6 h-6 text-primary" />
                                            Export Statement
                                        </h2>
                                        <p className="text-sm text-gray-400 mt-1">Generate account statement for selected period</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Period Selection */}
                                <div className="space-y-4 mb-6">
                                    <label className="text-sm font-semibold text-white">Select Period</label>

                                    {/* All Time */}
                                    <button
                                        onClick={() => setSelectedPeriod("all")}
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPeriod === "all"
                                            ? 'bg-primary/20 border-primary text-white'
                                            : 'border-white/10 text-gray-400 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="font-medium">All Transactions</div>
                                        <div className="text-xs opacity-70 mt-1">{receipts.length} total transactions</div>
                                    </button>

                                    {/* Monthly Options */}
                                    {availableMonths.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly Statements</p>
                                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                                {availableMonths.map(month => (
                                                    <button
                                                        key={month.key}
                                                        onClick={() => setSelectedPeriod(month.key)}
                                                        className={`w-full p-3 rounded-lg border text-left transition-all ${selectedPeriod === month.key
                                                            ? 'bg-primary/20 border-primary text-white'
                                                            : 'border-white/10 text-gray-400 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium">
                                                                {month.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                            </span>
                                                            <span className="text-xs opacity-70">{month.count} txns</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Custom Range */}
                                    <div
                                        className={`p-4 rounded-xl border-2 transition-all ${selectedPeriod === "custom"
                                            ? 'bg-primary/20 border-primary'
                                            : 'border-white/10'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setSelectedPeriod("custom")}
                                            className="w-full text-left mb-3 focus:outline-none"
                                        >
                                            <div className="font-medium text-white flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Custom Date Range
                                            </div>
                                        </button>

                                        {selectedPeriod === "custom" && (
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">From</label>
                                                    <input
                                                        type="date"
                                                        value={customStartDate}
                                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">To</label>
                                                    <input
                                                        type="date"
                                                        value={customEndDate}
                                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Export Buttons */}
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleExport('pdf')}
                                        disabled={isExporting}
                                        className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                                    >
                                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                        PDF
                                    </Button>
                                    <Button
                                        onClick={() => handleExport('csv')}
                                        disabled={isExporting}
                                        variant="outline"
                                        className="flex-1 gap-2"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                        CSV
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

