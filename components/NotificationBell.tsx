import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { AppNotification, subscribeToNotifications, markAsRead } from '@/lib/notificationService';
import Link from 'next/link';

export function NotificationBell() {
    const { address } = useAccount();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!address) return;
        console.log('[NotificationBell] Subscribing for:', address);
        const unsubscribe = subscribeToNotifications(address, (data) => {
            console.log('[NotificationBell] Received notifications:', data);
            setNotifications(data);
        });
        return () => unsubscribe();
    }, [address]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id: string) => {
        markAsRead(id);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4 h-4 text-orange-400" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
            case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black"
                    />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute  right-[-120px] md:right-0  mt-2 w-80 md:w-96 bg-black backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-semibold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>

                        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${!notification.read ? 'bg-primary/5' : ''}`}
                                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                                    >
                                        <div className="flex gap-3 items-start">
                                            <div className="mt-1 shrink-0">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-gray-400'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-gray-600 whitespace-nowrap ml-2">
                                                        {new Date(notification.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <div className="flex md:items-center  justify-between md:flex-row flex-col gap-3 mt-2">
                                                    {notification.link && (
                                                        <Link href={notification.link} className="inline-flex items-center gap-1 text-xs text-primary hover:underline" onClick={() => setIsOpen(false)}>
                                                            View Details <ExternalLink className="w-3 h-3" />
                                                        </Link>
                                                    )}
                                                    {notification.receiptId && (
                                                        <a
                                                            href={`https://proofrails-clone-middleware.onrender.com/receipt/${notification.receiptId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs text-gray-400 border- hover:text-white hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            View Receipt <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
