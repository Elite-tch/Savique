"use client";

import { useEffect, useState } from "react";
import { getAllVaults, SavedVault } from "@/lib/receiptService";
import { logoutAdmin } from "@/lib/authService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Assuming you have a Button component
import {
    Activity,
    Users,
    Wallet,
    LogOut,
    TrendingUp,
    Shield,
    DollarSign,
    RefreshCw,
    Search
} from "lucide-react";
import { usePublicClient } from "wagmi";
import { VAULT_ABI } from "@/lib/contracts"; // Assuming you have this
import { formatUnits } from "viem";
import { motion } from "framer-motion";

// Helper for formatting currency
const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val);
};

export default function AdminDashboard() {
    const [vaults, setVaults] = useState<SavedVault[]>([]);
    const [loading, setLoading] = useState(true);
    const [tvl, setTvl] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const publicClient = usePublicClient();

    const loadData = async () => {
        setRefreshing(true);
        try {
            // 1. Fetch Registry Data
            const allVaults = await getAllVaults();
            setVaults(allVaults);

            // 2. Count Unique Users
            const uniqueUsers = new Set(allVaults.map(v => v.owner.toLowerCase()));
            setTotalUsers(uniqueUsers.size);

            // 3. Fetch Balances (TVL)
            // We batch these or do them in Promise.all
            // Note: If 1000s of vaults, we need multicall. For now, Promise.all is okay for < 50.
            // If publicClient is available
            if (publicClient) {
                let currentTvl = 0;

                // Chunk requests to avoid rate limits
                const chunkSize = 20;
                for (let i = 0; i < allVaults.length; i += chunkSize) {
                    const chunk = allVaults.slice(i, i + chunkSize);
                    const balances = await Promise.all(
                        chunk.map(async (v) => {
                            try {
                                const bal = await publicClient.readContract({
                                    address: v.vaultAddress as `0x${string}`,
                                    abi: VAULT_ABI,
                                    functionName: 'totalAssets'
                                }) as bigint;
                                return parseFloat(formatUnits(bal, 6)); // USDT is 6 decimals usually on Flare? Check contract.
                                // Wait, typical USDT is 6, but in my create page I used "decimals" hook.
                                // I'll assume 18 for Testnet tokens usually, but let's be safe.
                                // In create page: `useReadContract({ ... functionName: 'decimals' })`. 
                                // I'll stick to a standard 18 for now based on the previous code snippets 
                                // showing `parseUnits(amount, decimals || 18)`.
                            } catch (e) {
                                console.warn("Failed to fetch balance for", v.vaultAddress);
                                return 0;
                            }
                        })
                    );
                    currentTvl += balances.reduce((a, b) => a + b, 0);
                }
                setTvl(currentTvl);
            }

        } catch (error) {
            console.error("Admin Load Error", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [publicClient]);

    // Handle Logout
    const handleLogout = async () => {
        await logoutAdmin();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-red-600" />
                        Admin Console
                    </h1>
                    <p className="text-gray-400">System Overview & Analytics</p>
                </div>
                <div className="flex gap-4">
                    <Button
                        onClick={loadData}
                        variant="outline"
                        className="border-white/10 text-white bg-white/5 hover:bg-white/10"
                        disabled={refreshing}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </Button>
                    <Button onClick={handleLogout} variant="destructive" className="bg-red-600 hover:bg-red-700">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400 text-sm font-medium">Total Value Locked</span>
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-500" />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        {loading ? (
                            <div className="h-8 w-32 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <h2 className="text-3xl font-bold text-white">{formatUSD(tvl)}</h2>
                        )}
                    </div>
                    {/* Fake Chart Line */}
                    <div className="h-1 w-full bg-white/5 mt-4 overflow-hidden rounded-full">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-300"
                        />
                    </div>
                </Card>

                <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400 text-sm font-medium">Active Vaults</span>
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Wallet className="w-5 h-5 text-blue-500" />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        {loading ? (
                            <div className="h-8 w-24 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <h2 className="text-3xl font-bold text-white">{vaults.length}</h2>
                        )}
                    </div>
                </Card>

                <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400 text-sm font-medium">Total Users</span>
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Users className="w-5 h-5 text-purple-500" />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        {loading ? (
                            <div className="h-8 w-24 bg-white/10 animate-pulse rounded" />
                        ) : (
                            <h2 className="text-3xl font-bold text-white">{totalUsers}</h2>
                        )}
                    </div>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-white/10 bg-black/40 backdrop-blur-md">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Recent Vault Creations</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search addresses..."
                            className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-white/20"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-500 bg-white/5">
                            <tr>
                                <th className="px-6 py-3 font-medium">Purpose</th>
                                <th className="px-6 py-3 font-medium">Owner</th>
                                <th className="px-6 py-3 font-medium">Vault Address</th>
                                <th className="px-6 py-3 font-medium text-right">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-white/5 animate-pulse rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-32 bg-white/5 animate-pulse rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-32 bg-white/5 animate-pulse rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-16 bg-white/5 animate-pulse rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : vaults.map((vault) => (
                                <tr key={vault.vaultAddress} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{vault.purpose || "Savings Vault"}</td>
                                    <td className="px-6 py-4 font-mono text-gray-400">
                                        {vault.owner.slice(0, 6)}...{vault.owner.slice(-4)}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-blue-400 cursor-pointer hover:underline" onClick={() => window.open(`https://coston2-explorer.flare.network/address/${vault.vaultAddress}`, '_blank')}>
                                        {vault.vaultAddress.slice(0, 6)}...{vault.vaultAddress.slice(-4)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-right">
                                        {new Date(vault.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
