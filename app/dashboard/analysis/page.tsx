"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Wallet,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Download,
    FileText,
    PieChart as PieChartIcon,
    ChevronRight,
    Search,
    Filter,
    X,
    LayoutGrid,
    Activity,
    Shield,
    Zap,
    Rocket,
    Clock,
    Flame,
    Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { getReceiptsByWallet, Receipt } from "@/lib/receiptService";
import { generateStatement } from "@/lib/statementGenerator";
import { toast } from "sonner";

// Recharts for Visualization
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';

const COLORS = ['#E62058', '#22C55E', '#F97316', '#3B82F6'];

export default function AnalysisPage() {
    const { address: currentAddress, isConnected } = useAccount();

    // Data State
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter State
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [timeframe, setTimeframe] = useState<number>(30); // days

    useEffect(() => {
        const loadHistory = async () => {
            if (!currentAddress) return;
            try {
                setIsLoading(true);
                const fetched = await getReceiptsByWallet(currentAddress);
                setReceipts(fetched);
            } catch (error) {
                console.error("Failed to load analysis data", error);
                toast.error("Failed to load data");
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [currentAddress]);

    // Computed Filtered Data
    const filteredReceipts = useMemo(() => {
        return receipts.filter(r => {
            const matchesType = typeFilter === "all" || r.type === typeFilter;
            const matchesSearch = r.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.txHash.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesType && matchesSearch;
        });
    }, [receipts, typeFilter, searchQuery]);

    // Financial Analysis Logic
    const stats = useMemo(() => {
        let totalSaved = 0;
        let totalWithdrawn = 0;
        let totalPenalties = 0;

        receipts.forEach(r => {
            const amt = parseFloat(r.amount);
            if (r.type === 'created') {
                totalSaved += amt;
            } else if (r.type === 'completed' || r.type === 'breaked') {
                totalWithdrawn += amt;
                if (r.penalty) totalPenalties += parseFloat(r.penalty);
            }
        });

        const activeBalance = totalSaved - totalWithdrawn - totalPenalties;
        return { totalSaved, totalWithdrawn, totalPenalties, activeBalance };
    }, [receipts]);

    // Chart Data Generation
    const chartData = useMemo(() => {
        const groups: Record<string, { name: string, saved: number, withdrawn: number, balance: number }> = {};
        const sorted = [...receipts].sort((a, b) => a.timestamp - b.timestamp);

        let runningBalance = 0;

        sorted.forEach(r => {
            const date = new Date(r.timestamp);
            const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const amt = parseFloat(r.amount);
            const penalty = r.penalty ? parseFloat(r.penalty) : 0;

            if (r.type === 'created') {
                runningBalance += amt;
            } else {
                runningBalance -= (amt + penalty);
            }

            groups[key] = {
                name: key,
                saved: (groups[key]?.saved || 0) + (r.type === 'created' ? amt : 0),
                withdrawn: (groups[key]?.withdrawn || 0) + (r.type !== 'created' ? amt : 0),
                balance: runningBalance
            };
        });

        return Object.values(groups).slice(-timeframe);
    }, [receipts, timeframe]);

    const pieData = useMemo(() => [
        { name: 'Created', value: receipts.filter(r => r.type === 'created').length },
        { name: 'Completed', value: receipts.filter(r => r.type === 'completed').length },
        { name: 'Breaked', value: receipts.filter(r => r.type === 'breaked').length },
    ], [receipts]);

    const resilienceScore = useMemo(() => {
        const completed = receipts.filter(r => r.type === 'completed').length;
        const broken = receipts.filter(r => r.type === 'breaked').length;
        if (completed + broken === 0) return 0;
        return Math.round((completed / (completed + broken)) * 100);
    }, [receipts]);

    // Mocked Projection Data
    const projectionData = useMemo(() => {
        const base = stats.activeBalance || 1000;
        // Visualizing a 1% cumulative bonus (representing 10% share of a ~10% yield)
        return [
            { name: 'Start', principal: base, total: base },
            { name: '3 Months', principal: base, total: base * 1.0025 },
            { name: '6 Months', principal: base, total: base * 1.0050 },
            { name: '9 Months', principal: base, total: base * 1.0075 },
            { name: '1 Year', principal: base, total: base * 1.0100 }
        ];
    }, [stats.activeBalance]);

    const quickExport = (period: number) => {
        const start = new Date();
        start.setDate(start.getDate() - period);
        const filtered = receipts.filter(r => new Date(r.timestamp) >= start);

        if (filtered.length === 0) {
            toast.error("No transactions in this period");
            return;
        }

        generateStatement({
            receipts: filtered,
            walletAddress: currentAddress || "",
            startDate: start,
            endDate: new Date()
        });
        toast.success("Statement exported!");
    };

    if (!isConnected) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="p-12 text-center max-w-md bg-white/5 border-zinc-800">
                    <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-400">Unlock your financial insights with ProofRails verification.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header & Main Stats */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <Activity className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Commitment Logic</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Savings Performance</h1>
                    <p className="text-gray-400 mt-2 max-w-lg">
                        Track your discipline history and visualize the success rewards earned for meeting your commitments.
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                    {[7, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setTimeframe(d)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${timeframe === d ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            {d}D
                        </button>
                    ))}
                </div>
            </div>



            {/* Main Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Balance Trend Chart */}
                <Card className="lg:col-span-2 p-8 bg-zinc-900/50 border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10" />
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white">Wealth Trajectory</h3>
                            <p className="text-xs text-gray-500 mt-1">Growth of your locked assets over time</p>
                        </div>
                        <div className="flex gap-4 text-[10px] font-bold uppercase text-gray-500">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Net Balance</div>
                        </div>
                    </div>

                    <div className="h-[350px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#E62058" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#E62058" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="name"
                                    stroke="#3f3f46"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#3f3f46"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#E62058"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorBal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Distribution & Type Summary */}
                <Card className="p-8 bg-zinc-900/50 border-white/5 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2">Audit Distribution</h3>
                    <p className="text-xs text-gray-500 mb-8">ProofRails event classification</p>

                    <div className="h-[250px] w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-3 mt-8">
                        {pieData.map((d, i) => (
                            <div key={d.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                    <span className="text-xs font-bold text-gray-300">{d.name}</span>
                                </div>
                                <span className="text-xs font-bold text-white">{receipts.length > 0 ? ((d.value / receipts.length) * 100).toFixed(0) : 0}%</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* NEW: Future Wealth Projection (Mockup for Dev Rel Feedback) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-8 bg-zinc-900/50 border-white/5 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 blur-[80px] group-hover:bg-orange-500/20 transition-all rounded-full" />
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Rocket className="w-4 h-4 text-orange-500" />
                                <h3 className="text-xl font-bold text-white">Success Bonus Projection</h3>
                            </div>
                            <p className="text-xs text-gray-500 italic">Projected rewards for disciplined completion</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-orange-500">Bonus</span>
                            <span className="text-[10px] text-gray-600">Accrual</span>
                        </div>
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FB923C" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FB923C" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                                    formatter={(value: number | undefined) => value ? [`$${value.toFixed(2)}`, ''] : ['', '']}
                                />
                                <Area type="monotone" dataKey="total" stroke="#FB923C" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                <Area type="monotone" dataKey="principal" stroke="#3f3f46" strokeDasharray="5 5" fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                        <p className="text-xs text-gray-400 text-center">
                            By completing your savings goals, you earn a <span className="text-white font-bold">10% share of generated rewards</span>. This chart visualizes your potential bonus growth through discipline.
                        </p>
                    </div>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="p-6 bg-zinc-900/50 border-white/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <Flame className="w-6 h-6 text-red-500" />
                            <span className="text-[10px] font-bold text-gray-500 border border-white/10 px-2 py-1 rounded-full uppercase">Streak</span>
                        </div>
                        <div>
                            <h4 className="text-gray-400 text-sm">Saving Streak</h4>
                            <p className="text-3xl font-black text-white">12 Days</p>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-2">Next reward milestone in 18 days</p>
                    </Card>

                    <Card className="p-6 bg-zinc-900/50 border-white/5 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <Zap className="w-6 h-6 text-yellow-500" />
                            <span className="text-[10px] font-bold text-gray-500 border border-white/10 px-2 py-1 rounded-full uppercase">Score</span>
                        </div>
                        <div>
                            <h4 className="text-gray-400 text-sm">Resilience Score</h4>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-black text-white">{resilienceScore}%</p>
                                <span className={`text-[10px] font-bold ${resilienceScore > 80 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                    {resilienceScore > 80 ? 'EXCELLENT' : 'IMPROVING'}
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-2">Based on completed vs broken goals</p>
                    </Card>

                    <div className="col-span-1 sm:col-span-2 p-6 bg-gradient-to-r from-primary/10 to-transparent border-white/5 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all" onClick={() => window.location.href = '/dashboard/tips'}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Lightbulb className="text-primary" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white">Explore Savings Tips</h4>
                                <p className="text-xs text-gray-400">Learn budgeting strategies and find earning opportunities</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-white/5 hover:bg-white/10"
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                </div>
            </div>



        </div>
    );
}




