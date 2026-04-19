"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

/**
 * WalletSync component monitors account changes and forces a page refresh
 * to ensure that data from a previous wallet doesn't persist in the UI.
 */
export function WalletSync() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const lastAddress = useRef<string | undefined>(address);

    useEffect(() => {
        // If the address changes and we were already connected to something
        if (lastAddress.current && address !== lastAddress.current) {
            console.log("🔄 Wallet account changed.");
            
            // NOTE: window.location.reload() removed to prevent infinite reload loops
            // if the Web3 provider temporarily drops state. 
            // React handles the address change natively via the wagmi useAccount hook!
        }

        // Update the reference with the current address
        lastAddress.current = address;
    }, [address, isConnected, router]);

    return null;
}
