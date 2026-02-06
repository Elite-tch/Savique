import { jsPDF } from "jspdf";
import { Receipt } from "./receiptService";

export const generateReceiptPDF = async (receipt: Receipt): Promise<Blob> => {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const primaryColor = "#F97316";
    const darkColor = "#18181B";
    const lightColor = "#71717A";

    const createPDFWithQR = (qrImageData?: string): Blob => {
        // Background / Border
        doc.setDrawColor(228, 228, 231);
        doc.rect(5, 5, 200, 287);

        // Header
        doc.setFillColor(darkColor);
        doc.rect(5, 5, 200, 40, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("Savique", 15, 22);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("DECENTRALIZED SAVINGS RECEIPT", 15, 32);

        doc.setFontSize(12);
        doc.text(`ID: ${receipt.id?.slice(0, 8).toUpperCase() || 'N/A'}`, 160, 22);

        // Content Starts
        let y = 60;
        doc.setTextColor(darkColor);
        doc.setFontSize(18);
        doc.text(receipt.purpose || "Saving Transaction", 15, y);
        y += 10;

        // Divider
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(1);
        doc.line(15, y, 60, y);
        y += 15;

        // Details Grid
        doc.setFontSize(10);
        doc.setTextColor(lightColor);
        doc.text("TYPE", 15, y);
        doc.text("TIMESTAMP", 70, y);
        doc.text("STATUS", 150, y);

        y += 7;
        doc.setFontSize(12);
        doc.setTextColor(darkColor);

        let typeLabel = "INITIAL DEPOSIT";
        if (receipt.type === 'completed') typeLabel = "WITHDRAWAL";
        else if (receipt.type === 'breaked') typeLabel = "BREAK EARLY";
        else if (receipt.type === 'created') typeLabel = "DEPOSIT";

        doc.text(typeLabel, 15, y);
        doc.text(new Date(receipt.timestamp).toLocaleString(), 70, y);
        doc.text(receipt.verified ? "VERIFIED" : "PENDING", 150, y);

        y += 20;

        // Transaction Details
        doc.setFillColor(244, 244, 245);
        doc.rect(15, y, 180, 50, "F");

        y += 10;
        doc.setFontSize(10);
        doc.setTextColor(lightColor);
        doc.text("WALLET ADDRESS", 25, y);
        y += 5;
        doc.setTextColor(darkColor);
        doc.setFontSize(9);
        doc.text(receipt.walletAddress, 25, y);

        y += 10;
        doc.setFontSize(10);
        doc.setTextColor(lightColor);
        doc.text("TRANSACTION HASH", 25, y);
        y += 5;
        doc.setTextColor(darkColor);
        doc.setFontSize(9);
        doc.text(receipt.txHash, 25, y);

        y += 25;

        // Amount Section
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("TRANSACTION SUMMARY", 15, y);
        y += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("Amount Transacted:", 15, y);
        doc.setFont("helvetica", "bold");
        doc.text(`${receipt.amount} USDT0`, 195, y, { align: "right" });

        if (receipt.penalty) {
            y += 7;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(239, 68, 68);
            doc.text("Penalty Applied:", 15, y);
            doc.setFont("helvetica", "bold");
            doc.text(`-${receipt.penalty} USDT0`, 195, y, { align: "right" });
        }

        y += 15;
        doc.setDrawColor(228, 228, 231);
        doc.setLineWidth(0.5);
        doc.line(15, y, 195, y);
        y += 10;

        doc.setFontSize(14);
        doc.setTextColor(darkColor);
        doc.text("Total Value:", 15, y);
        doc.setFontSize(18);
        const total = receipt.penalty ? (parseFloat(receipt.amount) - parseFloat(receipt.penalty)).toFixed(2) : receipt.amount;
        doc.text(`${total} USDT0`, 195, y, { align: "right" });

        // QR Code Support
        if (receipt.proofRailsId && qrImageData) {
            y += 15;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(darkColor);
            doc.text("ProofRails Verification", 15, y);
            doc.addImage(qrImageData, "PNG", 160, y - 5, 30, 30);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(lightColor);
            doc.text("Scan to verify this transaction on the blockchain.", 15, y + 8);
        }

        // Footer
        y = 280;
        doc.setFontSize(8);
        doc.setTextColor(lightColor);
        doc.text("This receipt is a digitally verified record of a smart contract transaction.", 105, y, { align: "center" });
        doc.text("Savique protocol operates on the Flare Coston2 Network.", 105, y + 4, { align: "center" });

        return doc.output("blob");
    };

    if (receipt.proofRailsId) {
        return new Promise((resolve) => {
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
                resolve(createPDFWithQR(dataURL));
            };
            img.onerror = () => resolve(createPDFWithQR());
        });
    } else {
        return createPDFWithQR();
    }
};
