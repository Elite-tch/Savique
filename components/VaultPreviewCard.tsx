"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { VAULT_ABI, ERC20_ABI, CONTRACTS } from "@/lib/contracts";
import { formatUnits } from "viem";
import { useEffect, useState, useMemo } from "react";
import { getVaultByAddress, getReceiptsByVault, SavedVault } from "@/lib/receiptService";
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

    const [historicalAmount, setHistoricalAmount] = useState<string | null>(null);

    useEffect(() => {
        const fetchVault = async () => {
            const data = await getVaultByAddress(address);
            setVaultData(data);
        };
        fetchVault();
    }, [address]);

    // Fetch historical withdrawal amount if balance is 0 and vault matured
    useEffect(() => {
        if (balanceResult === BigInt(0) && unlockTimeResult) {
            const matured = Date.now() >= Number(unlockTimeResult) * 1000;
            if (matured) {
                getReceiptsByVault(address).then(receipts => {
                    const withdrawal = receipts.find(r => r.type === 'completed' || r.type === 'breaked');
                    if (withdrawal) {
                        setHistoricalAmount(withdrawal.amount);
                    }
                });
            }
        }
    }, [balanceResult, unlockTimeResult, address]);

    const balance = balanceResult ? formatUnits(balanceResult, decimals || 18) : "0";
    const displayBalance = historicalAmount || balance;

    const progressValue = useMemo(() => {
        if (!vaultData?.targetAmount || !decimals) return 0;
        const current = historicalAmount ? parseFloat(historicalAmount) : parseFloat(balance);
        const target = parseFloat(vaultData.targetAmount);
        if (target === 0) return 100;
        return Math.min(100, (current / target) * 100);
    }, [vaultData, balance, historicalAmount, decimals]);
    const unlockDate = unlockTimeResult ? new Date(Number(unlockTimeResult) * 1000) : new Date();
    const isLocked = new Date() < unlockDate;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="h-full">
            <Link href={`/dashboard/savings/${address}`} className="h-full block">
                <Card className="bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer group p-8 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-white truncate">{purpose || "Loading..."}</h3>
                        <div className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${isLocked 
                            ? 'bg-orange-500/10 text-orange-400' 
                            : progressValue >= 100 
                                ? 'bg-green-500/10 text-green-400' 
                                : 'bg-primary/10 text-primary'}`}>
                            {isLocked ? 'Active' : progressValue >= 100 ? 'Completed' : 'Expired'}
                        </div>
                    </div>
                    <div className="space-y-4 mt-auto">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Balance:</span>
                            <span className="text-white font-medium">${parseFloat(displayBalance).toFixed(2)}</span>
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
                            <span className="text-gray-400">
                                {isLocked ? "Target Date:" : progressValue >= 100 ? "Completed on:" : "Expired on:"}
                            </span>
                            <span className="text-white font-medium">{unlockDate.toLocaleDateString()}</span>
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}
