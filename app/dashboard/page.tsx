"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lock, Wallet, TrendingUp } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";

export default function Dashboard() {
    const { address, isConnected } = useAccount();

    const { data: balance, isError, isLoading } = useBalance({
        address: address,
    });

    const formattedBalance = balance
        ? parseFloat(formatEther(balance.value)).toFixed(4)
        : "0.00";

    const stats = [
        {
            label: "C2FLR Balance",
            value: isLoading ? "Loading..." : isError ? "Error" : `${formattedBalance} C2FLR`,
            icon: Wallet,
            color: "text-green-400"
        },
        {
            label: "Active Vaults",
            value: "0",
            icon: Lock,
            color: "text-blue-400"
        },
        {
            label: "Total Locked",
            value: "$0.00",
            icon: TrendingUp,
            color: "text-purple-400"
        },
    ];

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

    return (
        <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="relative overflow-hidden bg-white/5 border-white/10">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
                                <div className="relative p-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-lg bg-black/40 ${stat.color}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <p className="text-sm text-gray-400">{stat.label}</p>
                                    </div>
                                    <h2 className="text-3xl font-bold text-white">{stat.value}</h2>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Action Row */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Recent Vaults</h2>
                <div className="flex gap-4 items-center">
                    <Link href="/dashboard/vaults">
                        <Button variant="ghost" className="text-gray-400 hover:text-white">
                            View All
                        </Button>
                    </Link>
                    <Link href="/dashboard/create">
                        <Button className="gap-2 bg-primary text-white hover:bg-primary/90">
                            <Plus className="w-4 h-4" /> Create New Vault
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Vaults Grid (Empty State) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-dashed border-white/10 bg-transparent flex flex-col items-center justify-center p-12 text-center col-span-full h-64">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white">No Active Vaults</h3>
                    <p className="text-gray-400 mb-6 max-w-sm">
                        You haven't created any savings plans yet. Start by creating a personal or group vault.
                    </p>
                    <Link href="/dashboard/create">
                        <Button variant="outline" className="border-white/20 hover:bg-white/10">Get Started</Button>
                    </Link>
                </Card>
            </div>
        </div>
    );
}
