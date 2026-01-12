"use client";

import { useState, useEffect } from "react";
import { CONTRACTS } from "@/lib/contracts";

const STORAGE_KEY_USDT = "safevault_usdt_address";
const STORAGE_KEY_FACTORY = "safevault_factory_address";

export function useContractAddresses() {
    const [usdtAddress, setUsdtAddress] = useState<`0x${string}`>(CONTRACTS.coston2.USDTToken);
    const [factoryAddress, setFactoryAddress] = useState<`0x${string}`>(CONTRACTS.coston2.VaultFactory);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const storedUSDT = localStorage.getItem(STORAGE_KEY_USDT);
        const storedFactory = localStorage.getItem(STORAGE_KEY_FACTORY);

        if (storedUSDT && storedUSDT.startsWith("0x")) {
            setUsdtAddress(storedUSDT as `0x${string}`);
        }
        if (storedFactory && storedFactory.startsWith("0x")) {
            setFactoryAddress(storedFactory as `0x${string}`);
        }
        setIsLoaded(true);
    }, []);

    const updateUsdtAddress = (addr: string) => {
        if (!addr.startsWith("0x")) return;
        setUsdtAddress(addr as `0x${string}`);
        localStorage.setItem(STORAGE_KEY_USDT, addr);
        window.location.reload(); // Simple way to propagate changes to all components nicely
    };

    const updateFactoryAddress = (addr: string) => {
        if (!addr.startsWith("0x")) return;
        setFactoryAddress(addr as `0x${string}`);
        localStorage.setItem(STORAGE_KEY_FACTORY, addr);
        window.location.reload();
    };

    const resetDefaults = () => {
        setUsdtAddress(CONTRACTS.coston2.USDTToken);
        setFactoryAddress(CONTRACTS.coston2.VaultFactory);
        localStorage.removeItem(STORAGE_KEY_USDT);
        localStorage.removeItem(STORAGE_KEY_FACTORY);
        window.location.reload();
    };

    return {
        usdtAddress,
        factoryAddress,
        updateUsdtAddress,
        updateFactoryAddress,
        resetDefaults,
        isLoaded
    };
}
