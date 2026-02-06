# MVP 3 Implementation Plan: Automation & Cooperative Growth

This document outlines the features for the next phase of Savique, focusing on "Set and Forget" automation and Group dynamics.

## Core Features
1.  **Auto-Savings Automation (DCA)**
2.  **Cooperative Vaults (Group Savings)**
3.  **Yield Optimization Strategy** (Re-introduced)

---

## 1. Auto-Savings Automation (DCA)
*The "Set It and Forget It" Wealth Builder.*

### Concept
Users authorize Savique to automatically pull a fixed amount (e.g., $500) from their wallet every week/month and deposit it into their vault. This mimics a 401(k) or salary deduction.

### Technical Architecture

#### A. Smart Contract: "Pull" Mechanics
*   **Function:** `depositFor(address user, uint256 amount)`
    *   Requires `IERC20.allowance(user, vault) >= amount`.
    *   Can only be called by a whitelisted `KEEPER_ROLE` (Admin Bot).
    *   **Gas Fee Handling:** The contract deducts a small "Service Fee" (e.g., 0.5 USDT) from the deposit to reimburse the Keeper for gas.

#### B. Backend Infrastructure (The Keeper)
*   **Database:** Store "Subscription" details (User, Amount, Frequency, NextRunTime).
*   **Cron Job (Server/Serverless):**
    *   Runs daily.
    *   Finds subscriptions where `NextRunTime <= Now`.
    *   Checks User Wallet Balance > Amount.
    *   Sends Transaction to Contract.
    *   Updates `NextRunTime`.
    *   On Failure (Low Balance): Sends Notification Email.

---

## 2. Cooperative Vaults (Group Savings)
*Trustless Multi-User Savings Pools.*

### Concept
Multiple users contribute to a single Vault. Useful for:
*   **Investments:** 10 friends saving $10k each to buy land.
*   **Rotating Savings (ROSCA/Esusu):** Communities saving together.

### Technical Architecture

#### A. Smart Contract: `GroupVault.sol`
*   **Trackers:** Mapping `contributions[user] => uint256`.
*   **Governance:**
    *   **Withdraw Rule:** Requires `N-of-M` votes (e.g., 3 out of 5 members) to release funds to a specific target address.
    *   **Refund Rule:** If goal is not met, individuals can withdraw *only* their own contribution.

---

## 3. Yield Optimization Strategy
*Idle Capital Management.*

### Concept
Integrate with DeFi protocols (Lending/Staking) to earn interest on locked funds.

### Implementation
*   **Strategy Pattern:** Vault holds shares of a Strategy Contract (e.g., `AaveStrategy`, `FlareStakingStrategy`).
*   **Logic:**
    *   `deposit()` -> Invests in Protocol.
    *   `withdraw()` -> Divests + Yield.
    *   **Penalty Logic:** Penalty applies to *Principal*. Yield is forfeited entirely upon early break.
