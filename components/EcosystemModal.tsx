"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEcosystem } from "@/context/EcosystemContext";
import Image from "next/image";

interface EcosystemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFlare: () => void;
    onSelectSolana: () => void;
}

export function EcosystemModal({ isOpen, onClose, onSelectFlare, onSelectSolana }: EcosystemModalProps) {
    const { setEcosystem } = useEcosystem();

    const handleSelect = (type: 'flare' | 'solana', callback: () => void) => {
        setEcosystem(type);
        onClose();

        if (type === 'flare') {
            const openFlare = (window as any).openFlareConnect;
            if (openFlare) openFlare();
        } else {
            callback(); // This triggers the Solana wallet modal
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/5 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-2xl"
                    >
                        {/* Glow Effect */}
                        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/20 blur-[100px]" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Choose Ecosystem</h2>
                                    <p className="text-gray-400 mt-1">Select the network for your savings commitments.</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid gap-4">
                                {/* Flare Option */}
                                <motion.button
                                    whileHover={{  backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSelect('flare', onSelectFlare)}
                                    className="flex items-center gap-6 p-6 rounded-3xl border border-white/5 bg-white/5 transition-all text-left group"
                                >
                                    <div className="w-14 h-14 rounded flex items-center justify-center border border-orange-500/20  transition-transform">
                                        <div className="relative w-8 h-8">
                                            <Image src="/flare.png" alt="Flare" fill className="object-contain" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">Flare Network</h3>
                                        <p className="text-sm text-gray-400 pt-1">Save with USDT0</p>
                                    </div>
                                     </motion.button>

                                {/* Solana Option */}
                                <motion.button
                                    whileHover={{  backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSelect('solana', onSelectSolana)}
                                    className="flex items-center gap-6 p-6 rounded-3xl border border-white/5 bg-white/5 transition-all text-left "
                                >
                                    <div className="w-14 h-14 rounded flex items-center justify-center border border-cyan-500/20 transition-transform">
                                        <div className="relative w-8 h-8">
                                            <Image src="/solanas.png" alt="Flare" fill className="object-contain" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">Solana Ecosystem</h3>
                                        <p className="text-sm text-gray-400 pt-1">Save with $SHIP token & USDC </p>
                                    </div>
                                 </motion.button>
                            </div>

                            <p className="text-center text-xs text-gray-500 mt-8">
                                You can switch ecosystems anytime from the dashboard settings.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
