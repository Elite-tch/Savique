"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, PlusCircle, History, LogOut, Wallet, User, Lock, Menu, X } from "lucide-react";
import { useDisconnect } from "wagmi";

import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { getUserVaultsFromDb } from "@/lib/receiptService";
import { createNotification } from "@/lib/notificationService";
import { usePublicClient } from "wagmi";
import { CONTRACTS, VAULT_ABI } from "@/lib/contracts";

function useDeadlinePulse(address?: string) {
    const publicClient = usePublicClient();

    useEffect(() => {
        if (!address || !publicClient) return;

        const checkDeadlines = async () => {
            try {
                // Get vaults
                const vaults = await getUserVaultsFromDb(address);

                for (const vaultAddr of vaults) {
                    try {
                        const unlockTime = await publicClient.readContract({
                            address: vaultAddr as `0x${string}`,
                            abi: VAULT_ABI,
                            functionName: "unlockTimestamp"
                        });

                        const unlockDate = new Date(Number(unlockTime) * 1000);
                        const now = new Date();
                        const diffHours = (unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                        // Check if within 24 hours and not expired
                        if (diffHours > 0 && diffHours <= 24) {
                            const key = `notified_deadline_${vaultAddr}_${unlockDate.getDate()}`;
                            const notified = localStorage.getItem(key);

                            if (!notified) {
                                await createNotification(
                                    address,
                                    "Vault Unlocking Soon",
                                    `Your vault is set to unlock in less than ${Math.ceil(diffHours)} hours. Get ready!`,
                                    'info',
                                    `/dashboard/vaults/${vaultAddr}`
                                );
                                localStorage.setItem(key, "true");
                            }
                        }
                    } catch (e) {
                        console.error("Error checking vault deadline:", e);
                    }
                }
            } catch (e) {
                console.error("Pulse check failed:", e);
            }
        };

        checkDeadlines();
    }, [address, publicClient]);
}

const QUOTES = [
    "Consistency is the key to financial freedom.",
    "Small savings today, big vaults tomorrow.",
    "Your future self will thank you.",
    "Discipline is the bridge to goals.",
    "Every deposit counts.",
    "Protecting your assets, securing your life."
];

function MotivationalHeader() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % QUOTES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="h-full flex items-center overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.p
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="text-sm md:text-base font-medium text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 italic"
                >
                    "{QUOTES[index]}"
                </motion.p>
            </AnimatePresence>
        </div>
    );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
    return (
        <>
            <Link href="/" onClick={onNavigate}>
                <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                            src="/logo.png"
                            alt="SafeVault Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        SafeVault
                    </span>
                </div>
            </Link>

            <nav className="flex-1 px-4 py-8 space-y-2">
                <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Menu</p>
                <div className="flex flex-col gap-2">
                    <NavItem
                        href="/dashboard"
                        icon={<LayoutDashboard className="w-5 h-5" />}
                        label="Overview"
                        active={pathname === "/dashboard"}
                        onClick={onNavigate}
                    />
                    <NavItem
                        href="/dashboard/vaults"
                        icon={<Lock className="w-5 h-5" />}
                        label="My Vaults"
                        active={pathname.startsWith("/dashboard/vaults")}
                        onClick={onNavigate}
                    />
                    <NavItem
                        href="/dashboard/create"
                        icon={<PlusCircle className="w-5 h-5" />}
                        label="New Vault"
                        active={pathname.startsWith("/dashboard/create")}
                        onClick={onNavigate}
                    />
                    <NavItem
                        href="/dashboard/history"
                        icon={<History className="w-5 h-5" />}
                        label="History"
                        active={pathname.startsWith("/dashboard/history")}
                        onClick={onNavigate}
                    />
                </div>
            </nav>

            <div className="p-4 border-t border-white/10">
                <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-center text-gray-500 mb-2">SafeVault v1.0</p>
                </div>
            </div>
        </>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { logout, login, user, authenticated, ready } = usePrivy();
    const { disconnect } = useDisconnect();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const walletAddress = authenticated && user?.wallet?.address ? user.wallet.address : undefined;
    useDeadlinePulse(walletAddress);

    const handleLogout = async () => {
        await logout();
        disconnect();
    };


    const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "";

    return (
        <div className="min-h-screen flex bg-black text-white selection:bg-primary/30">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 border-r border-white/10 flex flex-col fixed h-full glass z-20">
                <SidebarContent pathname={pathname} />
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 20 }}
                            className="fixed inset-y-0 left-0 w-64 bg-black border-r border-white/10 flex flex-col z-50 md:hidden"
                        >
                            <SidebarContent pathname={pathname} onNavigate={() => setIsMobileMenuOpen(false)} />
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Wrapper */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
                {/* Header */}
                <header className="h-20 border-b border-white/10 glass sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 mr-4">

                        <div className="flex-1 overflow-hidden">
                            <MotivationalHeader />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {ready && authenticated && walletAddress ? (
                            <>
                                <NotificationBell />
                                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                                    <span className="text-sm font-medium text-gray-200">{shortAddress}</span>
                                </div>
                                <Button onClick={handleLogout} variant="ghost" size="icon" className="text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-full">
                                    <LogOut className="w-5 h-5" />
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => login()} className="gap-2 md:py-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-full">
                                <Wallet className="w-4 hidden sm:inline h-4" /> <span className="">Connect Wallet</span>
                            </Button>
                        )}
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>

                {/* Mobile Menu FAB */}
                <Button
                    size="icon"
                    className="fixed bottom-6 flex gap-2 px-3 right-6 z-50 md:hidden rounded-full shadow-lg shadow-primary/25 bg-primary text-white hover:bg-primary/90 h-12 w-fit"
                    onClick={() => setIsMobileMenuOpen(true)}
                >
                    <Menu className="w-6 h-6" />  <span className="text-xl">Menu</span>
                </Button>
            </div>
        </div>
    );
}

function NavItem({ href, icon, label, active, onClick }: { href: string; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
    return (
        <Link href={href} onClick={onClick}>
            <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${active
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}>
                <div className={`${active ? "text-white" : "text-gray-500 group-hover:text-white transition-colors"}`}>
                    {icon}
                </div>
                <span className="font-medium">{label}</span>
            </div>
        </Link>
    );
}
