"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, PlusCircle, History, LogOut, Wallet, User, Lock, Menu, X, BarChart3, Lightbulb, Settings } from "lucide-react";
import { useDisconnect, useAccount } from "wagmi";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { useEcosystemAccount } from "@/hooks/useEcosystemAccount";
import { EcosystemModal } from "@/components/EcosystemModal";
import { useEcosystem } from "@/context/EcosystemContext";
import { getUserVaultsFromDb } from "@/lib/receiptService";
import { createNotification } from "@/lib/notificationService";
import { usePublicClient } from "wagmi";
import { CONTRACTS, VAULT_ABI } from "@/lib/contracts";
import { ReceiptSync } from "@/components/ReceiptSync";

function useDeadlinePulse(address?: string) {
    const publicClient = usePublicClient();

    useEffect(() => {
        if (!address || !publicClient) return;

        const checkDeadlines = async () => {
            try {
                // Get vaults
                const vaults = await getUserVaultsFromDb(address);
                if (!vaults || vaults.length === 0) return;

                console.log(`[Pulse] Checking ${vaults.length} vaults for deadlines...`);

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
                                    "Savings Unlocking Soon",
                                    `Your Savings is set to unlock in less than ${Math.ceil(diffHours)} hours. Get ready!`,
                                    'info',
                                    `/dashboard/savings/${vaultAddr}`
                                );
                                localStorage.setItem(key, "true");
                            }
                        }

                        // Small delay to reduce RPC pressure
                        await new Promise(resolve => setTimeout(resolve, 200));

                    } catch (e) {
                        // Just log and continue to next vault
                        console.warn(`[Pulse] Failed to check vault ${vaultAddr}:`, e);
                    }
                }
            } catch (e) {
                console.error("[Pulse] Critical check failure:", e);
            }
        };

        checkDeadlines();
    }, [address, publicClient]);
}

const QUOTES = [
    "Consistency is the key to financial freedom.",
    "Small savings today, big saves tomorrow.",
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
                            src="/logo3.png"
                            alt="Savique Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Savique
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
                        href="/dashboard/savings"
                        icon={<Lock className="w-5 h-5" />}
                        label="My Savings"
                        active={pathname.startsWith("/dashboard/savings")}
                        onClick={onNavigate}
                    />
                    <NavItem
                        href="/dashboard/create"
                        icon={<PlusCircle className="w-5 h-5" />}
                        label="Create Savings"
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
                    <NavItem
                        href="/dashboard/analysis"
                        icon={<BarChart3 className="w-5 h-5" />}
                        label="Analysis"
                        active={pathname.startsWith("/dashboard/analysis")}
                        onClick={onNavigate}
                    />
                    <NavItem
                        href="/dashboard/tips"
                        icon={<Lightbulb className="w-5 h-5" />}
                        label="Savings Tips"
                        active={pathname.startsWith("/dashboard/tips")}
                        onClick={onNavigate}
                    />
                    <NavItem
                        href="/dashboard/settings"
                        icon={<Settings className="w-5 h-5" />}
                        label="Settings"
                        active={pathname.startsWith("/dashboard/settings")}
                        onClick={onNavigate}
                    />
                </div>
            </nav>

            <div className="p-4 border-t border-white/10">
                {/* Mobile-only wallet connect info */}
                <div className="md:hidden mb-4">
                    <ConnectButton
                        accountStatus="full"
                        showBalance={false}
                        chainStatus="icon"
                    />
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-center text-gray-500 mb-2">Savique v1.0</p>
                </div>
            </div>
        </>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { address, isConnected } = useEcosystemAccount();
    const { address: walletAddress, isConnected: isFlareConnected } = useAccount();
    const { connected: isSolanaConnected, disconnect: disconnectSolana, publicKey } = useWallet();
    const { setVisible: setSolanaModalVisible } = useWalletModal();
    const { disconnect: disconnectFlare } = useDisconnect();
    const { ecosystem, clearEcosystem, isFlare, isSolana } = useEcosystem();

    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isEcosystemModalOpen, setIsEcosystemModalOpen] = useState(false);
    const [isSolanaAccountMenuOpen, setIsSolanaAccountMenuOpen] = useState(false);

    useDeadlinePulse(address);

    const handleLogout = () => {
        if (isFlareConnected) disconnectFlare();
        if (isSolanaConnected) disconnectSolana();
        clearEcosystem();
    };

    const solanaAddress = publicKey?.toBase58();

    const shortAddress = isFlareConnected
        ? (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "")
        : (isSolanaConnected && solanaAddress ? `${solanaAddress.slice(0, 4)}...${solanaAddress.slice(-4)}` : "");

    return (
        <div className="min-h-screen flex bg-black text-white selection:bg-primary/30">
            {/* Ecosystem Selection Modal */}
            <EcosystemModal
                isOpen={isEcosystemModalOpen}
                onClose={() => setIsEcosystemModalOpen(false)}
                onSelectFlare={() => {
                    // This will be handled by the ConnectButton.Custom wrapper in the header
                }}
                onSelectSolana={() => {
                    setSolanaModalVisible(true);
                }}
            />
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
                        {isConnected ? (
                            <div className="flex items-center md:gap-4">
                                <NotificationBell />
                                {isFlareConnected && <ReceiptSync />}
                                <div className="hidden md:block">
                                    {isFlareConnected ? (
                                        <ConnectButton
                                            accountStatus="address"
                                            showBalance={false}
                                            chainStatus="icon"
                                        />
                                    ) : (
                                        <div className="relative">
                                            <Button
                                                variant="outline"
                                                className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
                                                onClick={() => setIsSolanaAccountMenuOpen(!isSolanaAccountMenuOpen)}
                                            >
                                                <div className="w-2 h-2 rounded-full bg-cyan-400 mr-2 animate-pulse" />
                                                {shortAddress || "Solana Connected"}
                                            </Button>

                                            {/* Solana Account Dropdown */}
                                            <AnimatePresence>
                                                {isSolanaAccountMenuOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIsSolanaAccountMenuOpen(false)} />
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl z-50 p-2 backdrop-blur-xl"
                                                        >
                                                            <div className="p-3 border-b border-white/5 mb-1">
                                                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-1">Solana Wallet</p>
                                                                <p className="text-sm font-mono text-gray-300 truncate px-1">{solanaAddress}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setSolanaModalVisible(true);
                                                                    setIsSolanaAccountMenuOpen(false);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2"
                                                            >
                                                                <Wallet className="w-4 h-4" /> Change Wallet
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    handleLogout();
                                                                    setIsSolanaAccountMenuOpen(false);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors flex items-center gap-2"
                                                            >
                                                                <LogOut className="w-4 h-4" /> Disconnect
                                                            </button>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <ConnectButton.Custom>
                                {({ openConnectModal }) => (
                                    <Button
                                        onClick={() => {
                                            // Provide the connect function to the window so the modal can call it
                                            (window as any).openFlareConnect = openConnectModal;
                                            setIsEcosystemModalOpen(true);
                                        }}
                                        className="gap-2 md:py-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-full"
                                    >
                                        <Wallet className="w-4 hidden sm:inline h-4" /> <span className="">Connect Wallet</span>
                                    </Button>
                                )}
                            </ConnectButton.Custom>
                        )}
                    </div>
                </header >

                {/* Content */}
                < main className="flex-1 p-4 md:p-8 overflow-x-hidden" >
                    <div className="max-w-7xl mx-auto w-full">
                        {children}

                    </div>
                </main >

                {/* Mobile Menu FAB */}
                < Button
                    size="icon"
                    className="fixed bottom-6 flex gap-2 px-3 right-6 z-50 md:hidden rounded-full shadow-lg shadow-primary/25 bg-primary text-white hover:bg-primary/90 h-12 w-fit"
                    onClick={() => setIsMobileMenuOpen(true)
                    }
                >
                    <Menu className="w-6 h-6" />  <span className="text-xl">Menu</span>
                </Button >
            </div >
        </div >
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
