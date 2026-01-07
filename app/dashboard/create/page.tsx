"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, User, ArrowRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function CreateVaultPage() {
    const router = useRouter();
    const [selectedType, setSelectedType] = useState<"personal" | "group" | null>(null);

    // Step 1: Select Type
    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Create New Vault</h1>
                <p className="text-gray-400">Choose the type of savings plan you want to start.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card
                        className={`cursor-pointer border-2 transition-all p-8 h-full flex flex-col justify-between ${selectedType === 'personal' ? 'border-primary bg-primary/5' : 'border-transparent hover:border-white/20'}`}
                    >
                        <div onClick={() => setSelectedType("personal")}>
                            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
                                <User className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Personal Savings</h3>
                            <p className="text-gray-400 mb-6">
                                Lock funds for your own goals. Set a maturity date and strict penalties for early withdrawal.
                            </p>
                            <ul className="space-y-2 mb-8 text-sm text-gray-500">
                                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Full Self-Custody</li>
                                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Enforced Discipline</li>
                            </ul>
                        </div>

                        <Button
                            onClick={() => router.push("/dashboard/create/personal")}

                            className="w-full"
                        >
                            Create Personal Vault
                        </Button>
                    </Card>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card
                        className={`cursor-pointer border-2 transition-all p-8 h-full flex flex-col justify-between ${selectedType === 'group' ? 'border-primary bg-primary/5' : 'border-transparent hover:border-white/20'}`}
                    >
                        <div onClick={() => setSelectedType("group")}>
                            <div className="w-14 h-14 bg-pink-500/20 rounded-2xl flex items-center justify-center mb-6 text-pink-400">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Group Vault</h3>
                            <p className="text-gray-400 mb-6">
                                Pool funds with friends or community. No single person can withdraw without a vote.
                            </p>
                            <ul className="space-y-2 mb-8 text-sm text-gray-500">
                                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Trustless Voting</li>
                                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Transparent History</li>
                            </ul>
                        </div>

                        <Button
                            onClick={() => router.push("/dashboard/create/group")}

                            className="w-full"
                        >
                            Create Group Vault
                        </Button>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
