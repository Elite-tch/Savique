"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccount } from "wagmi";

export default function DebugReceipts() {
    const { address } = useAccount();
    const [receipts, setReceipts] = useState<any[]>([]);

    const loadAllReceipts = () => {
        const all: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('receipt_')) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        all.push({ key, ...parsed });
                    } catch (e) {
                        console.error("Failed to parse:", e);
                    }
                }
            }
        }
        setReceipts(all);
    };

    const clearAllReceipts = () => {
        if (confirm("Are you sure you want to clear ALL receipts from localStorage?")) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key?.startsWith('receipt_')) {
                    localStorage.removeItem(key);
                }
            }
            setReceipts([]);
            alert("All receipts cleared!");
        }
    };

    return (
        <div className="space-y-8 p-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Debug Receipts</h1>
                <p className="text-gray-400">Current Address: {address || "Not connected"}</p>
            </div>

            <div className="flex gap-4">
                <Button onClick={loadAllReceipts}>Load All Receipts</Button>
                <Button onClick={clearAllReceipts} variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">Clear All Receipts</Button>
            </div>

            <div className="space-y-4">
                {receipts.map((receipt, i) => (
                    <Card key={i} className="p-4">
                        <pre className="text-xs text-white overflow-auto">
                            {JSON.stringify(receipt, null, 2)}
                        </pre>
                    </Card>
                ))}
            </div>
        </div>
    );
}
