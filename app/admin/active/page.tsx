"use client";

import { useEffect, useState, useMemo } from "react";
import { getAllVaults, getAllReceipts, Receipt, SavedVault } from "@/lib/receiptService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Search,
    SearchX,
    ChevronLeft,
    ChevronRight,
    Wallet,
    ExternalLink,
    Lock
} from "lucide-react";
import { usePublicClient } from "wagmi";
import { VAULT_ABI } from "@/lib/contracts";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { useAdminEcosystem } from "../AdminEcosystemContext";
import { DEVNET_SHIP_MINT, DEVNET_USDC_MINT, SAVIQUE_PROGRAM_ID } from "@/lib/solana";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey as SolanaPubkey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

const ITEMS_PER_PAGE = 8;

export default function ActiveSavingsPage() {
    const [vaults, setVaults] = useState<SavedVault[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [vaultBalances, setVaultBalances] = useState<Record<string, number>>({});
    const [vaultExpirations, setVaultExpirations] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const publicClient = usePublicClient();

    const { ecosystem } = useAdminEcosystem();

    useEffect(() => {
        const load = async () => {
            try {
                const [v, r] = await Promise.all([getAllVaults(), getAllReceipts()]);
                setVaults(v);
                setReceipts(r);

                const balances: Record<string, number> = {};
                const expirations: Record<string, number> = {};

                // Flare Loading
                if (publicClient) {
                    const flareVaults = v.filter(v2 => v2.vaultAddress.startsWith('0x'));
                    await Promise.all(flareVaults.map(async (vault) => {
                        try {
                            const [bal, exp] = await Promise.all([
                                publicClient.readContract({
                                    address: vault.vaultAddress as `0x${string}`,
                                    abi: VAULT_ABI,
                                    functionName: 'totalAssets'
                                }),
                                publicClient.readContract({
                                    address: vault.vaultAddress as `0x${string}`,
                                    abi: VAULT_ABI,
                                    functionName: 'unlockTimestamp'
                                })
                            ]);
                            balances[vault.vaultAddress] = parseFloat(formatUnits(bal as bigint, 6));
                            expirations[vault.vaultAddress] = Number(exp) * 1000;
                        } catch (e) { }
                    }));
                }

                // Solana Loading
                const solanaVaults = v.filter(v2 => v2.vaultAddress && !v2.vaultAddress.startsWith('0x'));
                if (solanaVaults.length > 0) {
                    const connection = new Connection("https://api.devnet.solana.com");

                    await Promise.all(solanaVaults.map(async (vault) => {
                        try {
                            // Validate Base58
                            if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(vault.vaultAddress)) {
                                return;
                            }

                            const vaultPubkey = new SolanaPubkey(vault.vaultAddress);
                            const isUsdc = vault.currency === 'USDC';
                            const mint = isUsdc ? DEVNET_USDC_MINT : DEVNET_SHIP_MINT;

                            const vaultTokenAccount = getAssociatedTokenAddressSync(
                                mint,
                                vaultPubkey,
                                true
                            );

                            // Fetch balance and account info separately to handle uninitialized accounts
                            try {
                                const balInfo = await connection.getTokenAccountBalance(vaultTokenAccount);
                                balances[vault.vaultAddress] = balInfo.value.uiAmount || 0;
                            } catch (balErr) {
                                // Likely account hasn't been created yet (no deposits)
                                balances[vault.vaultAddress] = 0;
                            }

                            try {
                                const accountInfo = await connection.getAccountInfo(vaultPubkey);
                                if (accountInfo && accountInfo.data.length >= 176) {
                                    const data = accountInfo.data;
                                    const unlockTimestamp = data.readBigInt64LE(168); // 8 + 32 + 128
                                    expirations[vault.vaultAddress] = Number(unlockTimestamp) * 1000;
                                }
                            } catch (accErr) {
                                console.error(`Vault account info fetch failed for ${vault.vaultAddress}:`, accErr);
                            }
                        } catch (e) {
                            console.error(`Error processing Solana vault ${vault.vaultAddress}:`, e);
                        }
                    }));
                }

                setVaultBalances(balances);
                setVaultExpirations(expirations);
            } catch (e) {
                toast.error("Failed to load active savings");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [publicClient]);

    // Reset pagination on ecosystem change
    useEffect(() => {
        setCurrentPage(1);
    }, [ecosystem]);

    const activeList = useMemo(() => {
        const filteredVaults = ecosystem === 'all' ? vaults :
            ecosystem === 'flare' ? vaults.filter(v => v.vaultAddress.startsWith('0x')) :
                vaults.filter(v => !v.vaultAddress.startsWith('0x'));

        const filteredReceipts = ecosystem === 'all' ? receipts :
            ecosystem === 'flare' ? receipts.filter(r => r.walletAddress.startsWith('0x')) :
                receipts.filter(r => !r.walletAddress.startsWith('0x'));

        return filteredVaults.filter(v => {
            const isClosed = filteredReceipts.some(r => r.vaultAddress === v.vaultAddress && (r.type === 'breaked' || r.type === 'completed'));
            const hasBalance = (vaultBalances[v.vaultAddress] || 0) > 0;
            const matchesSearch = v.vaultAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.owner.toLowerCase().includes(searchQuery.toLowerCase());

            return !isClosed && hasBalance && matchesSearch;
        }).sort((a, b) => (vaultExpirations[a.vaultAddress] || 0) - (vaultExpirations[b.vaultAddress] || 0));
    }, [vaults, receipts, vaultBalances, vaultExpirations, searchQuery, ecosystem]);

    const paginatedActive = activeList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Active Savings</h1>
                    <p className="text-gray-500 text-xs md:text-sm italic">Tracking current on-chain savings commitments</p>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search Savings or users..."
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
                                <th className="px-6 py-4">Savings Purpose</th>
                                <th className="px-6 py-4">User Address</th>
                                <th className="px-6 py-4 text-right">Balance</th>
                                <th className="px-6 py-4 text-right">Lock Expiration</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : paginatedActive.length > 0 ? (
                                paginatedActive.map((vault, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Lock size={12} className="text-red-500" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white">{vault.purpose || "Savings"}</span>
                                                    <span className={`text-[8px] font-bold w-fit mt-1 px-1.5 py-0.5 rounded border ${!vault.vaultAddress.startsWith('0x') ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' : 'border-orange-500/30 text-orange-400 bg-orange-500/10'}`}>
                                                        {!vault.vaultAddress.startsWith('0x') ? 'SOLANA' : 'FLARE'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-400 text-xs truncate max-w-[150px]">{vault.owner}</td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-400">
                                            {vaultBalances[vault.vaultAddress]?.toFixed(2) || "0.00"} <span className="text-[10px] text-gray-500 font-normal">{!vault.vaultAddress.startsWith('0x') ? (vault.currency || 'SHIP') : 'USDT'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-gray-300">{new Date(vaultExpirations[vault.vaultAddress] || 0).toLocaleDateString()}</span>
                                                <span className={`text-[10px] ${new Date() > new Date(vaultExpirations[vault.vaultAddress] || 0) ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                    {new Date() > new Date(vaultExpirations[vault.vaultAddress] || 0) ? 'Matured' : 'Locked'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => window.open(!vault.vaultAddress.startsWith('0x') ? `https://explorer.solana.com/address/${vault.vaultAddress}?cluster=devnet` : `https://coston2-explorer.flare.network/address/${vault.vaultAddress}`, '_blank')}
                                            >
                                                <ExternalLink size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <SearchX className="mx-auto mb-4 opacity-10" size={48} />
                                        <p className="text-gray-500">No active savings found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                        <p className="text-xs text-gray-400">Showing {paginatedActive.length} of {activeList.length} savings</p>
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
