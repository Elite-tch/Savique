# SafeVault Implementation Plan

## 1. Executive Summary
**SafeVault** is a decentralized savings application on the Flare Network. It allows users to lock funds for specific goals, enforcing discipline through smart contracts and providing verifiable proof of savings via ProofRails.

**Tagline:** "Purpose Aware Savings & Commitment"

## 2. Architecture

### Core Features
1.  **Personal Vaults:** Users lock USDT for a set duration. Early withdrawal incurs a penalty (burned or sent to treasury).
2.  **Group Vaults:** Trustless group savings. Funds are locked until a consensus (vote) is reached to release them to a destination.
3.  **ProofRails Integration:** Every deposit and successful completion generates an on-chain receipt (attestation).

### Navigation
*   **Overview (`/dashboard`):** View active vaults and total savings.
*   **New Vault (`/dashboard/create`):** Wizard to create Personal or Group vaults.

### Smart Contracts (Coston2 Testnet)
*   **USDT:** `0xa3Bd00D652D0f28D2417339322A51d4Fbe2B22D3`
*   **VaultFactory:** `0x17Db74c3314DF700A67420Da05ca2ff23A9623C3`

## 3. Tech Stack
*   **Frontend:** Next.js 14, Tailwind, Framer Motion.
*   **Web3:** Wagmi, Viem, Privy.
*   **Network:** Flare Coston2.

## 4. Status
*   ✅ Basic Dashboard
*   ✅ Vault Creation UI
*   ✅ Smart Contract Connections
*   🚧 ProofRails Integration (In Progress)
