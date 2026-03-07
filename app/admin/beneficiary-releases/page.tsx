"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { CONTRACTS, VAULT_FACTORY_ABI, VAULT_ABI, ERC20_ABI } from "@/lib/contracts";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Clock, Wallet, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useAdminEcosystem } from "../AdminEcosystemContext";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getSaviqueProgram, fetchVaultAccount, getSigningProvider } from "@/lib/anchor";
import { getAllVaults as getAllVaultsFromDb, SavedVault } from "@/lib/receiptService";
import { deriveVaultTokenAccount, DEVNET_SHIP_MINT } from "@/lib/solana";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

interface EligibleVault {
    address: string;
    purpose: string;
    beneficiary: string;
    balance: string;
    unlockTime: number;
    gracePeriodEnd: number;
    chain: 'flare' | 'solana';
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

    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { ecosystem } = useAdminEcosystem();

    const fetchEligibleVaults = async () => {
        try {
            setLoading(true);
            const eligible: EligibleVault[] = [];
            const now = Math.floor(Date.now() / 1000);

            // --- 1. FLARE NETWORK ---
            if ((ecosystem === 'all' || ecosystem === 'flare') && publicClient) {
                try {
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

                    for (const vaultAddr of allVaults) {
                        try {
                            const [purpose, beneficiary, unlockTime, gracePeriod, balance] = await Promise.all([
                                publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'purpose' }),
                                publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'beneficiary' }),
                                publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'unlockTimestamp' }),
                                publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'GRACE_PERIOD' }),
                                publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'totalAssets' }),
                            ]);

                            const unlockTimestamp = Number(unlockTime);
                            const gracePeriodEnd = unlockTimestamp + Number(gracePeriod);

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
                                    chain: 'flare'
                                });
                            }
                        } catch (e) { console.error("Error Flare vault:", e); }
                    }
                } catch (e) { console.error("Error Flare global:", e); }
            }

            // --- 2. SOLANA NETWORK ---
            if ((ecosystem === 'all' || ecosystem === 'solana')) {
                try {
                    const dbVaults = await getAllVaultsFromDb();
                    const solanaVaults = dbVaults.filter(v => !v.vaultAddress.startsWith('0x'));
                    const GRACE_PERIOD_SOLANA = 300; // 5 mins matching lib.rs constant

                    for (const v of solanaVaults) {
                        try {
                            // Validate Base58
                            if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v.vaultAddress)) {
                                continue;
                            }

                            const vaultPubkey = new PublicKey(v.vaultAddress);
                            const vaultAcc = await fetchVaultAccount(connection, vaultPubkey);

                            if (vaultAcc && vaultAcc.isActive && vaultAcc.beneficiary) {
                                const unlockTimestamp = vaultAcc.unlockTimestamp.toNumber();
                                const gracePeriodEnd = unlockTimestamp + GRACE_PERIOD_SOLANA;

                                if (now > gracePeriodEnd) {
                                    const vaultTokenAccount = deriveVaultTokenAccount(vaultPubkey);
                                    const bal = await connection.getTokenAccountBalance(vaultTokenAccount);

                                    if (bal.value.uiAmount && bal.value.uiAmount > 0) {
                                        eligible.push({
                                            address: v.vaultAddress,
                                            purpose: vaultAcc.purpose,
                                            beneficiary: vaultAcc.beneficiary.toBase58(),
                                            balance: bal.value.uiAmountString || "0",
                                            unlockTime: unlockTimestamp,
                                            gracePeriodEnd,
                                            chain: 'solana'
                                        });
                                    }
                                }
                            }
                        } catch (e) { console.error("Error Solana vault:", v.vaultAddress, e); }
                    }
                } catch (e) { console.error("Error Solana global:", e); }
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
    }, [publicClient, connection, ecosystem]);

    const handleAuthorize = async (vault: EligibleVault) => {
        setProcessingVault(vault.address);
        toastId.current = toast.loading(`Authorizing ${vault.chain.toUpperCase()} Release...`, toastStyle);

        if (vault.chain === 'flare') {
            writeContract({
                address: CONTRACTS.coston2.VaultFactory,
                abi: VAULT_FACTORY_ABI,
                functionName: "triggerBeneficiaryClaim",
                args: [vault.address as `0x${string}`]
            });
        } else {
            // Solana Authorize
            try {
                if (!publicKey) throw new Error("Wallet not connected");

                // Get the signing provider and program using the real wallet
                const provider = getSigningProvider(connection, wallet as any);
                const program = getSaviqueProgram(provider);
                const vaultPubkey = new PublicKey(vault.address);
                const beneficiaryPubkey = new PublicKey(vault.beneficiary);
                const vaultTokenAccount = deriveVaultTokenAccount(vaultPubkey);
                const beneficiaryTokenAccount = await getAssociatedTokenAddress(DEVNET_SHIP_MINT, beneficiaryPubkey);

                const tx = new Transaction();

                // Check if beneficiary token account exists, if not, add creation instruction
                const beneficiaryInfo = await connection.getAccountInfo(beneficiaryTokenAccount);
                if (!beneficiaryInfo) {
                    tx.add(
                        createAssociatedTokenAccountInstruction(
                            publicKey,
                            beneficiaryTokenAccount,
                            beneficiaryPubkey,
                            DEVNET_SHIP_MINT
                        )
                    );
                }

                const claimIx = await program.methods
                    .claimByBeneficiary()
                    .accounts({
                        caller: publicKey,
                        mint: DEVNET_SHIP_MINT,
                        vault: vaultPubkey,
                        vaultTokenAccount: vaultTokenAccount,
                        beneficiaryTokenAccount: beneficiaryTokenAccount,
                    } as any)
                    .instruction();

                tx.add(claimIx);

                const latestBlockhash = await connection.getLatestBlockhash('confirmed');
                tx.recentBlockhash = latestBlockhash.blockhash;
                tx.feePayer = publicKey;

                if (!wallet.sendTransaction) throw new Error("Wallet adapter does not support sendTransaction");
                const signature = await wallet.sendTransaction(tx, connection);
                await connection.confirmTransaction({
                    signature,
                    ...latestBlockhash
                });

                toast.success("Solana Release Authorized!", toastStyle);
                fetchEligibleVaults();
            } catch (err: any) {
                console.error("Solana Authorization Error:", err);
                toast.error(err.message || "Solana transaction failed", toastStyle);
            } finally {
                setProcessingVault(null);
                if (toastId.current) toast.dismiss(toastId.current);
            }
        }
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
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-white mb-1">{vault.purpose}</h3>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${vault.chain === 'flare' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'} border`}>
                                                {vault.chain === 'flare' ? 'FLR' : 'SOL'}
                                            </span>
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-[#E62058]/10 border border-[#E62058]/20 text-[#E62058] text-xs font-bold">
                                            ELIGIBLE
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Wallet className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-400">Balance:</span>
                                            <span className="text-white font-bold">{parseFloat(vault.balance).toFixed(2)} {vault.chain === 'flare' ? 'USDT0' : 'SHIP'}</span>
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
                                    onClick={() => handleAuthorize(vault)}
                                    disabled={isPending && processingVault === vault.address}
                                    className="bg-[#E62058] hover:bg-[#E62058]/90 text-white shadow-lg shadow-[#E62058]/20 min-w-[200px]"
                                >
                                    {processingVault === vault.address ? (
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
