"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { subscribeToAuth, logoutAdmin } from "@/lib/authService";
import {
    Loader2,
    Shield,
    LayoutDashboard,
    Users,
    Wallet,
    XCircle,
    CheckCircle2,
    LogOut,
    Menu,
    X
} from "lucide-react";
import Link from "next/link";
import { AdminEcosystemProvider, useAdminEcosystem, AdminEcosystem } from "./AdminEcosystemContext";

function EcosystemToggle() {
    const { ecosystem, setEcosystem } = useAdminEcosystem();

    return (
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl h-10">
            {(['all', 'flare', 'solana'] as const).map((e) => (
                <button
                    key={e}
                    onClick={() => setEcosystem(e)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${ecosystem === e
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    {e === 'all' ? 'All Hubs' : e}
                </button>
            ))}
        </div>
    );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToAuth((user) => {
            if (user) {
                setAuthorized(true);
                if (pathname === "/admin/login") {
                    router.push("/admin/dashboard");
                }
            } else {
                setAuthorized(false);
                if (pathname !== "/admin/login") {
                    router.push("/admin/login");
                }
            }
        });

        return () => unsubscribe();
    }, [pathname, router]);

    const isLoginPage = pathname === "/admin/login";

    if (isLoginPage) {
        return <div className="bg-black min-h-screen text-white">{children}</div>;
    }

    return (
        <div className="flex min-h-screen bg-[#050505] text-white">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-40">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                        <Image src="/logo3.png" alt="Logo" fill className="object-contain" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <EcosystemToggle />
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 border-r border-white/5 bg-black/50 backdrop-blur-xl flex flex-col fixed h-full z-40 transition-transform duration-300
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6">
                    <Link href="/" onClick={() => setSidebarOpen(false)}>
                        <div className="h-20 flex items-center gap-3 px-2 border-b border-white/5 mb-6">
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

                    <nav className="space-y-1">
                        <SidebarLink
                            href="/admin/dashboard"
                            icon={<LayoutDashboard size={20} />}
                            label="Overview"
                            active={pathname === '/admin/dashboard'}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <SidebarLink
                            href="/admin/users"
                            icon={<Users size={20} />}
                            label="User Directory"
                            active={pathname === '/admin/users'}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <SidebarLink
                            href="/admin/active"
                            icon={<Wallet size={20} />}
                            label="Active Savings"
                            active={pathname === '/admin/active'}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <SidebarLink
                            href="/admin/broken"
                            icon={<XCircle size={20} />}
                            label="Broken Savings"
                            active={pathname === '/admin/broken'}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <SidebarLink
                            href="/admin/completed"
                            icon={<CheckCircle2 size={20} />}
                            label="Completed Goals"
                            active={pathname === '/admin/completed'}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <SidebarLink
                            href="/admin/beneficiary-releases"
                            icon={<Shield size={20} />}
                            label="Beneficiary Releases"
                            active={pathname === '/admin/beneficiary-releases'}
                            onClick={() => setSidebarOpen(false)}
                        />
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-white/5">
                    <button onClick={logoutAdmin} className="flex items-center gap-3 text-gray-400 hover:text-red-500 transition-colors w-full py-2">
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                {/* Desktop Top Bar */}
                <header className="hidden lg:flex h-16 fixed top-0 left-64 right-0 bg-black/20 backdrop-blur-md border-b border-white/5 items-center justify-between px-8 z-30">
                    <div className="flex items-center gap-2 text-zinc-500">
                        <Shield className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Administrative Terminal</span>
                    </div>
                    <EcosystemToggle />
                </header>

                <main className="flex-1 p-4 md:p-8 pt-24 lg:pt-24 transition-all overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = subscribeToAuth(() => {
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
        );
    }

    return (
        <AdminEcosystemProvider>
            <AdminLayoutContent children={children} />
        </AdminEcosystemProvider>
    );
}

function SidebarLink({ href, icon, label, active, onClick }: { href: string, icon: React.ReactNode, label: string, active: boolean, onClick?: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${active ? 'bg-red-600/10 text-red-500 border border-red-600/20 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </Link>
    );
}

