"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function AutoDisconnect() {
    const { logout, authenticated } = usePrivy();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Only run if user is authenticated
        if (!authenticated) return;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                logout();
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
    }, [logout, authenticated]);

    return null;
}
