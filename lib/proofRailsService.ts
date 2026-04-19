/**
 * ProofRails ISO 20022 Integration Service (Phase 2)
 * 
 * Bridges Savique with the ISO 20022 Payments Middleware
 * for bank-standard auditing on the Flare Network.
 */

const PROOFRAILS_API_URL = "/api/proofrails";
const DIRECT_API_URL = "http://127.0.0.1:8000";

export interface ReceiptResponse {
    receipt_id: string;
    status: string;
}

export interface ISORecipt {
    id: string;
    status: string;
    bundle_hash: string;
    flare_txid: string;
    xml_url: string;
    bundle_url: string;
    created_at: string;
    anchored_at?: string;
}

export const proofRailsService = {
    /**
     * Records a transaction to the ISO 20022 Ledger.
     */
    async recordTransaction(data: {
        amount: string,
        currency: string,
        txHash: string,
        sender: string,
        receiver: string,
        reference: string
    }): Promise<ReceiptResponse | null> {
        try {
            const response = await fetch(`${PROOFRAILS_API_URL}/v1/iso/record-tip`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tip_tx_hash: data.txHash,
                    chain: "coston2",
                    amount: data.amount,
                    currency: data.currency,
                    sender_wallet: data.sender,
                    receiver_wallet: data.receiver,
                    reference: data.reference
                })
            });

            if (!response.ok) {
                let errorMsg = "Recording failed";
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.detail || errorMsg;
                } catch (e) {
                    errorMsg = `Server Error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }

            return await response.json();
        } catch (error) {
            console.error("[ProofRails] Recording Error:", error);
            return null;
        }
    },

    /**
     * Fetches full audit details for a receipt
     */
    async getReceiptDetails(id: string): Promise<ISORecipt | null> {
        try {
            const response = await fetch(`${PROOFRAILS_API_URL}/v1/iso/receipts/${id}`);
            if (!response.ok) return null;
            
            try {
                return await response.json();
            } catch (e) {
                return null;
            }
        } catch (error) {
            console.error("[ProofRails] Error fetching details:", error);
            return null;
        }
    },

    /**
     * Generates a CAMT.053 Bank Statement (Standard for Bank-to-Customer Reporting)
     */
    async generateStatement(rid: string) {
        try {
            const response = await fetch(`${PROOFRAILS_API_URL}/v1/iso/statement/camt053`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ receipt_id: rid })
            });

            if (!response.ok) throw new Error("Statement generation failed");
            return await response.blob();
        } catch (error) {
            console.error("[ProofRails] Statement generation failed:", error);
            return null;
        }
    },

    /**
     * Verifies the authenticity of a transaction record
     */
    async verifyRecord(rid: string) {
        try {
            console.log("[ProofRails] Fetching details for verification:", rid);
            const details = await this.getReceiptDetails(rid);
            
            if (!details || !details.bundle_hash) {
                console.warn("[ProofRails] No bundle hash for verification");
                return { matches_onchain: false, error: "Evidence bundle not yet anchored" };
            }

            console.log("[ProofRails] Verifying bundle hash:", details.bundle_hash);
            const response = await fetch(`${PROOFRAILS_API_URL}/v1/iso/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bundle_hash: details.bundle_hash })
            });
            
            const result = await response.json();
            console.log("[ProofRails] Verification result:", result);
            return result;
        } catch (error) {
            console.error("[ProofRails] Verification failed:", error);
            return { matches_onchain: false, error: String(error) };
        }
    },

    /**
     * Helper to get the direct receipt portal URL
     */
    getReceiptPortalUrl(id: string): string {
        return `${DIRECT_API_URL}/receipt/${id}`;
    },

    /**
     * Helper to get direct file URLs (XML or Bundle)
     */
    getFileUrl(relativePath: string): string {
        if (!relativePath) return "";
        // If it starts with / it's relative to the server root
        const cleanPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
        return `${DIRECT_API_URL}/${cleanPath}`;
    }
};
