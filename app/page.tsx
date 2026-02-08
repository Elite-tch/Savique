"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb, Shield, Users, Wallet, CheckCircle2 } from "lucide-react";
import { InteractiveMockDashboard } from "@/components/InteractiveMockDashboard";

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col md:w-[95%] mx-auto overflow-x-hidden">
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
                        "description": "Smart Commitment Protocol for your capital on Flare Network. Savings with verifiable proofs.",
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

                    <Link href="/dashboard">
                        <Button size="sm" className="rounded-full">
                            Launch App
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 pt-32 md:pt-40 pb-20">
                {/* Hero Section */}
                <div className="container mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl md:text-7xl font-bold  mb-6 tracking-tight text-white">
                            Purpose Aware <br />
                            <span className="text-primary glow ">Savings & Commitment</span>
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

                {/* How it Works / Mock Dashboard Section */}
                <div id="how-it-works" className="container mx-auto px-6 mt-10 md:mt-32">


                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        {/* Glow effect backdrops */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%]  rounded-full blur-[120px] -z-10" />

                        <InteractiveMockDashboard />

                        {/* Floating Labels / Steps */}
                        <div className="grid md:grid-cols-3 gap-6 mt-16 bg-zinc-900/40 p-10 rounded-[2.5rem] border border-white/5 md:w-[95%] mx-auto backdrop-blur-xl shadow-2xl relative">
                            <motion.div 
                                whileHover={{ 
                                    backgroundColor: "rgba(230, 32, 88, 0.05)", 
                                    borderColor: "rgba(230, 32, 88, 0.4)",
                                    boxShadow: "0 10px 30px -10px rgba(230, 32, 88, 0.1)"
                                }}
                                className="p-8 rounded-[2.5rem] border border-white/5 space-y-4 group cursor-pointer relative overflow-hidden transition-all duration-500"
                            >
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="text-primary font-bold text-sm uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">Step 01</div>
                                <h4 className="text-lg font-bold text-white">Define Your Purpose</h4>
                                <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">Select a savings category and set your maturity date.</p>
                            </motion.div>

                            <motion.div 
                                whileHover={{ 
                                    backgroundColor: "rgba(230, 32, 88, 0.05)", 
                                    borderColor: "rgba(230, 32, 88, 0.4)",
                                    boxShadow: "0 10px 30px -10px rgba(230, 32, 88, 0.1)"
                                }}
                                className="p-8 rounded-[2.5rem] border border-white/5 space-y-4 group cursor-pointer relative overflow-hidden transition-all duration-500"
                            >
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="text-primary font-bold text-sm uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">Step 02</div>
                                <h4 className="text-lg font-bold text-white">Lock & Commitment</h4>
                                <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">Deploy funds into your non-custodial vault on Flare.</p>
                            </motion.div>

                            <motion.div 
                                whileHover={{ 
                                    backgroundColor: "rgba(230, 32, 88, 0.05)", 
                                    borderColor: "rgba(230, 32, 88, 0.4)",
                                    boxShadow: "0 10px 30px -10px rgba(230, 32, 88, 0.1)"
                                }}
                                className="p-8 rounded-[2.5rem] border border-white/5 space-y-4 group cursor-pointer relative overflow-hidden transition-all duration-500"
                            >
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="text-primary font-bold text-sm uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">Step 03</div>
                                <h4 className="text-lg font-bold text-white">Verifiable Growth</h4>
                                <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">Top-up anytime and generate Proof of Discipline.</p>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>


                {/* Features / Why Grid */}
                <div id="features" className="container mx-auto px-6 mt-24">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Engineered for Discipline</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            The Savique protocol combines cryptographic security with psychological commitment to ensure your long-term wealth building stays protected.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <motion.div
                            whileHover={{
                                backgroundColor: "rgba(230, 32, 88, 0.05)",
                                borderColor: "rgba(230, 32, 88, 0.4)",
                                boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)"
                            }}
                            className="glass p-8 rounded-[2rem] border border-white/5 bg-white/5 relative overflow-hidden group cursor-pointer transition-all duration-500"
                        >
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform duration-500">
                                <Wallet className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors duration-300">Savings Commitment</h3>
                            <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                                Lock your assets until a fixed maturity date. Early withdrawals incur a 10% penalty to enforce true financial discipline.
                            </p>
                        </motion.div>

                        <motion.div
                            whileHover={{
                                backgroundColor: "rgba(230, 32, 88, 0.05)",
                                borderColor: "rgba(230, 32, 88, 0.4)",
                                boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)"
                            }}
                            className="glass p-8 rounded-[2rem] border border-white/5 bg-white/5 relative overflow-hidden group cursor-pointer transition-all duration-500"
                        >
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform duration-500">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors duration-300">Group Savings</h3>
                            <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                                Save together without trust. Funds are locked until members vote
                                to release them to a specific destination.
                            </p>
                        </motion.div>

                        <motion.div
                            whileHover={{
                                backgroundColor: "rgba(230, 32, 88, 0.05)",
                                borderColor: "rgba(230, 32, 88, 0.4)",
                                boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)"
                            }}
                            className="glass p-8 rounded-[2rem] border border-white/5 bg-white/5 relative overflow-hidden group cursor-pointer transition-all duration-500"
                        >
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform duration-500">
                                <Shield className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors duration-300">Verifiable Proof</h3>
                            <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                                Powered by ProofRails. Every deposit and successful save generates
                                a permanent, shareable financial receipt.
                            </p>
                        </motion.div>
                    </div>
                </div>


            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 mt-16">
                <div className="container mx-auto px-6 flex justify-center items-center text-gray-500 text-sm">
                    <p>© {new Date().getFullYear()} Savique. Built on Flare.</p>
                </div>
            </footer>
        </div>
    );
}
