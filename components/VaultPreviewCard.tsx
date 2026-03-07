"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { VAULT_ABI, ERC20_ABI, CONTRACTS } from "@/lib/contracts";
import { formatUnits } from "viem";
import { useEffect, useState, useMemo } from "react";
import { getVaultByAddress, SavedVault } from "@/lib/receiptService";
import { Progress } from "@/components/ui/progress";

import { useVaultData } from "@/hooks/useVaultData";
import { useEcosystem } from "@/context/EcosystemContext";

export function VaultPreviewCard({ address, index }: { address: string; index: number }) {
    const { data: vaultChainData, loading } = useVaultData(address);
    const { isFlare, isSolana } = useEcosystem();

    const [vaultData, setVaultData] = useState<SavedVault | null>(null);

    useEffect(() => {
        const fetchVault = async () => {
            const data = await getVaultByAddress(address);
            setVaultData(data);
        };
        fetchVault();
    }, [address]);

    const currency = vaultChainData?.currency || (isFlare ? 'USDT0' : 'SHIP');
    const decimals = (vaultChainData as any)?.decimals || (currency === 'USDC' ? 6 : (isFlare ? 6 : 9));

    const progressValue = useMemo(() => {
        if (!vaultData?.targetAmount || !vaultChainData?.balance) return 0;
        const current = parseFloat(formatUnits(BigInt(vaultChainData.balance), decimals));
        const target = parseFloat(vaultData.targetAmount);
        if (target === 0) return 100;
        return Math.min(100, (current / target) * 100);
    }, [vaultData, vaultChainData, decimals]);

    const formattedBalance = vaultChainData?.balance
        ? formatUnits(BigInt(vaultChainData.balance), decimals)
        : "0";

    const unlockDate = vaultChainData?.unlockTimestamp
        ? new Date(vaultChainData.unlockTimestamp * 1000)
        : new Date();

    const isLocked = new Date() < unlockDate;

    if (loading) {
        return (
            <Card className="bg-zinc-900/40 border-zinc-800/50 p-8 h-full animate-pulse">
                <div className="h-6 w-32 bg-white/5 rounded mb-4" />
                <div className="space-y-4 mt-auto">
                    <div className="h-4 w-full bg-white/5 rounded" />
                    <div className="h-4 w-full bg-white/5 rounded" />
                </div>
            </Card>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="h-full">
            <Link href={`/dashboard/savings/${address}`} className="h-full block">
                <Card className="bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer group p-8 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-white truncate">
                            {vaultChainData?.purpose || vaultData?.purpose || "Savings Plan"}
                        </h3>
                        <div className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${isLocked ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                            {isLocked ? 'Locked' : 'Unlocked'}
                        </div>
                    </div>
                    <div className="space-y-4 mt-auto">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Balance:</span>
                            <span className="text-white font-medium">
                                {parseFloat(formattedBalance).toLocaleString()} {currency}
                            </span>
                        </div>

                        {vaultData?.targetAmount && parseFloat(vaultData.targetAmount) > 0 && (
                            <div className="space-y-1.5 pt-1">
                                <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold">
                                    <span className="text-gray-500">Progress</span>
                                    <span className="text-primary">{progressValue.toFixed(0)}%</span>
                                </div>
                                <Progress value={progressValue} className="h-1.5 bg-white/5" />
                            </div>
                        )}

                        <div className="flex justify-between text-sm pt-1">
                            <span className="text-gray-400">Unlock:</span>
                            <span className="text-white font-medium">{unlockDate.toLocaleDateString()}</span>
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}
