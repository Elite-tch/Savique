"use client";

import '@rainbow-me/rainbowkit/styles.css';
import {
    getDefaultConfig,
    RainbowKitProvider,
    darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { defineChain } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { ProofRailsProvider } from "@proofrails/sdk/react";
import { Toaster } from "sonner";
import { AutoDisconnect } from "@/components/AutoDisconnect";

export const flare = defineChain({
    id: 14,
    name: "Flare Mainnet",
    nativeCurrency: {
        decimals: 18,
        name: "Flare",
        symbol: "FLR",
    },
    rpcUrls: {
        default: { http: ["https://flare-api.flare.network/ext/C/rpc"] },
    },
    blockExplorers: {
        default: { name: "Flare Explorer", url: "https://flare-explorer.flare.network" },
    },
});

export const flareCoston2 = defineChain({
    id: 114,
    name: "Coston2",
    nativeCurrency: {
        decimals: 18,
        name: "C2FLR",
        symbol: "C2FLR",
    },
    rpcUrls: {
        default: {
            http: [
                "https://coston2-api.flare.network/ext/C/rpc",
                "https://flare-testnet-coston2.rpc.thirdweb.com",
                "https://coston2.enosys.global/ext/C/rpc",
                "https://rpc.ankr.com/flare_coston2"
            ]
        },
    },
    blockExplorers: {
        default: { name: "Coston2 Explorer", url: "https://coston2-explorer.flare.network" },
    },
    testnet: true,
});

export const wagmiConfig = getDefaultConfig({
    appName: 'SafeVault',
    projectId: 'd76edd2ec72490269459a792d70e84fc', // Using the provided Project ID
    chains: [flareCoston2, flare],
    transports: {
        [flareCoston2.id]: http(undefined, {
            batch: true,
            timeout: 60_000,
            retryCount: 5,
            retryDelay: 2000,
        }),
        [flare.id]: http(undefined, {
            batch: true,
            timeout: 60_000,
            retryCount: 5,
            retryDelay: 2000,
        }),
    },
    ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#E62058',
                        accentColorForeground: 'white',
                        borderRadius: 'large',
                        fontStack: 'system',
                        overlayBlur: 'small',
                    })}
                >
                    <ProofRailsProvider apiKey={process.env.NEXT_PUBLIC_PROOFRAILS_KEY || ""}>
                        <AutoDisconnect />
                        {children}
                        <Toaster position="top-right" theme="dark" richColors closeButton />
                    </ProofRailsProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
