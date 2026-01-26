"use client";

import { useEffect, useState, useMemo } from "react";
import { getAllVaults, getAllReceipts, Receipt, SavedVault } from "@/lib/receiptService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Search,
    SearchX,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

export default function UsersPage() {
    const [vaults, setVaults] = useState<SavedVault[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const load = async () => {
            try {
                const [v, r] = await Promise.all([getAllVaults(), getAllReceipts()]);
                setVaults(v);
                setReceipts(r);
            } catch (e) {
                toast.error("Failed to load users");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const usersList = useMemo(() => {
        const usersMap = new Map();
        vaults.forEach(v => {
            const addr = v.owner.toLowerCase();
            if (!usersMap.has(addr)) {
                const userReceipts = receipts.filter(r => r.walletAddress.toLowerCase() === addr);
                usersMap.set(addr, {
                    address: v.owner,
                    vaultCount: vaults.filter(v2 => v2.owner.toLowerCase() === addr).length,
                    totalSaved: userReceipts.filter(r => r.type === 'created').reduce((acc, r) => acc + parseFloat(r.amount), 0),
                    lastActive: v.createdAt
                });
            }
        });
        return Array.from(usersMap.values())
            .filter(u => u.address.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.totalSaved - a.totalSaved);
    }, [vaults, receipts, searchQuery]);

    const paginatedUsers = usersList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(usersList.length / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">User Directory</h1>
                    <p className="text-gray-500 text-xs md:text-sm italic">Listing all participating wallet addresses</p>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search address..."
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
                                <th className="px-6 py-4">User Wallet Address</th>
                                <th className="px-6 py-4">Vaults Created</th>
                                <th className="px-6 py-4 text-right">Total Committed (USDT)</th>
                                <th className="px-6 py-4 text-right">Registered On</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-gray-400">{user.address}</td>
                                        <td className="px-6 py-4">{user.vaultCount}</td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-500">{user.totalSaved.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right text-gray-500">{new Date(user.lastActive).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <SearchX className="mx-auto mb-4 opacity-10" size={48} />
                                        <p className="text-gray-500">No users found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                        <p className="text-xs text-gray-400">Showing {paginatedUsers.length} of {usersList.length} users</p>
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
