import { db } from './firebase';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    Timestamp,
    limit,
    updateDoc,
    doc,
    onSnapshot
} from 'firebase/firestore';

export interface AppNotification {
    id: string;
    recipient: string; // Wallet address
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
    timestamp: number;
    read: boolean;
    link?: string; // Optional URL to navigate to
    receiptId?: string; // Optional ProofRails Receipt ID
}

const NOTIFICATION_COLLECTION = 'notifications';

/**
 * Create a new notification for a specific user.
 */
export async function createNotification(
    recipient: string,
    title: string,
    message: string,
    type: AppNotification['type'] = 'info',
    link?: string,
    receiptId?: string
) {
    try {
        console.log('[Notification] Creating notification:', { recipient, title, message, type, link, receiptId });
        await addDoc(collection(db, NOTIFICATION_COLLECTION), {
            recipient: recipient.toLowerCase(),
            title,
            message,
            type,
            timestamp: Date.now(),
            read: false,
            link: link || null,
            receiptId: receiptId || null
        });
        console.log(`[Notification] Created for ${recipient}: ${title}`);
    } catch (error) {
        console.error('[Notification] Error creating notification:', error);
    }
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string) {
    try {
        const docRef = doc(db, NOTIFICATION_COLLECTION, notificationId);
        await updateDoc(docRef, { read: true });
    } catch (error) {
        console.error('[Notification] Error marking as read:', error);
    }
}

/**
 * Mark all unread notifications as read.
 */
export async function markAllAsRead(notificationIds: string[]) {
    try {
        await Promise.all(notificationIds.map(id => {
            const docRef = doc(db, NOTIFICATION_COLLECTION, id);
            return updateDoc(docRef, { read: true });
        }));
    } catch (error) {
        console.error('[Notification] Error marking all as read:', error);
    }
}

/**
 * Subscribe to notifications for a user (Real-time).
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
    walletAddress: string,
    callback: (notifications: AppNotification[]) => void
) {
    const q = query(
        collection(db, NOTIFICATION_COLLECTION),
        where('recipient', '==', walletAddress.toLowerCase()),
        orderBy('timestamp', 'desc'),
        limit(20)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications: AppNotification[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            notifications.push({
                id: doc.id,
                recipient: data.recipient,
                title: data.title,
                message: data.message,
                type: data.type,
                timestamp: data.timestamp,
                read: data.read,
                link: data.link,
                receiptId: data.receiptId
            });
        });
        callback(notifications);
    }, (error) => {
        console.error('[NotificationService] Subscription error:', error);
    });
}
