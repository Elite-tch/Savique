"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { getReceiptsByWallet, updateReceipt, Receipt } from "@/lib/receiptService";
import { createNotification } from "@/lib/notificationService";
import { useProofRails } from "@proofrails/sdk/react";
import { toast } from "sonner";

/**
 * Background component that automatically attempts to sync pending/failed receipts
 */
export function ReceiptSync() {
    const { address, isConnected } = useAccount();
    const sdk = useProofRails();
    const isSyncingRef = useRef(false);

    useEffect(() => {
        if (!isConnected || !address || isSyncingRef.current) return;

        const syncReceipts = async () => {
            isSyncingRef.current = true;
            try {
                console.log("[ReceiptSync] Starting background sync check...");
                const receipts = await getReceiptsByWallet(address);

                // Find receipts that are not verified and have a vaultAddress
                // We need vaultAddress to know 'from' or 'to' for payment template
                const pendingReceipts = receipts.filter(r => !r.verified && r.vaultAddress);

                if (pendingReceipts.length === 0) {
                    console.log("[ReceiptSync] No receipts need syncing.");
                    return;
                }

                console.log(`[ReceiptSync] Found ${pendingReceipts.length} pending receipts. Attempting sync...`);

                for (const receipt of pendingReceipts) {
                    try {
                        let fromAddress = "";
                        let toAddress = "";

                        if (receipt.type === 'created') {
                            fromAddress = address;
                            toAddress = receipt.vaultAddress!;
                        } else {
                            // breaked or completed
                            fromAddress = receipt.vaultAddress!;
                            toAddress = address;
                        }

                        console.log(`[ReceiptSync] Syncing receipt: ${receipt.purpose} (${receipt.txHash})`);

                        const result = await sdk.templates.payment({
                            amount: parseFloat(receipt.amount),
                            from: fromAddress,
                            to: toAddress,
                            purpose: receipt.purpose,
                            transactionHash: receipt.txHash
                        });

                        if (result?.id) {
                            await updateReceipt(receipt.id!, {
                                verified: true,
                                proofRailsId: result.id
                            });

                            await createNotification(
                                address,
                                "Receipt Synced",
                                `Background check: Your receipt for "${receipt.purpose}" has been verified.`,
                                'success',
                                '/dashboard/history',
                                result.id
                            );

                            console.log(`[ReceiptSync] ✅ Successfully synced: ${receipt.purpose}`);
                            toast.success(`Receipt Synced: ${receipt.purpose}`, {
                                description: "Your pending receipt has been generated successfully.",
                            });
                        }
                    } catch (err) {
                        console.warn(`[ReceiptSync] Failed to sync receipt ${receipt.id}:`, err);
                    }
                    // Small delay between syncs
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error("[ReceiptSync] Sync error:", error);
            } finally {
                isSyncingRef.current = false;
            }
        };

        // Run sync on mount (after a short delay to let page load)
        const timeoutId = setTimeout(syncReceipts, 5000);
        return () => clearTimeout(timeoutId);
    }, [address, isConnected, sdk]);

    return null;
}
