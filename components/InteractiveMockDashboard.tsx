"use client";

import { motion } from "framer-motion";
import { Wallet, Shield, TrendingUp, Lock, Plus, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function InteractiveMockDashboard() {
    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="glass rounded-[2.5rem] border border-white/10 bg-zinc-900/40 backdrop-blur-3xl overflow-hidden shadow-2xl shadow-primary/5 p-4 md:p-8">
                {/* Dashboard Header Simulation */}
                <div className="flex justify-between items-center mb-8 px-2">
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white">Dashboard Overview</h3>
                        <p className="text-sm text-gray-500">Real-time status of your Savique protocol assets.</p>
                    </div>
                    <div className="bg-primary/20 text-primary px-4 py-2 rounded-full text-xs font-bold border border-primary/20 hidden md:block">
                        Active Node: Flare Coston2
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4">
                    <MockStatCard
                        label="USDT0 Balance"
                        value="12,450.00"
                        icon={Wallet}
                        color="text-green-400"
                        delay={0.1}
                        className="hidden md:block"
                    />
                    <MockStatCard
                        label="Active Savings"
                        value="3"
                        icon={Lock}
                        color="text-primary"
                        delay={0.2}
                        className="block"
                    />
                    <MockStatCard
                        label="Total Locked"
                        value="$ 25,800.00"
                        icon={TrendingUp}
                        color="text-purple-400"
                        delay={0.3}
                        className="hidden md:block"
                    />
                </div>

                {/* Recent Vaults Simulation */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h4 className="text-lg font-bold text-white">Active Personal Savings</h4>
                        <div className="text-sm text-primary font-medium flex items-center gap-1 cursor-pointer">
                            View All <ArrowRight className="w-3 h-3" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <MockVaultCard
                            purpose="Property Deposit"
                            balance="15,000.00"
                            target="50,000.00"
                            progress={30}
                            daysLeft={182}
                            status="Locked"
                            delay={0.4}
                        />
                        <MockVaultCard
                            purpose="Emergency Fund"
                            balance="5,400.00"
                            target="10,000.00"
                            progress={54}
                            daysLeft={45}
                            status="Locked"
                            delay={0.5}
                            className="hidden md:block"
                        />
                        <MockVaultCard
                            purpose="Holiday Fund"
                            balance="2,100.00"
                            target="2,000.00"
                            progress={100}
                            daysLeft={0}
                            status="Unlocked"
                            delay={0.6}
                            className="hidden md:block"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

function MockStatCard({ label, value, icon: Icon, color, delay, className = "" }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            className={`bg-zinc-900/60 p-6 rounded-3xl border border-white/5 relative overflow-hidden group ${className}`}
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-8 -mt-8" />
            <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl bg-black/40 ${color} border border-white/5`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">
                    {label.includes("Locked") || label.includes("Balance") ? "" : ""}{value}
                    {label.includes("USDT") ? <span className="text-xs text-gray-500 ml-2 font-normal">USDT0</span> : ""}
                    {label.includes("Locked") ? <span className="text-xs text-gray-500 ml-2 font-normal">USD</span> : ""}
                </div>
            </div>
        </motion.div>
    );
}

function MockVaultCard({ purpose, balance, target, progress, daysLeft, status, delay, className = "" }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay }}
            className={`bg-zinc-900/40 p-6 rounded-3xl border border-white/5 border-zinc-800/50  transition-all relative group ${className}`}
        >
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                    <h5 className="text-white font-bold">{purpose}</h5>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Shield className="w-3 h-3" /> Non-Custodial
                    </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === 'Unlocked' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    }`}>
                    {status}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Current Balance</p>
                        <p className="text-lg font-bold text-white">${balance}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Target</p>
                        <p className="text-sm font-medium text-gray-300">${target}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
                        <span className="text-gray-500">Goal Progress</span>
                        <span className="text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-white/5" />
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                    <span className="text-gray-500">Maturity Timeline:</span>
                    <span className="text-white font-medium">{status === 'Unlocked' ? 'Matured' : `${daysLeft} days remaining`}</span>
                </div>
            </div>
        </motion.div>
    );
}
