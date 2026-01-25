"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { subscribeToAuth } from "@/lib/authService";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = subscribeToAuth((user) => {
            if (user) {
                setAuthorized(true);
                // If on login page, redirect to dashboard
                if (pathname === "/admin/login") {
                    router.push("/admin/dashboard");
                }
            } else {
                setAuthorized(false);
                // If NOT on login page, redirect to login
                if (pathname !== "/admin/login") {
                    router.push("/admin/login");
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pathname, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen text-white">
            {children}
        </div>
    );
}
