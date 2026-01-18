"use client";

import { useEffect, useRef } from "react";
import { useDisconnect, useAccount } from "wagmi";
import { toast } from "sonner";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function AutoDisconnect() {
    const { disconnect } = useDisconnect();
    const { isConnected } = useAccount();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Only run if user is connected
        if (!isConnected) return;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                disconnect();
                toast.warning("Disconnected due to inactivity", {
                    duration: 5000,
                    description: "You have been disconnected for your security after 5 minutes of inactivity."
                });
            }, IDLE_TIMEOUT);
        };

        // Events to listen for
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

        // Add event listeners
        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Initial start
        resetTimer();

        // Cleanup
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [disconnect, isConnected]);

    return null;
}
