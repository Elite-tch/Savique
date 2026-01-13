"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, PlusCircle, History, LogOut, Wallet, User, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { logout, login, user, authenticated, ready } = usePrivy();
    const pathname = usePathname();

    const walletAddress = authenticated && user?.wallet?.address ? user.wallet.address : null;
    const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "";

    return (
        <div className="min-h-screen flex bg-black text-white selection:bg-primary/30">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 flex flex-col fixed h-full glass z-20">
                <Link href="/">
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
                        />
                        <NavItem
                            href="/dashboard/vaults"
                            icon={<Lock className="w-5 h-5" />}
                            label="My Vaults"
                            active={pathname.startsWith("/dashboard/vaults")}
                        />
                        <NavItem
                            href="/dashboard/create"
                            icon={<PlusCircle className="w-5 h-5" />}
                            label="New Vault"
                            active={pathname.startsWith("/dashboard/create")}
                        />
                        <NavItem
                            href="/dashboard/history"
                            icon={<History className="w-5 h-5" />}
                            label="History"
                            active={pathname.startsWith("/dashboard/history")}
                        />
                    </div>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-xs text-center text-gray-500 mb-2">SafeVault v1.0</p>
                    </div>
                </div>
            </aside>

            {/* Main Wrapper */}
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-20 border-b border-white/10 glass sticky top-0 z-10 px-8 flex items-center justify-between">
                    <div className="flex-1 mr-4">
                        <MotivationalHeader />
                    </div>

                    <div className="flex items-center gap-4">
                        {ready && authenticated && walletAddress ? (
                            <>
                                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                                    <span className="text-sm font-medium text-gray-200">{shortAddress}</span>
                                </div>
                                <Button onClick={logout} variant="ghost" size="icon" className="text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-full">
                                    <LogOut className="w-5 h-5" />
                                </Button>
                            </>
                        ) : (
                            <Button onClick={login} className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-full">
                                <Wallet className="w-4 h-4" /> Connect Wallet
                            </Button>
                        )}
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
    return (
        <Link href={href}>
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
