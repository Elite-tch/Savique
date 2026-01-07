"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Shield, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateGroupVault() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        purpose: "",
        threshold: "1",
    });
    const [members, setMembers] = useState<string[]>([""]); // Start with 1 empty field

    const addMember = () => setMembers([...members, ""]);
    const removeMember = (idx: number) => setMembers(members.filter((_, i) => i !== idx));
    const updateMember = (idx: number, val: string) => {
        const newM = [...members];
        newM[idx] = val;
        setMembers(newM);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Creating group vault...", { ...formData, members });
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/dashboard/create" className="text-gray-400 hover:text-white flex items-center gap-2 mb-6 text-sm">
                <ArrowLeft className="w-4 h-4" /> Back to selection
            </Link>

            <Card className="p-8">
                <div className="mb-8">
                    <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4 text-pink-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">New Group Vault</h2>
                    <p className="text-gray-400">Collaborative savings with multi-signature control.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Purpose */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Group Goal</label>
                        <input
                            type="text"
                            placeholder="e.g. Community Event Fund"
                            required
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                        />
                    </div>

                    {/* Members */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Invite Members (Wallet Addresses)</label>
                        {members.map((member, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex gap-2"
                            >
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                                    value={member}
                                    onChange={(e) => updateMember(i, e.target.value)}
                                />
                                {members.length > 1 && (
                                    <button type="button" onClick={() => removeMember(i)} className="p-3 text-gray-500 hover:text-red-400">
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                        <button type="button" onClick={addMember} className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
                            <Plus className="w-4 h-4" /> Add another member
                        </button>
                    </div>

                    {/* Threshold */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Approval Threshold</label>
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-medium">Required Votes for Payout</span>
                                <span className="text-primary font-bold">{formData.threshold} / {members.length}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max={members.length || 1}
                                value={formData.threshold}
                                onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                                className="w-full accent-primary h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                {parseInt(formData.threshold) === members.length
                                    ? "Unanimous approval required."
                                    : parseInt(formData.threshold) > members.length / 2
                                        ? "Majority approval required."
                                        : "Minority can approve (High Risk)."}
                            </p>
                        </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full mt-4">
                        Initialize Group Vault
                    </Button>
                </form>
            </Card>
        </div>
    );
}
