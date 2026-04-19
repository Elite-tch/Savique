"use client";

import { useEffect, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { toast } from "sonner";
import { CONTRACTS, VAULT_FACTORY_ABI } from "@/lib/contracts";

/**
 * WelcomeToast handles showing a personalized greeting once per day
 * when the user connects their wallet.
 */
export function WelcomeToast() {
    const { address, isConnected } = useAccount();
    const hasToastResponded = useRef(false);

    // Fetch user's vaults to determine active savings count
    const { data: userVaults, isSuccess } = useReadContract({
        address: CONTRACTS.coston2.VaultFactory,
        abi: VAULT_FACTORY_ABI,
        functionName: "getUserVaults",
        args: [address as `0x${string}`],
        query: {
            enabled: !!address && isConnected,
        }
    });

    useEffect(() => {
        if (isConnected && address && isSuccess && !hasToastResponded.current) {
            const today = new Date().toDateString();
            const storageKey = `savique_welcome_${address.toLowerCase()}`;
            const lastWelcomeDate = localStorage.getItem(storageKey);

            if (lastWelcomeDate !== today) {
                const vaultCount = (userVaults as string[])?.length || 0;
                
                // Construct personalized message
                let message = "";
                let description = "";

                if (vaultCount === 0) {
                    message = "Welcome to Savique!";
                    description = "Ready to start your financial savings today?";
                } else {
                    message = "Welcome back!";
                    description = `You currently have ${vaultCount} active savings working for you.`;
                }

                // Show Toast
                toast.success(message, {
                    description,
                    duration: 6000,
                });

                // Update storage to prevent duplicate toasts today
                localStorage.setItem(storageKey, today);
            }
            
            hasToastResponded.current = true;
        }

        // Reset the response flag if wallet disconnects
        if (!isConnected) {
            hasToastResponded.current = false;
        }
    }, [address, isConnected, isSuccess, userVaults]);

    return null;
}
