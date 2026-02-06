"use client";

import { useState } from "react";
import { loginAdmin } from "@/lib/authService";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await loginAdmin(email, password);
            router.push("/admin/dashboard");
        } catch (err: any) {
            console.error(err);
            setError("Invalid credentials or access denied.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black/95 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
            </div>

            <Card className="w-full max-w-md p-8 bg-black/50 border-white/10 backdrop-blur-xl relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="relative w-12 h-12 mb-4">
                        <Image src="/logo3.png" alt="Logo" fill className="object-contain opacity-80" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Console</h1>
                    <p className="text-gray-500 text-sm">Restricted Access Only</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Admin Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                            required
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 mt-3"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authenticate"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
