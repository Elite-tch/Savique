"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { defineChain } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";

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
                "https://rpc.ankr.com/flare_coston2"
            ]
        },
    },
    blockExplorers: {
        default: { name: "Coston2 Explorer", url: "https://coston2-explorer.flare.network" },
    },
    testnet: true,
});

export const wagmiConfig = createConfig({
    chains: [flareCoston2, flare],
    transports: {
        [flareCoston2.id]: http(undefined, {
            timeout: 30_000,
            retryCount: 3,
            retryDelay: 1000,
        }),
        [flare.id]: http(undefined, {
            timeout: 30_000,
            retryCount: 3,
            retryDelay: 1000,
        }),
    },
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cl9c..."} // User will need to set this
            config={{
                loginMethods: ["email", "wallet"],
                appearance: {
                    theme: "dark",
                    accentColor: "#E62058", // Flare Pink
                    logo: "https://flare.network/wp-content/uploads/2022/09/Flare_Logo_White.svg",
                },
            }}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    );
}
