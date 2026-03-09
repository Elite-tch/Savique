import { NextRequest, NextResponse } from "next/server";
import { Keypair, Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { mintTo, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import bs58 from "bs58";

export async function POST(req: NextRequest) {
    try {
        const { targetAddress } = await req.json();

        if (!targetAddress) {
            return NextResponse.json({ error: "Missing target address" }, { status: 400 });
        }

        const DEVNET_SHIP_MINT = process.env.NEXT_PUBLIC_DEVNET_SHIP_MINT;
        const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;

        if (!DEVNET_SHIP_MINT || !FAUCET_PRIVATE_KEY) {
            return NextResponse.json({ error: "Faucet not configured" }, { status: 500 });
        }

        const targetPubkey = new PublicKey(targetAddress);
        const mintPubkey = new PublicKey(DEVNET_SHIP_MINT);
        const authKeypair = Keypair.fromSecretKey(bs58.decode(FAUCET_PRIVATE_KEY));

        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

        // Get or create ATA for the receiver
        const targetAta = await getOrCreateAssociatedTokenAccount(
            connection,
            authKeypair, // fee payer
            mintPubkey,
            targetPubkey
        );

        // Mint 10,000 SHIP (assuming 9 decimals)
        const amount = 10000 * (10 ** 9);

        // Mint the tokens
        const signature = await mintTo(
            connection,
            authKeypair, // payer
            mintPubkey,
            targetAta.address,
            authKeypair, // mint authority
            amount
        );

        return NextResponse.json({
            success: true,
            signature,
            amount: 10000
        });

    } catch (error: any) {
        console.error("Faucet error:", error);
        return NextResponse.json({
            error: error.message || "Failed to mint tokens"
        }, { status: 500 });
    }
}
