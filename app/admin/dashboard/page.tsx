"use client";

import { useEffect, useState, useMemo } from "react";
import { getAllVaults, SavedVault, getAllReceipts, Receipt } from "@/lib/receiptService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Wallet,
    TrendingUp,
    DollarSign,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Activity,
    FileText,
    ExternalLink
} from "lucide-react";
import { usePublicClient } from "wagmi";
import { VAULT_ABI } from "@/lib/contracts";
import { formatUnits } from "viem";
import { motion } from "framer-motion";
import { generateStatement } from "@/lib/statementGenerator";
import { toast } from "sonner";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(val);
};

export default function AdminDashboard() {
    const [vaults, setVaults] = useState<SavedVault[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [tvl, setTvl] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const publicClient = usePublicClient();

    const loadData = async () => {
        setRefreshing(true);
        try {
            const [allVaults, allReceipts] = await Promise.all([
                getAllVaults(),
                getAllReceipts()
            ]);

            setVaults(allVaults);
            setReceipts(allReceipts);

            if (publicClient) {
                let currentTvl = 0;
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
                                return parseFloat(formatUnits(bal, 6));
                            } catch (e) {
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

    const activeVaults = vaults.filter(v => {
        const isClosed = receipts.some(r => r.vaultAddress === v.vaultAddress && (r.type === 'breaked' || r.type === 'completed'));
        return !isClosed;
    });

    const stats = {
        tvl: tvl,
        users: new Set(vaults.map(v => v.owner.toLowerCase())).size,
        active: activeVaults.length,
        broken: receipts.filter(r => r.type === 'breaked').length,
        completed: receipts.filter(r => r.type === 'completed').length,
        revenue: receipts.filter(r => r.type === 'breaked').reduce((acc, r) => acc + parseFloat(r.penalty || "0"), 0),
        cumulative: receipts.filter(r => r.type === 'created').reduce((acc, r) => acc + parseFloat(r.amount), 0)
    };

    // Prepare chart data for last 7 days
    const chartData = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const dayReceipts = receipts.filter(r => {
                const rDate = new Date(r.timestamp);
                return rDate.toDateString() === date.toDateString();
            });

            const deposits = dayReceipts
                .filter(r => r.type === 'created')
                .reduce((a, b) => a + parseFloat(b.amount), 0);

            const withdrawals = dayReceipts
                .filter(r => r.type === 'breaked' || r.type === 'completed')
                .reduce((a, b) => a + parseFloat(b.amount), 0);

            days.push({
                name: dateStr,
                deposits,
                withdrawals
            });
        }
        return days;
    }, [receipts]);
    const handleExportReceipt = (receipt: Receipt) => {
        const toastId = toast.loading("Preparing verified receipt...");

        const createWithQR = (qrData?: string) => {
            try {
                generateStatement({
                    receipts: [receipt],
                    walletAddress: receipt.walletAddress,
                    startDate: new Date(receipt.timestamp),
                    endDate: new Date(receipt.timestamp),
                    qrImageData: qrData
                });
                toast.success("Receipt generated", { id: toastId });
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
        <div className="space-y-6 md:space-y-10">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">System Performance</h1>
                    <p className="text-gray-500 text-xs md:text-sm italic">Real-time surveillance of Savique protocol states</p>
                </div>

                <Button onClick={loadData} variant="outline" className="border-white/5 bg-white/5 w-full sm:w-auto" disabled={refreshing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Sync Data
                </Button>
            </header>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPICard title="Cumulative Volume" value={formatUSD(stats.cumulative)} icon={<Wallet className="text-blue-500" />} />
                <KPICard title="Protocol TVL" value={formatUSD(stats.tvl)} icon={<DollarSign className="text-green-500" />} />
                <KPICard title="Penalty Revenue" value={formatUSD(stats.revenue)} icon={<TrendingUp className="text-red-500" />} />
                <KPICard title="Total Users" value={stats.users.toString()} icon={<Users className="text-blue-400" />} />
                <KPICard title="Active Vaults" value={stats.active.toString()} icon={<Clock className="text-orange-500" />} />
                <KPICard title="Successful Goals" value={stats.completed.toString()} icon={<CheckCircle2 className="text-emerald-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Activity Feed */}
                <Card className="p-6 bg-black/40 border-white/5 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-red-500" />
                            <h3 className="font-bold text-lg">Live Protocol Activity</h3>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                        {receipts.length > 0 ? (
                            receipts.slice(0, 10).map((r, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${r.type === 'breaked' ? 'bg-red-500/10 text-red-500' : r.type === 'created' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            {r.type === 'breaked' ? <XCircle size={18} /> : r.type === 'created' ? <Activity size={18} /> : <CheckCircle2 size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{r.purpose}</p>
                                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{r.walletAddress.slice(0, 8)}...{r.walletAddress.slice(-6)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right mr-4">
                                            <p className="text-sm font-bold text-white">{parseFloat(r.amount).toFixed(2)} USDT</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{new Date(r.timestamp).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 hover:bg-white/10"
                                                onClick={() => window.open(`https://coston2-explorer.flare.network/tx/${r.txHash}`, '_blank')}
                                                title="View Transaction"
                                            >
                                                <ExternalLink size={12} className="text-blue-400" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 hover:bg-white/10"
                                                onClick={() => handleExportReceipt(r)}
                                                title="Download Receipt"
                                            >
                                                <FileText size={12} className="text-emerald-400" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500">No activity recorded yet</div>
                        )}
                    </div>
                </Card>

                {/* Performance Chart */}
                <Card className="p-6 bg-black/40 border-white/5 backdrop-blur-md flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            <h3 className="font-bold text-lg">Protocol Velocity</h3>
                        </div>
                        <div className="flex items-center gap-4 text-[10px]">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> <span className="text-gray-400">Deposits</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> <span className="text-gray-400">Withdrawals</span></div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ padding: '2px 0' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="deposits"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorDeposits)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="withdrawals"
                                    stroke="#ef4444"
                                    fillOpacity={1}
                                    fill="url(#colorWithdrawals)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}


function KPICard({ title, value, icon, loading }: any) {
    return (
        <Card className="p-5 bg-black/40 border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                {icon}
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{title}</span>
                {loading ? (
                    <div className="h-8 w-24 bg-white/5 animate-pulse rounded mt-1" />
                ) : (
                    <h2 className="text-2xl font-bold tracking-tight text-white">{value}</h2>
                )}
            </div>
        </Card>
    );
}

