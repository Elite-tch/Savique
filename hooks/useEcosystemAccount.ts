"use client";

import { useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEcosystem } from "@/context/EcosystemContext";

export function useEcosystemAccount() {
    const { address: flareAddress, isConnected: isFlareConnected } = useAccount();
    const { publicKey, connected: isSolanaConnected } = useWallet();
    const { ecosystem } = useEcosystem();

    const solanaAddress = publicKey?.toBase58();

    const isConnected = ecosystem === 'flare' ? isFlareConnected : (ecosystem === 'solana' ? isSolanaConnected : (isFlareConnected || isSolanaConnected));
    const address = ecosystem === 'flare' ? flareAddress : (ecosystem === 'solana' ? solanaAddress : (flareAddress || solanaAddress));

    return {
        address,
        isConnected,
        isFlare: ecosystem === 'flare',
        isSolana: ecosystem === 'solana',
        flareAddress,
        solanaAddress,
        isFlareConnected,
        isSolanaConnected
    };
}
