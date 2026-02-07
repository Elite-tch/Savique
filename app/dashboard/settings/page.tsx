"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "wagmi";
import { Mail, Shield, Bell, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { getUserProfile, updateUserProfile, UserProfile } from "@/lib/userService";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SettingsPage() {
    const { address, isConnected } = useAccount();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [email, setEmail] = useState("");
    const [preferences, setPreferences] = useState({
        deposits: true,
        withdrawals: true,
        maturityWarnings: true
    });

    const toastStyle = {
        className: "bg-primary/10 border-primary/20 text-primary",
        style: {
            backgroundColor: 'rgba(230, 32, 88, 0.1)',
            borderColor: 'rgba(230, 32, 88, 0.2)',
            color: '#E62058'
        }
    };

    useEffect(() => {
        const loadProfile = async () => {
            if (!address) return;
            try {
                const profile = await getUserProfile(address);
                if (profile) {
                    setEmail(profile.email || "");
                    setPreferences(profile.notificationPreferences);
                }
            } catch (error) {
                console.error("Failed to load profile:", error);
            } finally {
                setLoading(false);
            }
        };

        if (isConnected) {
            loadProfile();
        }
    }, [address, isConnected]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address) return;

        setSaving(true);
        try {
            await updateUserProfile(address, {
                email,
                notificationPreferences: preferences
            });
            toast.success("Profile updated successfully!", toastStyle);
        } catch (error) {
            toast.error("Failed to update profile", toastStyle);
        } finally {
            setSaving(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="p-12 text-center max-w-md bg-white/5 border-white/10">
                    <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-400">Please connect your wallet to manage your profile and notifications.</p>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
                <p className="text-zinc-500 mt-1">Manage your professional notifications and profile security.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left: Main Settings */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="p-8 bg-zinc-900/40 border-zinc-800/50">
                        <form onSubmit={handleSave} className="space-y-8">
                            {/* Email Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <Mail className="w-5 h-5 text-primary" />
                                    <h3>Email Notifications</h3>
                                </div>
                                <p className="text-sm text-zinc-500">
                                    Receive verified ProofRails receipts and maturity alerts directly in your inbox.
                                </p>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                                    <Input
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="bg-black/40 border-zinc-800 text-white h-12 rounded-xl focus:border-primary/50 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Preferences Section */}
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <Bell className="w-5 h-5 text-primary" />
                                    <h3>Notification Toggles</h3>
                                </div>
                                <div className="space-y-3">
                                    <PreferenceToggle
                                        label="New Deposits"
                                        description="Get an email receipt every time you fund a Savings account."
                                        enabled={preferences.deposits}
                                        onChange={(v) => setPreferences({ ...preferences, deposits: v })}
                                    />
                                    <PreferenceToggle
                                        label="Withdrawals & Closure"
                                        description="Notifications for successful maturity withdrawals or early exits."
                                        enabled={preferences.withdrawals}
                                        onChange={(v) => setPreferences({ ...preferences, withdrawals: v })}
                                    />
                                    <PreferenceToggle
                                        label="Maturity Warnings"
                                        description="We'll email you 7 days before your lock expires."
                                        enabled={preferences.maturityWarnings}
                                        onChange={(v) => setPreferences({ ...preferences, maturityWarnings: v })}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={saving}
                                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    "Save Profile"
                                )}
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Right: Security info */}
                <div className="space-y-6">
                    <Card className="p-6 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 border-zinc-800/50">
                        <div className="flex items-center gap-2 text-white font-bold mb-4">
                            <Shield className="w-5 h-5 text-emerald-500" />
                            <h3>Privacy & Identity</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2">
                                <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest leading-none">Identity Linked</p>
                                <p className="text-xs font-mono text-zinc-400 break-all">{address}</p>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Your email is stored securely in our encrypted vault and only used for transactional notifications. We never share your data.
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                End-to-end Verified
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-zinc-900/40 border-zinc-800/50">
                        <h4 className="text-sm font-bold text-white mb-2">Need Help?</h4>
                        <p className="text-xs text-zinc-500 mb-4 tracking-tight">
                            If you're not receiving emails, check your spam folder or ensure your SMTP settings are correct.
                        </p>
                        <Button variant="outline" className="w-full text-xs font-bold border-zinc-800 hover:bg-white/5 text-zinc-400">
                            Contact Support
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function PreferenceToggle({ label, description, enabled, onChange }: { label: string, description: string, enabled: boolean, onChange: (v: boolean) => void }) {
    return (
        <div className="flex md:items-center gap-3 md:justify-between md:flex-row flex-col p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
            <div className="space-y-0.5">
                <p className="text-sm font-bold text-white">{label}</p>
                <p className="text-xs text-zinc-500">{description}</p>
            </div>
            <div className="flex justify-end">
                <button
                type="button"
                onClick={() => onChange(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-primary' : 'bg-zinc-700'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            </div>
        </div>
    );
}
