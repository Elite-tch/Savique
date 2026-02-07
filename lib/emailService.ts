import nodemailer from 'nodemailer';

// These should be set in .env
const SMTP_HOST = process.env.EMAIL_HOST;
const SMTP_PORT = parseInt(process.env.EMAIL_PORT || '465');
const SMTP_USER = process.env.EMAIL_USER;
const SMTP_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

export type EmailType =
    | 'DEPOSIT_CONFIRMED'
    | 'TOP_UP_CONFIRMED'
    | 'MATURITY_WARNING'
    | 'MATURITY_COUNTDOWN'
    | 'GOAL_REMINDER'
    | 'WITHDRAWAL_SUCCESS'
    | 'SAVINGS_BROKEN'
    | 'TRANSACTION_FAILED';

interface EmailData {
    userEmail: string;
    purpose: string;
    amount: string;
    txHash?: string;
    unlockDate?: string;
    proofRailsId?: string;
    daysRemaining?: number;
    targetAmount?: string;
    currentBalance?: string;
}

export async function sendNotificationEmail(type: EmailType, data: EmailData) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn('[EmailService] SMTP credentials missing, skipping email.');
        return;
    }

    let subject = '';
    let html = '';

    const brandColor = '#E62058';
    const darkBg = '#18181B';
    const logoUrl = 'https://res.cloudinary.com/dibwnfwk9/image/upload/v1770464073/ChatGPT_Image_Feb_6__2026__07_08_19_AM-removebg-preview_tvlkzh.png'; // Your Savique logo
    const proofRailsUrl = data.proofRailsId ? `https://proofrails-clone-middleware.onrender.com/receipt/${data.proofRailsId}` : '';
    const qrCodeUrl = data.proofRailsId ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${proofRailsUrl}` : '';
    const explorerUrl = data.txHash ? `https://coston2-explorer.flare.network/tx/${data.txHash}` : '';

    switch (type) {
        case 'DEPOSIT_CONFIRMED':
            subject = `Deposit Confirmed: ${data.purpose}`;
            html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, ${darkBg} 0%, #27272A 100%); padding: 40px; text-align: center;">
                                            <img src="${logoUrl}" alt="Savique" style="height: 50px; margin-bottom: 16px;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Commitment Secured</h1>
                                            <p style="color: #A1A1AA; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px;">DEPOSIT CONFIRMED</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #18181B; margin: 0 0 16px 0; font-size: 22px;">Your Deposit is Active</h2>
                                            <p style="color: #52525B; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                                Great job! You've successfully added funds to your savings goal: <strong style="color: ${brandColor};">${data.purpose}</strong>.
                                            </p>
                                            
                                            <!-- Transaction Details Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F4F5; border-radius: 12px; margin-bottom: 24px;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="8" cellspacing="0">
                                                            <tr>
                                                                <td style="color: #71717A; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Amount</td>
                                                                <td align="right" style="color: #18181B; font-size: 20px; font-weight: 700;">${data.amount} USDT0</td>
                                                            </tr>
                                                            ${data.unlockDate ? `
                                                            <tr>
                                                                <td style="color: #71717A; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Unlock Date</td>
                                                                <td align="right" style="color: #18181B; font-size: 14px; font-weight: 600;">${data.unlockDate}</td>
                                                            </tr>
                                                            ` : ''}
                                                            <tr>
                                                                <td style="color: #71717A; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Transaction</td>
                                                                <td align="right">
                                                                    <a href="${explorerUrl}" style="color: ${brandColor}; text-decoration: none; font-size: 12px; font-family: monospace;">${data.txHash?.slice(0, 16)}...</a>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            ${data.proofRailsId ? `
                                            <!-- ProofRails Verification -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #E4E4E7; border-radius: 12px; margin-bottom: 24px;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td style="vertical-align: top; width: 70%;">
                                                                    <h3 style="margin: 0 0 8px 0; color: #18181B; font-size: 16px; font-weight: 700;">✓ ProofRails Verified</h3>
                                                                    <p style="margin: 0 0 16px 0; color: #71717A; font-size: 13px; line-height: 1.5;">
                                                                        This transaction has been cryptographically verified and recorded on the blockchain.
                                                                    </p>
                                                                    <a href="${proofRailsUrl}" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                                                        View Full Receipt
                                                                    </a>
                                                                </td>
                                                                <td align="center" style="vertical-align: top; width: 30%;">
                                                                    <img src="${qrCodeUrl}" alt="QR Code" style="width: 120px; height: 120px; border-radius: 8px;">
                                                                    <p style="margin: 8px 0 0 0; color: #A1A1AA; font-size: 10px;">Scan to verify</p>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            ` : ''}
                                            
                                            <p style="color: #A1A1AA; font-size: 12px; margin: 24px 0 0 0; line-height: 1.5;">
                                                This is a verifiable ProofRails receipt. Keep it for your records. Your commitment is secured on the Flare Coston2 Network.<br>
                                                <strong style="color: #71717A;">💡 Tip:</strong> Download a PDF copy from the History page in your dashboard.
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #FAFAFA; padding: 24px; text-align: center; border-top: 1px solid #E4E4E7;">
                                            <p style="margin: 0; color: #A1A1AA; font-size: 12px;">
                                                Savique Protocol • Decentralized Savings on Flare Network
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            break;
        case 'TOP_UP_CONFIRMED':
            subject = `Top-Up Successful: ${data.purpose}`;
            html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 40px; text-align: center;">
                                            <img src="${logoUrl}" alt="Savique" style="height: 50px; margin-bottom: 16px;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Top-Up Successful!</h1>
                                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px;">YOU'RE GETTING CLOSER TO YOUR GOAL</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #18181B; margin: 0 0 16px 0; font-size: 22px;">Great Progress!</h2>
                                            <p style="color: #52525B; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                                You've added more funds to your savings goal: <strong style="color: ${brandColor};">${data.purpose}</strong>. Keep up the momentum!
                                            </p>
                                            
                                            <!-- Transaction Details Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F3FF; border-radius: 12px; margin-bottom: 24px; border: 1px solid #8B5CF6;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="8" cellspacing="0">
                                                            <tr>
                                                                <td style="color: #6D28D9; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Amount Added</td>
                                                                <td align="right" style="color: #5B21B6; font-size: 20px; font-weight: 700;">+${data.amount} USDT0</td>
                                                            </tr>
                                                            ${data.currentBalance ? `
                                                            <tr>
                                                                <td style="color: #6D28D9; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">New Balance</td>
                                                                <td align="right" style="color: #5B21B6; font-size: 14px; font-weight: 600;">${data.currentBalance} USDT0</td>
                                                            </tr>
                                                            ` : ''}
                                                            ${data.unlockDate ? `
                                                            <tr>
                                                                <td style="color: #6D28D9; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Unlock Date</td>
                                                                <td align="right" style="color: #5B21B6; font-size: 14px; font-weight: 600;">${data.unlockDate}</td>
                                                            </tr>
                                                            ` : ''}
                                                            ${data.txHash ? `
                                                            <tr>
                                                                <td style="color: #6D28D9; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Transaction</td>
                                                                <td align="right">
                                                                    <a href="${explorerUrl}" style="color: ${brandColor}; text-decoration: none; font-size: 12px; font-family: monospace;">${data.txHash?.slice(0, 16)}...</a>
                                                                </td>
                                                            </tr>
                                                            ` : ''}
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            ${data.proofRailsId ? `
                                            <!-- ProofRails Verification -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #E4E4E7; border-radius: 12px; margin-bottom: 24px;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td style="vertical-align: top; width: 70%;">
                                                                    <h3 style="margin: 0 0 8px 0; color: #18181B; font-size: 16px; font-weight: 700;">✓ ProofRails Verified</h3>
                                                                    <p style="margin: 0 0 16px 0; color: #71717A; font-size: 13px; line-height: 1.5;">
                                                                        This top-up has been verified on the blockchain.
                                                                    </p>
                                                                    <a href="${proofRailsUrl}" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-right: 8px;">
                                                                    View Full Receipt
                                                                    </a>
                                                                   
                                                                </td>
                                                                <td align="center" style="vertical-align: top; width: 30%;">
                                                                    <img src="${qrCodeUrl}" alt="QR Code" style="width: 100px; height: 100px; border-radius: 8px;">
                                                                    <p style="margin: 8px 0 0 0; color: #A1A1AA; font-size: 10px;">Scan to verify</p>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            ` : ''}
                                            
                                            <p style="color: #52525B; font-size: 15px; line-height: 1.6;">
                                                Every deposit brings you closer to your goal. Stay consistent!
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #FAFAFA; padding: 24px; text-align: center; border-top: 1px solid #E4E4E7;">
                                            <p style="margin: 0; color: #A1A1AA; font-size: 12px;">
                                                Savique Protocol • Decentralized Savings on Flare Network
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            break;
        case 'MATURITY_WARNING':
            subject = `Savings Maturing Soon: ${data.purpose}`;
            html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 40px; text-align: center;">
                                            <img src="${logoUrl}" alt="Savique" style="height: 50px; margin-bottom: 16px;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Almost There!</h1>
                                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px;">MATURITY WARNING</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #18181B; margin: 0 0 16px 0; font-size: 22px;">Your Savings is Almost Ready</h2>
                                            <p style="color: #52525B; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                                Your savings goal <strong style="color: ${brandColor};">${data.purpose}</strong> will mature on <strong>${data.unlockDate}</strong>.
                                            </p>
                                            
                                            <!-- Details Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px; border: 1px solid #F59E0B;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="8" cellspacing="0">
                                                            <tr>
                                                                <td style="color: #92400E; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Current Balance</td>
                                                                <td align="right" style="color: #78350F; font-size: 20px; font-weight: 700;">${data.amount} USDT0</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="color: #92400E; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Unlock Date</td>
                                                                <td align="right" style="color: #78350F; font-size: 14px; font-weight: 600;">${data.unlockDate}</td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <p style="color: #52525B; font-size: 15px; line-height: 1.6;">
                                                Stay disciplined! You are almost at the finish line. Once unlocked, you can withdraw your principal plus any success bonus.
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #FAFAFA; padding: 24px; text-align: center; border-top: 1px solid #E4E4E7;">
                                            <p style="margin: 0; color: #A1A1AA; font-size: 12px;">
                                                Savique Protocol • Decentralized Savings on Flare Network
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            break;
        case 'MATURITY_COUNTDOWN':
            const urgencyColor = (data.daysRemaining || 0) <= 1 ? '#EF4444' : (data.daysRemaining || 0) <= 3 ? '#F59E0B' : '#10B981';
            const urgencyBg = (data.daysRemaining || 0) <= 1 ? '#FEF2F2' : (data.daysRemaining || 0) <= 3 ? '#FEF3C7' : '#ECFDF5';
            subject = `⏳ ${data.daysRemaining} Day${(data.daysRemaining || 0) > 1 ? 's' : ''} Left: ${data.purpose}`;
            html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}CC 100%); padding: 40px; text-align: center;">
                                            <img src="${logoUrl}" alt="Savique" style="height: 50px; margin-bottom: 16px;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 48px; font-weight: 700;">${data.daysRemaining}</h1>
                                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 18px; letter-spacing: 2px;">DAY${(data.daysRemaining || 0) > 1 ? 'S' : ''} REMAINING</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #18181B; margin: 0 0 16px 0; font-size: 22px;">Your Savings is Almost Ready!</h2>
                                            <p style="color: #52525B; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                                Your savings goal <strong style="color: ${brandColor};">${data.purpose}</strong> will unlock ${data.daysRemaining === 1 ? 'tomorrow' : `in ${data.daysRemaining} days`}!
                                            </p>
                                            
                                            <!-- Countdown Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${urgencyBg}; border-radius: 12px; margin-bottom: 24px; border: 1px solid ${urgencyColor};">
                                                <tr>
                                                    <td style="padding: 24px; text-align: center;">
                                                        <p style="color: ${urgencyColor}; font-size: 14px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Unlocks On</p>
                                                        <p style="color: #18181B; font-size: 24px; font-weight: 700; margin: 0;">${data.unlockDate}</p>
                                                        ${data.amount ? `<p style="color: #71717A; font-size: 14px; margin: 12px 0 0 0;">Current Balance: <strong>${data.amount} USDT0</strong></p>` : ''}
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <p style="color: #52525B; font-size: 15px; line-height: 1.6;">
                                                Stay strong! You're so close to achieving your goal. Once unlocked, you'll receive your principal plus any success bonus!
                                            </p>
                                            
                                            <div style="text-align: center; margin-top: 24px;">
                                                <a href="https://savique-fb5p.vercel.app/dashboard/savings" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                                    View Your Savings
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #FAFAFA; padding: 24px; text-align: center; border-top: 1px solid #E4E4E7;">
                                            <p style="margin: 0; color: #A1A1AA; font-size: 12px;">
                                                Savique Protocol • Decentralized Savings on Flare Network
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            break;
        case 'GOAL_REMINDER':
            subject = `Don't Forget to Save: ${data.purpose}`;
            html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px; text-align: center;">
                                            <img src="${logoUrl}" alt="Savique" style="height: 50px; margin-bottom: 16px;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Keep Building! 🏗️</h1>
                                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px;">GOAL REMINDER</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #18181B; margin: 0 0 16px 0; font-size: 22px;">Your Goal Awaits!</h2>
                                            <p style="color: #52525B; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                                Your savings goal <strong style="color: ${brandColor};">${data.purpose}</strong> is counting down. Consider adding more funds to reach your target!
                                            </p>
                                            
                                            <!-- Progress Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EFF6FF; border-radius: 12px; margin-bottom: 24px; border: 1px solid #3B82F6;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="8" cellspacing="0">
                                                            ${data.currentBalance ? `
                                                            <tr>
                                                                <td style="color: #1E40AF; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Current Balance</td>
                                                                <td align="right" style="color: #1E3A8A; font-size: 20px; font-weight: 700;">${data.currentBalance} USDT0</td>
                                                            </tr>
                                                            ` : ''}
                                                            ${data.targetAmount ? `
                                                            <tr>
                                                                <td style="color: #1E40AF; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Target Amount</td>
                                                                <td align="right" style="color: #1E3A8A; font-size: 14px; font-weight: 600;">${data.targetAmount} USDT0</td>
                                                            </tr>
                                                            ` : ''}
                                                            ${data.daysRemaining ? `
                                                            <tr>
                                                                <td style="color: #1E40AF; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Days Remaining</td>
                                                                <td align="right" style="color: #1E3A8A; font-size: 14px; font-weight: 600;">${data.daysRemaining} days</td>
                                                            </tr>
                                                            ` : ''}
                                                            <tr>
                                                                <td style="color: #1E40AF; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Unlock Date</td>
                                                                <td align="right" style="color: #1E3A8A; font-size: 14px; font-weight: 600;">${data.unlockDate}</td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <p style="color: #52525B; font-size: 15px; line-height: 1.6;">
                                                💡 <strong>Pro Tip:</strong> Consistent small deposits can make a big difference! Even a small top-up moves you closer to your dreams.
                                            </p>
                                            
                                            <div style="text-align: center; margin-top: 24px;">
                                                <a href="https://savique-fb5p.vercel.app/dashboard/savings" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                                    Top Up Now
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #FAFAFA; padding: 24px; text-align: center; border-top: 1px solid #E4E4E7;">
                                            <p style="margin: 0; color: #A1A1AA; font-size: 12px;">
                                                Savique Protocol • Decentralized Savings on Flare Network
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            break;
        case 'WITHDRAWAL_SUCCESS':
            subject = `Withdrawal Successful: ${data.purpose}`;
            html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px; text-align: center;">
                                            <img src="${logoUrl}" alt="Savique" style="height: 50px; margin-bottom: 16px;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Goal Achieved!</h1>
                                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px;">WITHDRAWAL SUCCESSFUL</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #18181B; margin: 0 0 16px 0; font-size: 22px;">Congratulations!</h2>
                                            <p style="color: #52525B; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                                You've successfully completed your savings goal: <strong style="color: ${brandColor};">${data.purpose}</strong>. Your discipline has paid off!
                                            </p>
                                            
                                            <!-- Transaction Details Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ECFDF5; border-radius: 12px; margin-bottom: 24px; border: 1px solid #10B981;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="8" cellspacing="0">
                                                            <tr>
                                                                <td style="color: #047857; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Amount Withdrawn</td>
                                                                <td align="right" style="color: #065F46; font-size: 20px; font-weight: 700;">${data.amount} USDT0</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="color: #047857; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Status</td>
                                                                <td align="right" style="color: #065F46; font-size: 14px; font-weight: 600;">✓ Completed Successfully</td>
                                                            </tr>
                                                            ${data.txHash ? `
                                                            <tr>
                                                                <td style="color: #047857; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Transaction</td>
                                                                <td align="right">
                                                                    <a href="${explorerUrl}" style="color: ${brandColor}; text-decoration: none; font-size: 12px; font-family: monospace;">${data.txHash?.slice(0, 16)}...</a>
                                                                </td>
                                                            </tr>
                                                            ` : ''}
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            ${data.proofRailsId ? `
                                            <!-- ProofRails Verification -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #E4E4E7; border-radius: 12px; margin-bottom: 24px;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td style="vertical-align: top; width: 70%;">
                                                                    <h3 style="margin: 0 0 8px 0; color: #18181B; font-size: 16px; font-weight: 700;">✓ ProofRails Verified</h3>
                                                                    <p style="margin: 0 0 16px 0; color: #71717A; font-size: 13px; line-height: 1.5;">
                                                                        This withdrawal has been cryptographically verified.
                                                                    </p>
                                                                    <a href="${proofRailsUrl}" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                                                        View Full Receipt
                                                                    </a>
                                                                </td>
                                                                <td align="center" style="vertical-align: top; width: 30%;">
                                                                    <img src="${qrCodeUrl}" alt="QR Code" style="width: 100px; height: 100px; border-radius: 8px;">
                                                                    <p style="margin: 8px 0 0 0; color: #A1A1AA; font-size: 10px;">Scan to verify</p>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            ` : ''}
                                            
                                            <p style="color: #52525B; font-size: 15px; line-height: 1.6;">
                                                Ready for your next savings goal? Start building towards your dreams again!
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #FAFAFA; padding: 24px; text-align: center; border-top: 1px solid #E4E4E7;">
                                            <p style="margin: 0; color: #A1A1AA; font-size: 12px;">
                                                Savique Protocol • Decentralized Savings on Flare Network<br>
                                                <strong style="color: #71717A;">💡 Tip:</strong> Download a PDF copy from the History page in your dashboard.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            break;
        case 'SAVINGS_BROKEN':
            subject = `Savings Broken Early: ${data.purpose}`;
            html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px; text-align: center;">
                                            <img src="${logoUrl}" alt="Savique" style="height: 50px; margin-bottom: 16px;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Commitment Broken</h1>
                                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px;">EARLY WITHDRAWAL</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #18181B; margin: 0 0 16px 0; font-size: 22px;">We Understand Emergencies Happen</h2>
                                            <p style="color: #52525B; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                                You've broken your savings commitment for: <strong style="color: ${brandColor};">${data.purpose}</strong>. While this wasn't the plan, sometimes life gets in the way.
                                            </p>
                                            
                                            <!-- Transaction Details Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px; border: 1px solid #FECACA;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="8" cellspacing="0">
                                                            <tr>
                                                                <td style="color: #991B1B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Amount Recovered</td>
                                                                <td align="right" style="color: #7F1D1D; font-size: 20px; font-weight: 700;">${data.amount} USDT0</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="color: #991B1B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Penalty Applied</td>
                                                                <td align="right" style="color: #DC2626; font-size: 14px; font-weight: 600;">10% + Bonus Forfeiture</td>
                                                            </tr>
                                                            ${data.txHash ? `
                                                            <tr>
                                                                <td style="color: #991B1B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Transaction</td>
                                                                <td align="right">
                                                                    <a href="${explorerUrl}" style="color: ${brandColor}; text-decoration: none; font-size: 12px; font-family: monospace;">${data.txHash?.slice(0, 16)}...</a>
                                                                </td>
                                                            </tr>
                                                            ` : ''}
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            ${data.proofRailsId ? `
                                            <!-- ProofRails Verification -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #E4E4E7; border-radius: 12px; margin-bottom: 24px;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td style="vertical-align: top; width: 70%;">
                                                                    <h3 style="margin: 0 0 8px 0; color: #18181B; font-size: 16px; font-weight: 700;">✓ ProofRails Verified</h3>
                                                                    <p style="margin: 0 0 16px 0; color: #71717A; font-size: 13px; line-height: 1.5;">
                                                                        This transaction has been recorded on the blockchain.
                                                                    </p>
                                                                    <a href="${proofRailsUrl}" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                                                        View Full Receipt
                                                                    </a>
                                                                </td>
                                                                <td align="center" style="vertical-align: top; width: 30%;">
                                                                    <img src="${qrCodeUrl}" alt="QR Code" style="width: 100px; height: 100px; border-radius: 8px;">
                                                                    <p style="margin: 8px 0 0 0; color: #A1A1AA; font-size: 10px;">Scan to verify</p>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            ` : ''}
                                            
                                            <div style="background-color: #FEF9C3; border-radius: 8px; padding: 16px; border: 1px solid #FDE047;">
                                                <p style="margin: 0; color: #713F12; font-size: 14px; line-height: 1.5;">
                                                    💡 <strong>Pro Tip:</strong> Consider creating a separate "Emergency Fund" savings in the future. This way, you can handle unexpected expenses without breaking your main savings goals.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #FAFAFA; padding: 24px; text-align: center; border-top: 1px solid #E4E4E7;">
                                            <p style="margin: 0; color: #A1A1AA; font-size: 12px;">
                                                Savique Protocol • Decentralized Savings on Flare Network<br>
                                                <strong style="color: #71717A;">💡 Tip:</strong> Download a PDF copy from the History page in your dashboard.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            break;
        case 'TRANSACTION_FAILED':
            subject = `Transaction Failed: ${data.purpose}`;
            html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px; text-align: center;">
                                            <img src="${logoUrl}" alt="Savique" style="height: 50px; margin-bottom: 16px;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Transaction Failed</h1>
                                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px;">ACTION REQUIRED</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #18181B; margin: 0 0 16px 0; font-size: 22px;">Something went wrong</h2>
                                            <p style="color: #52525B; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                                We encountered an issue while processing your transaction for: <strong style="color: #EF4444;">${data.purpose}</strong>.
                                            </p>
                                            
                                            <!-- Details Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px; border: 1px solid #FEE2E2;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="8" cellspacing="0">
                                                            <tr>
                                                                <td style="color: #991B1B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Amount Attempted</td>
                                                                <td align="right" style="color: #991B1B; font-size: 20px; font-weight: 700;">${data.amount} USDT0</td>
                                                            </tr>
                                                            ${data.txHash ? `
                                                            <tr>
                                                                <td style="color: #991B1B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Transaction Hash</td>
                                                                <td align="right">
                                                                    <a href="${explorerUrl}" style="color: ${brandColor}; text-decoration: none; font-size: 12px; font-family: monospace;">${data.txHash?.slice(0, 16)}...</a>
                                                                </td>
                                                            </tr>
                                                            ` : ''}
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <div style="background-color: #F8FAFC; border-radius: 8px; padding: 16px; border: 1px solid #E2E8F0; margin-bottom: 24px;">
                                                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                                                    <strong>Possible Reasons:</strong><br>
                                                    • Insufficient USDT0 balance for the transaction.<br>
                                                    • Network congestion on Flare Coston2.<br>
                                                    • Transaction timed out or was manually rejected in wallet.
                                                </p>
                                            </div>

                                            <div style="text-align: center;">
                                                <a href="https://savique-fb5p.vercel.app/dashboard" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                                    Try Again in Dashboard
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #FAFAFA; padding: 24px; text-align: center; border-top: 1px solid #E4E4E7;">
                                            <p style="margin: 0; color: #A1A1AA; font-size: 12px;">
                                                Savique Protocol • Decentralized Savings on Flare Network
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            break;
    }

    try {
        await transporter.sendMail({
            from: `"Savique Protocol" <${SMTP_USER}>`,
            to: data.userEmail,
            subject: subject,
            html: html,
        });
        console.log(`[EmailService] Email sent to ${data.userEmail} for ${type}`);
    } catch (error) {
        console.error('[EmailService] Failed to send email:', error);
        throw error;
    }
}
