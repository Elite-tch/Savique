"use client";

import { useEffect, useRef } from "react";
import { useDisconnect, useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function AutoDisconnect() {
    const { disconnect: wagmiDisconnect } = useDisconnect();
    const { isConnected: isWagmiConnected } = useAccount();

    // Solana integration
    const { disconnect: solanaDisconnect, connected: isSolanaConnected } = useWallet();

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Run if any wallet is connected
        const isConnected = isWagmiConnected || isSolanaConnected;
        if (!isConnected) return;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                // Safety disconnect for both platforms
                if (isWagmiConnected) wagmiDisconnect();
                if (isSolanaConnected) solanaDisconnect();

                toast.warning("Session Expired", {
                    duration: 5000,
                    description: "For your security, you have been disconnected after 5 minutes of inactivity."
                });
            }, IDLE_TIMEOUT);
        };

        // Reset timer on user interaction
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Initial trigger
        resetTimer();

        // Cleanup listeners
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [wagmiDisconnect, solanaDisconnect, isWagmiConnected, isSolanaConnected]);

    return null;
}
