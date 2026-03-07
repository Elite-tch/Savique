"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Ecosystem = 'flare' | 'solana';

interface EcosystemContextType {
    ecosystem: Ecosystem | null;
    setEcosystem: (e: Ecosystem) => void;
    isSolana: boolean;
    isFlare: boolean;
    clearEcosystem: () => void;
}

const EcosystemContext = createContext<EcosystemContextType | undefined>(undefined);

export function EcosystemProvider({ children }: { children: React.ReactNode }) {
    const [ecosystem, setEcosystemState] = useState<Ecosystem | null>(null);

    // Initialize from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('savique_ecosystem') as Ecosystem;
        if (saved && (saved === 'flare' || saved === 'solana')) {
            setEcosystemState(saved);
        }
    }, []);

    const setEcosystem = useCallback((e: Ecosystem) => {
        setEcosystemState(e);
        localStorage.setItem('savique_ecosystem', e);
    }, []);

    const clearEcosystem = useCallback(() => {
        setEcosystemState(null);
        localStorage.removeItem('savique_ecosystem');
    }, []);

    const value = {
        ecosystem,
        setEcosystem,
        isSolana: ecosystem === 'solana',
        isFlare: ecosystem === 'flare',
        clearEcosystem
    };

    return (
        <EcosystemContext.Provider value={value}>
            {children}
        </EcosystemContext.Provider>
    );
}

export function useEcosystem() {
    const context = useContext(EcosystemContext);
    if (context === undefined) {
        throw new Error('useEcosystem must be used within an EcosystemProvider');
    }
    return context;
}
