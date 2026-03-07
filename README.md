# Savique: Professional Savings Commitment Protocol

Savique is a premium, disciplined, on-chain savings platform designed for high-conviction wealth building. It bridges the gap between decentralized assets and real-world financial maturity through cryptographic commitments and verifiable audit trails.

---

## 🛑 The Problem

Modern digital wealth is engineered for high liquidity, which often leads to **financial indiscretion**. Traditional wallets make it too easy to "dip into" funds meant for long-term goals or essential expenses like rent, taxes, or business capital.

Furthermore, when users need to prove their financial stability to third parties (landlords, auditors, or banks), they lack a **verifiable, tamper-proof audit trail** that proves they have the discipline to hold and commit capital over time.

---

## ✅ The Solution

Savique provides a **Strategic Commitment Layer** for your capital. By moving beyond simple "storage," it introduces:

1.  **Enforced Discipline**: Funds are cryptographically sealed for a user-defined period, removing the temptation of impulsive spending.
2.  **Verified Audit Trails**: Every financial action produces a cryptographically signed receipt via **ProofRails**, creating an immutable history of your financial commitment.
3.  **Real-World Utility**: Bridge the gap to IRL financial requirements with professional, verifiable reports and digital inheritance.

---

## 🏗️ Deep Technical Architecture 

Savique is built on a modular, non-custodial smart contract framework designed for security, isolation, and verifiable state transitions.

### 1. Contract Architecture (The Factory Pattern)
To ensure maximum user security and isolation, Savique utilizes a **Factory Design Pattern**.
*   **VaultFactory (`VaultFactory.sol`)**: Acts as the centralized registry and deployment engine. It keeps track of all `PersonalVault` instances via a `userVaults` mapping and manages protocol-wide parameters such as the `protocolTreasury` address.
*   **PersonalVault (`PersonalVault.sol`)**: A standalone, non-custodial contract deployed for every user goal. This isolation prevents "pooling" risks and ensures that each vault’s security is independent of others.

### 2. State Enforcement & Discipline (Solidity Logic)
*   **Temporal Locking**: The `withdraw()` function is strictly gated by a `block.timestamp` check against the vault's `unlockTimestamp`. Any attempt to withdraw before this time will trigger an automatic revert unless routed through the `breakEarly` path.
*   **Penalty Calculus (BPS)**: Early withdrawals are penalized using a **Basis Points (BPS)** precision system (e.g., 1000 BPS = 10%). The penalty is calculated on the `totalAssets()` and redirected to the `protocolTreasury` to disincentivize impulsive behavior.
*   **Allowance-Based Auto-Deposits**: The `executeAutoDeposit` function in the Factory allows the protocol to pull funds from a user's wallet directly into their vault. This requires the user to grant a `spend` allowance to the Factory contract, mimicking a traditional direct debit system on-chain.

### 3. Inheritance & Recovery Protocol
*   **The Grace Period**: Every vault includes a `GRACE_PERIOD` constant (e.g., 90 days). 
*   **Beneficiary Authority**: If a vault remains matures and untouched beyond the grace period, the `claimByBeneficiary()` function becomes active. This allows the designated beneficiary to claim the funds, preventing "lost capital" scenarios.

### 4. Auditing & ProofRails Integration
*   **Event-Driven Verification**: Every critical state change (Deposit, Break, Maturity) emits a standard Solidity event.
*   **SDK Handshake**: The Savique middleware uses the **ProofRails SDK** to listen for these events and generate a cryptographically signed **Digital Receipt (PDF/JSON)**. These receipts are verifiable off-chain, turnings on-chain discipline into a "Financial Resume."

---

## ✨ Premium Features (V2)

### 1. Sinking Fund Protocol (Goal Tracking)
Users can now set specific financial targets (e.g., "Property Deposit," "Emergency Fund"). The protocol tracks your progress in real-time, visualizing how close you are to your absolute financial freedom.

### 2. Flexible Top-Ups
Unlike static savings contracts, Savique allows you to "fuel" your goals. You can add funds to any active savings plan at any time, compounding your commitment without extending the lock-up period.

### 3. Emergency Beneficiary Protocol (Inheritance)
The ultimate peace of mind. Users can designate an emergency beneficiary address. If the owner becomes inactive after the lock period ends, the protocol allows beneficiary to withdraw funds through safety and recovery way ensuring wealth is never lost to the void.

### 4. Professional Notification System
Integrated automated notification system that sends Transaction Confirmations, Maturity Alerts, and Security Warnings via email to keep the user connected to their wealth.

---

## 🛠️ Technical Stack

*   **Network**: Flare Coston2 (Low-latency, high-security L1).
*   **Verification**: ProofRails SDK for cryptographically signed financial statements.
*   **Persistence**: Firebase for user profiles and professional notification routing.
*   **Standard**: OpenZeppelin-standard smart contracts for non-custodial security.

---

## ⚙️ Getting Started

1.  **Install Dependencies**: `npm install`
2.  **Environment Setup**:
    *   `NEXT_PUBLIC_PROOFRAILS_KEY`: For audit signatures.
    *   `FIREBASE_CONFIG`: For persistence and profiles.
    *   `RESEND_API_KEY`: For professional email notifications.
3.  **Launch**: `npm run dev`

---

## 🌐 On-Chain Verification
The `VaultFactory` is currently deployed and verified on **Flare Coston2**:
`0x4E70a85B1553ef34128C13C52B81A5862e4A11Dc`