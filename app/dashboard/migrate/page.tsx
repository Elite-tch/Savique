"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccount } from "wagmi";
import { migrateLocalStorageToFirestore } from "@/lib/receiptService";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, Database } from "lucide-react";

export default function MigratePage() {
    const { address } = useAccount();
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationComplete, setMigrationComplete] = useState(false);
    const [migratedCount, setMigratedCount] = useState(0);

    const handleMigrate = async () => {
        if (!address) {
            toast.error("Please connect your wallet first");
            return;
        }

        try {
            setIsMigrating(true);
            const count = await migrateLocalStorageToFirestore(address);
            setMigratedCount(count);
            setMigrationComplete(true);
            toast.success(`Successfully migrated ${count} receipts to Firestore!`);
        } catch (error) {
            console.error("Migration error:", error);
            toast.error("Migration failed. Please try again.");
        } finally {
            setIsMigrating(false);
        }
    };

    const clearLocalStorage = () => {
        if (confirm("Are you sure you want to clear all receipts from localStorage? This cannot be undone!")) {
            let count = 0;
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key?.startsWith('receipt_')) {
                    localStorage.removeItem(key);
                    count++;
                }
            }
            toast.success(`Cleared ${count} receipts from localStorage`);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Migrate to Firestore</h1>
                <p className="text-gray-400">
                    Migrate your transaction history from localStorage to Firestore for better security and cross-device sync.
                </p>
            </div>

            {!address ? (
                <Card className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Wallet Not Connected</h3>
                    <p className="text-gray-400">Please connect your wallet to migrate your data.</p>
                </Card>
            ) : migrationComplete ? (
                <Card className="p-8 text-center bg-green-500/10 border-green-500/20">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Migration Complete!</h3>
                    <p className="text-gray-400 mb-4">
                        Successfully migrated {migratedCount} receipt{migratedCount !== 1 ? 's' : ''} to Firestore.
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        Your receipts are now stored securely in the cloud and will sync across all your devices.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button onClick={clearLocalStorage} variant="outline">
                            Clear localStorage
                        </Button>
                        <Button onClick={() => window.location.href = "/dashboard/history"}>
                            View History
                        </Button>
                    </div>
                </Card>
            ) : (
                <Card className="p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <Database className="w-8 h-8 text-primary flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Why Migrate?</h3>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li>✅ <strong>Cross-device sync</strong> - Access your history from any device</li>
                                <li>✅ <strong>Better security</strong> - Proper wallet isolation</li>
                                <li>✅ <strong>Persistent storage</strong> - Won't be lost if you clear browser data</li>
                                <li>✅ <strong>Backup</strong> - Your data is safely stored in the cloud</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                        <p className="text-sm text-yellow-200">
                            <strong>Note:</strong> This will migrate all receipts from localStorage that belong to your current wallet address ({address.slice(0, 6)}...{address.slice(-4)}).
                        </p>
                    </div>

                    <Button
                        onClick={handleMigrate}
                        disabled={isMigrating}
                        className="w-full"
                        size="lg"
                    >
                        {isMigrating ? "Migrating..." : "Start Migration"}
                    </Button>
                </Card>
            )}
        </div>
    );
}
