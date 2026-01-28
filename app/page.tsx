"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb, Shield, Users, Wallet } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col ">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "Savique",
                        "applicationCategory": "FinanceApplication",
                        "operatingSystem": "Web",
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD"
                        },
                        "description": "Smart Commitment Protocol for your capital on Flare Network. Savings vaults with verifiable proofs.",
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.8",
                            "ratingCount": "120"
                        }
                    })
                }}
            />
            {/* Header */}
            <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] md:w-[60%] lg:w-[30%] z-50 rounded-full glass border border-white/10 backdrop-blur-md bg-black/60 shadow-xl shadow-black/20">

                <div className="w-full px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                                src="/logo.png"
                                alt="Savique Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Savique
                        </span>
                    </div>

                    <Link href="/dashboard">
                        <Button size="sm"
                            className="rounded-full">
                            Launch App
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 pt-32 md:pt-40 pb-20">
                <div className="container mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-7xl font-bold mb-6 tracking-tight text-white">
                            Purpose Aware <br />
                            <span className="text-primary glow">Savings & Commitment</span>
                        </h1>
                        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                            Lock funds for specific goals, enforce discipline with smart contracts,
                            and generate verifiable financial proofs on the Flare Network.
                        </p>

                        <div className="flex justify-center md:flex-row flex-col gap-4">
                            <Link href="/dashboard">
                                <Button size="lg" className="gap-2">
                                    Start Saving <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>

                        </div>
                    </motion.div>
                   
                </div>

                {/* Features / Why Grid */}
                <div id="how-it-works" className="container mx-auto px-6 mt-32">
                    <div className="grid md:grid-cols-3 gap-8">
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="glass p-8 rounded-2xl border border-white/5 bg-white/5"
                        >
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                                <Wallet className="w-6 h-6 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Personal Goals</h3>
                            <p className="text-gray-400">
                                Lock your USDT0 for a set time. Early withdrawals incur penalties,
                                forcing you to stick to your commitments.
                            </p>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5 }}
                            className="glass p-8 rounded-2xl border border-white/5 bg-white/5"
                        >
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Group Savings</h3>
                            <p className="text-gray-400">
                                Save together without trust. Funds are locked until members vote
                                to release them to a specific destination.
                            </p>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5 }}
                            className="glass p-8 rounded-2xl border border-white/5 bg-white/5"
                        >
                            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-6">
                                <Shield className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Verifiable Proof</h3>
                            <p className="text-gray-400">
                                Powered by ProofRails. Every deposit and successful save generates
                                a permanent, shareable financial receipt.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 mt-20">
                <div className="container mx-auto px-6 flex justify-center items-center text-gray-500 text-sm">
                    <p>© 2025 Savique. Built on Flare.</p>
                </div>
            </footer>
        </div>
    );
}
