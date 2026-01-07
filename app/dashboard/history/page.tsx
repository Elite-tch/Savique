"use client";

import { Card } from "@/components/ui/card";
import { History, ArrowUpRight, ArrowDownLeft } from "lucide-react";

export default function HistoryPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">History</h2>
                <p className="text-gray-400">View your past saving events and vault activities.</p>
            </div>

            <Card className="bg-white/5 border-white/10 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <History className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white">No History Yet</h3>
                <p className="text-gray-400 max-w-sm mt-2">
                    Your transactions will appear here once you start using the vaults.
                </p>
            </Card>
        </div>
    );
}
