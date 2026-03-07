"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AdminEcosystem = 'all' | 'flare' | 'solana';

interface AdminEcosystemContextType {
    ecosystem: AdminEcosystem;
    setEcosystem: (e: AdminEcosystem) => void;
}

const AdminEcosystemContext = createContext<AdminEcosystemContextType | undefined>(undefined);

export function AdminEcosystemProvider({ children }: { children: React.ReactNode }) {
    const [ecosystem, setEcosystem] = useState<AdminEcosystem>('all');

    return (
        <AdminEcosystemContext.Provider value={{ ecosystem, setEcosystem }}>
            {children}
        </AdminEcosystemContext.Provider>
    );
}

export function useAdminEcosystem() {
    const context = useContext(AdminEcosystemContext);
    if (context === undefined) {
        throw new Error('useAdminEcosystem must be used within an AdminEcosystemProvider');
    }
    return context;
}
