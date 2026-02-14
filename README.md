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

## ✨ Premium Features (V2)

### 1. Sinking Fund Protocol (Goal Tracking)
Users can now set specific financial targets (e.g., "Property Deposit," "Emergency Fund"). The protocol tracks your progress in real-time, visualizing how close you are to your absolute financial freedom.

### 2. Flexible Top-Ups
Unlike static savings contracts, Savique allows you to "fuel" your goals. You can add funds to any active savings plan at any time, compounding your commitment without extending the lock-up period.

### 3. Emergency Beneficiary Protocol (Inheritance)
The ultimate peace of mind. Users can designate an emergency beneficiary address. If the owner becomes inactive after the lock period ends, the protocol allows beneficiary to withdraw funds through safety and recovery way ensuring wealth is never lost to the void.

### 4. Professional Notification System
Stay connected to your wealth. Savique integrates an automated notification system that sends:
*   **Transaction Confirmations**: Instant receipts via email.
*   **Maturity Alerts**: Notifications when your capital is ready for deployment.
*   **Security Warnings**: Alerts for any unauthorized early withdrawal attempts.

### 5. Financial Intelligence & TVL Dashboard
A visual command center for tracking Total Value Locked (TVL) and wealth trajectories.
*   **Proof of Reserves**: Real-time transparency of all capital secured by the protocol.
*   **Audit Distribution**: Categorized view of all financial proofs and receipts.

---

## 🏗️ Technical Stack

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