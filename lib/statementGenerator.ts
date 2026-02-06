import { jsPDF } from "jspdf";
import { Receipt } from "./receiptService";

interface StatementData {
    receipts: Receipt[];
    walletAddress: string;
    startDate: Date;
    endDate: Date;
    qrImageData?: string;
}

export function generateStatement(data: StatementData) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const primaryColor = "#F97316"; // Orange-500
    const darkColor = "#18181B"; // Zinc-900
    const lightColor = "#71717A"; // Zinc-400

    // Background / Border
    doc.setDrawColor(228, 228, 231);
    doc.rect(5, 5, 200, 287);

    // Header
    doc.setFillColor(darkColor);
    doc.rect(5, 5, 200, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("SafeVault", 15, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("ACCOUNT STATEMENT", 15, 32);

    doc.setFontSize(10);
    const statementId = `ST${Date.now().toString().slice(-8)}`;
    doc.text(`Statement ID: ${statementId}`, 130, 22);

    // Verified Seal (Professional Badge) - Placed under Statement ID
    doc.setFillColor(primaryColor);
    doc.roundedRect(130, 26, 30, 8, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("VERIFIED", 145, 30.8, { align: "center" }); // Centered vertically
    doc.setFontSize(4.5); // Slightly larger for readability
    doc.text("BY PROOFRAILS", 145, 33.0, { align: "center" }); // Centered vertically



    // Account Info Section
    let y = 60;
    if (data.qrImageData) {
        doc.addImage(data.qrImageData, "PNG", 160, 48, 35, 35);
    }
    doc.setTextColor(darkColor);
    doc.setFontSize(10);
    doc.setTextColor(lightColor);
    doc.text("ACCOUNT", 15, y);
    doc.text("PERIOD", 15, y + 10);
    doc.text("NETWORK", 15, y + 20);

    doc.setFont("courier", "normal");
    doc.setTextColor(darkColor);
    doc.setFontSize(9);
    doc.text(data.walletAddress, 50, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${data.startDate.toLocaleDateString()} - ${data.endDate.toLocaleDateString()}`, 50, y + 10);
    doc.text("Flare Coston2", 50, y + 20);

    y += 35;

    // Divider
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 10;

    // Transaction History Header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkColor);
    doc.text("TRANSACTION HISTORY", 15, y);
    y += 10;

    // Table Header
    doc.setFillColor(244, 244, 245);
    doc.rect(15, y - 5, 180, 8, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(lightColor);
    doc.text("DATE", 20, y);
    doc.text("TYPE", 55, y);
    doc.text("PURPOSE", 85, y);
    doc.text("AMOUNT", 190, y, { align: "right" });
    y += 8;

    // Calculate totals
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalPenalties = 0;

    // Transaction Rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    data.receipts.forEach((receipt, index) => {
        if (y > 230) {
            doc.addPage();
            y = 20;
        }

        const date = new Date(receipt.timestamp).toLocaleDateString();

        // Determine descriptive type for professional statement
        let typeLabel = "INITIAL DEPOSIT";
        if (receipt.type === 'completed') typeLabel = "WITHDRAWAL";
        if (receipt.type === 'breaked') {
            typeLabel = "BREAK EARLY";
        } else if (receipt.type === 'created') {
            if (receipt.purpose.toLowerCase().includes('target reached')) {
                typeLabel = "GOAL REACHED";
            } else if (receipt.purpose.toLowerCase().includes('contributed')) {
                typeLabel = "CONTRIBUTION";
            }
        }

        const type = typeLabel;
        const purpose = receipt.purpose.substring(0, 25);
        const amount = parseFloat(receipt.amount);

        // Classify transaction for totals
        if (receipt.type === 'created') {
            totalDeposits += amount;
        } else {
            totalWithdrawals += amount;
        }

        if (receipt.penalty) {
            totalPenalties += parseFloat(receipt.penalty);
        }

        // Alternate row background
        if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            const rowHeight = receipt.penalty ? 14 : 10;
            doc.rect(15, y - 4, 180, rowHeight, "F");
        }

        doc.setTextColor(darkColor);
        doc.text(date, 20, y);

        // Type with color (Deposit = Green-ish blue, Withdrawal = Standard green, Break = Red)
        if (receipt.type === 'created') {
            doc.setTextColor("#0369A1"); // Sky-700
        } else if (receipt.type === 'completed') {
            doc.setTextColor("#15803D"); // Green-700
        } else {
            doc.setTextColor("#DC2626"); // Red-600
        }
        doc.text(type, 55, y);

        doc.setTextColor(darkColor);
        doc.text(purpose, 85, y);

        // Amount with sign
        const sign = receipt.type === 'created' ? '+' : '-';
        doc.setTextColor(receipt.type === 'created' ? "#16A34A" : darkColor);
        doc.text(`${sign}${amount.toFixed(2)}`, 190, y, { align: "right" });

        // Add Transaction Hash (Identity Anchor)
        y += 4;
        doc.setFontSize(6);
        doc.setTextColor(lightColor);
        doc.text(`Identity Anchor: ${receipt.txHash}`, 20, y);

        if (receipt.penalty) {
            doc.setFontSize(7);
            doc.setTextColor("#DC2626");
            doc.text(`(Penalty: ${parseFloat(receipt.penalty).toFixed(2)})`, 190, y, { align: "right" });
        }

        y += 8;
        doc.setFontSize(8);
    });

    y += 10;

    // Summary Section
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkColor);
    doc.text("SUMMARY", 15, y);
    y += 10;

    doc.setFillColor(244, 244, 245);
    doc.rect(15, y - 5, 180, 30, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightColor);
    doc.text("Total Deposits:", 20, y);
    doc.text("Total Withdrawals:", 20, y + 8);
    doc.text("Penalties Paid:", 20, y + 16);
    doc.text("Currently Locked:", 20, y + 24);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkColor);
    doc.text(`${totalDeposits.toFixed(2)} USDT0`, 150, y, { align: "right" });
    doc.text(`${totalWithdrawals.toFixed(2)} USDT0`, 150, y + 8, { align: "right" });
    doc.text(`${totalPenalties.toFixed(2)} USDT0`, 150, y + 16, { align: "right" });

    const locked = totalDeposits - totalWithdrawals;
    doc.setTextColor(primaryColor);
    doc.text(`${locked.toFixed(2)} USDT0`, 150, y + 24, { align: "right" });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(lightColor);
    doc.setFont("helvetica", "bold");
    doc.text("OFFICIAL PROOFRAILS VERIFICATION", 105, 275, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("This document serves as a cryptographically anchored proof of transaction. Authenticity can be verified", 105, 280, { align: "center" });
    doc.text("by cross-referencing the Identity Anchors listed above with the Flare Coston2 blockchain ledger.", 105, 284, { align: "center" });
    doc.text("Secured by Savique Protocol", 105, 288, { align: "center" });

    // Generate filename
    const filename = `Savique-Verified-Statement-${data.startDate.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}


export function generateStatementCSV(data: StatementData): string {
    let csv = "Date,Type,Purpose,Amount (USDT0),Penalty (USDT0),Status,Transaction Hash\n";

    data.receipts.forEach(receipt => {
        const date = new Date(receipt.timestamp).toLocaleString();
        const type = receipt.type;
        const purpose = receipt.purpose.replace(/,/g, '');
        const amount = receipt.amount;
        const penalty = receipt.penalty || "0";
        const status = receipt.verified ? "Verified" : "Pending";
        const hash = receipt.txHash;

        csv += `"${date}","${type}","${purpose}","${amount}","${penalty}","${status}","${hash}"\n`;
    });

    return csv;
}

export function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
