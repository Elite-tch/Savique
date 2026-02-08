"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useReadContract } from "wagmi";
import { CONTRACTS, VAULT_FACTORY_ABI, VAULT_ABI, ERC20_ABI } from "@/lib/contracts";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Clock, Wallet, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface EligibleVault {
    address: string;
    purpose: string;
    beneficiary: string;
    balance: string;
    unlockTime: number;
    gracePeriodEnd: number;
}

export default function BeneficiaryReleasesPage() {
    const [eligibleVaults, setEligibleVaults] = useState<EligibleVault[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingVault, setProcessingVault] = useState<string | null>(null);

    const publicClient = usePublicClient();
    const toastId = useRef<string | number | null>(null);

    const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
    const { isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

    const toastStyle = {
        className: "bg-[#E62058]/10 border-[#E62058]/20 text-[#E62058]",
        style: {
            backgroundColor: 'rgba(230, 32, 88, 0.1)',
            borderColor: 'rgba(230, 32, 88, 0.2)',
            color: '#E62058'
        }
    };

    useEffect(() => {
        if (isSuccess && processingVault) {
            if (toastId.current) toast.dismiss(toastId.current);
            toast.success("Release Authorized Successfully!", toastStyle);
            setProcessingVault(null);
            reset(); // Clear transaction state
            // Refresh the list
            fetchEligibleVaults();
        }

        if ((writeError || confirmError) && processingVault) {
            if (toastId.current) toast.dismiss(toastId.current);
            const err = writeError || confirmError;
            const errMsg = err instanceof Error ? err.message.split('\n')[0] : "Transaction failed";
            toast.error(errMsg, toastStyle);
            setProcessingVault(null);
            reset();
        }
    }, [isSuccess, writeError, confirmError, processingVault, reset]);

    const fetchEligibleVaults = async () => {
        if (!publicClient) return;

        try {
            setLoading(true);

            // Get decimals and all vaults
            const [tokenDecimals, allVaults] = await Promise.all([
                publicClient.readContract({
                    address: CONTRACTS.coston2.USDTToken,
                    abi: ERC20_ABI,
                    functionName: 'decimals',
                }),
                publicClient.readContract({
                    address: CONTRACTS.coston2.VaultFactory,
                    abi: VAULT_FACTORY_ABI,
                    functionName: 'getAllVaults',
                })
            ]) as [number, `0x${string}`[]];

            const eligible: EligibleVault[] = [];
            const now = Math.floor(Date.now() / 1000);

            for (const vaultAddr of allVaults) {
                try {
                    // Read vault data
                    const [purpose, beneficiary, unlockTime, gracePeriod, balance] = await Promise.all([
                        publicClient.readContract({
                            address: vaultAddr,
                            abi: VAULT_ABI,
                            functionName: 'purpose',
                        }),
                        publicClient.readContract({
                            address: vaultAddr,
                            abi: VAULT_ABI,
                            functionName: 'beneficiary',
                        }),
                        publicClient.readContract({
                            address: vaultAddr,
                            abi: VAULT_ABI,
                            functionName: 'unlockTimestamp',
                        }),
                        publicClient.readContract({
                            address: vaultAddr,
                            abi: VAULT_ABI,
                            functionName: 'GRACE_PERIOD',
                        }),
                        publicClient.readContract({
                            address: vaultAddr,
                            abi: VAULT_ABI,
                            functionName: 'totalAssets',
                        }),
                    ]);

                    const unlockTimestamp = Number(unlockTime);
                    const gracePeriodSeconds = Number(gracePeriod);
                    const gracePeriodEnd = unlockTimestamp + gracePeriodSeconds;

                    // Check if eligible
                    if (
                        beneficiary !== '0x0000000000000000000000000000000000000000' &&
                        now > gracePeriodEnd &&
                        (balance as bigint) > BigInt(0)
                    ) {
                        eligible.push({
                            address: vaultAddr,
                            purpose: purpose as string,
                            beneficiary: beneficiary as string,
                            balance: formatUnits(balance as bigint, tokenDecimals),
                            unlockTime: unlockTimestamp,
                            gracePeriodEnd,
                        });
                    }
                } catch (err) {
                    console.error(`Error reading vault ${vaultAddr}:`, err);
                }
            }

            setEligibleVaults(eligible);
        } catch (error) {
            console.error("Error fetching eligible vaults:", error);
            toast.error("Failed to load eligible vaults", toastStyle);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEligibleVaults();
    }, [publicClient]);

    const handleAuthorize = (vaultAddress: string) => {
        setProcessingVault(vaultAddress);
        toastId.current = toast.loading("Authorizing Release...", toastStyle);

        writeContract({
            address: CONTRACTS.coston2.VaultFactory,
            abi: VAULT_FACTORY_ABI,
            functionName: "triggerBeneficiaryClaim",
            args: [vaultAddress as `0x${string}`]
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Beneficiary Releases</h1>
                    <p className="text-gray-400">Vaults eligible for emergency beneficiary claim</p>
                </div>
                <Button
                    onClick={fetchEligibleVaults}
                    variant="outline"
                    className="border-white/10 hover:bg-[#E62058]/5 hover:text-[#E62058] transition-colors"
                >
                    Refresh
                </Button>
            </div>

            {eligibleVaults.length === 0 ? (
                <Card className="p-12 text-center bg-white/5 border-white/10">
                    <ShieldCheck className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">No Pending Releases</h2>
                    <p className="text-gray-400">
                        All vaults are either active or have been claimed by their owners.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {eligibleVaults.map((vault) => (
                        <Card key={vault.address} className="p-6 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">{vault.purpose}</h3>
                                            <Link
                                                href={`/dashboard/savings/${vault.address}`}
                                                className="text-xs text-gray-500 hover:text-primary font-mono"
                                            >
                                                {vault.address}
                                            </Link>
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-[#E62058]/10 border border-[#E62058]/20 text-[#E62058] text-xs font-bold">
                                            ELIGIBLE
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Wallet className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-400">Balance:</span>
                                            <span className="text-white font-bold">{parseFloat(vault.balance).toFixed(2)} USDT0</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <ShieldCheck className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-400">Beneficiary:</span>
                                            <span className="text-white font-mono text-xs">{vault.beneficiary.slice(0, 6)}...{vault.beneficiary.slice(-4)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-400">Grace Ended:</span>
                                            <span className="text-white">{new Date(vault.gracePeriodEnd * 1000).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => handleAuthorize(vault.address)}
                                    disabled={isPending && processingVault === vault.address}
                                    className="bg-[#E62058] hover:bg-[#E62058]/90 text-white shadow-lg shadow-[#E62058]/20 min-w-[200px]"
                                >
                                    {isPending && processingVault === vault.address ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Authorize Release
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
