"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { VAULT_ABI } from "@/lib/contracts";
import { formatUnits } from "viem";

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

    const balance = balanceResult ? formatUnits(balanceResult, 18) : "0";
    const unlockDate = unlockTimeResult ? new Date(Number(unlockTimeResult) * 1000) : new Date();
    const isLocked = new Date() < unlockDate;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Link href={`/dashboard/vaults/${address}`}>
                <Card className="hover:border-primary/50 transition-all cursor-pointer group p-8">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-white truncate">{purpose || "Loading..."}</h3>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${isLocked ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                            {isLocked ? 'Locked' : 'Unlocked'}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Balance:</span>
                            <span className="text-white font-medium">${parseFloat(balance).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Unlock:</span>
                            <span className="text-white font-medium">{unlockDate.toLocaleDateString()}</span>
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}
