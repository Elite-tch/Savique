import { NextRequest, NextResponse } from 'next/server';
import { sendNotificationEmail, EmailType } from '@/lib/emailService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            type,
            userEmail,
            purpose,
            amount,
            txHash,
            unlockDate,
            proofRailsId,
            daysRemaining,
            targetAmount,
            currentBalance
        } = body;

        if (!type || !userEmail || !purpose) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await sendNotificationEmail(type as EmailType, {
            userEmail,
            purpose,
            amount: amount || '0',
            txHash,
            unlockDate,
            proofRailsId,
            daysRemaining,
            targetAmount,
            currentBalance
        });

        return NextResponse.json({ success: true, message: 'Notification sent' });
    } catch (error: any) {
        console.error('[API Notify] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
