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

export function VaultPreviewCard({ address, index }: { address: `0x${string}`; index: number }) {
    const { data: purpose } = useReadContract({
        address,
        abi: VAULT_ABI,
        functionName: "purpose",
    });

    const { data: balanceResult } = useReadContract({
        address,
        abi: VAULT_ABI,
        functionName: "totalAssets",
    });

    const { data: unlockTimeResult } = useReadContract({
        address,
        abi: VAULT_ABI,
        functionName: "unlockTimestamp",
    });

    const { data: decimals } = useReadContract({
        address: CONTRACTS.coston2.USDTToken,
        abi: ERC20_ABI,
        functionName: 'decimals',
    });

    const [vaultData, setVaultData] = useState<SavedVault | null>(null);

    useEffect(() => {
        const fetchVault = async () => {
            const data = await getVaultByAddress(address);
            setVaultData(data);
        };
        fetchVault();
    }, [address]);

    const progressValue = useMemo(() => {
        if (!vaultData?.targetAmount || !balanceResult || !decimals) return 0;
        const current = parseFloat(formatUnits(balanceResult as bigint, decimals as number || 18));
        const target = parseFloat(vaultData.targetAmount);
        if (target === 0) return 100;
        return Math.min(100, (current / target) * 100);
    }, [vaultData, balanceResult, decimals]);

    const balance = balanceResult ? formatUnits(balanceResult, decimals || 18) : "0";
    const unlockDate = unlockTimeResult ? new Date(Number(unlockTimeResult) * 1000) : new Date();
    const isLocked = new Date() < unlockDate;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Link href={`/dashboard/savings/${address}`}>
                <Card className="hover:border-primary/50 transition-all cursor-pointer group p-8">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-white truncate">{purpose || "Loading..."}</h3>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${isLocked ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                            {isLocked ? 'Locked' : 'Unlocked'}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Balance:</span>
                            <span className="text-white font-medium">${parseFloat(balance).toFixed(2)}</span>
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
