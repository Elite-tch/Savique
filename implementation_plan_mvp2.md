# MVP 2 Implementation Plan: Professional Savings Protocol

This document outlines the technical roadmap to elevate Savique from a simple savings locker to a professional capital accumulation, liquidity, and estate planning tool.

## Core Features
1.  **Sinking Fund Protocol** (Flexible Top-ups & Target Tracking)
2.  **Professional Notification System** (Email Statements & Alerts)
3.  **Emergency Beneficiary Protocol** (Trust & Estate Planning)
4.  **Self-Loan Liquidity Protocol** (Borrowing against your own assets)

---

## 1. Sinking Fund Protocol (Flexible Top-ups)
*Transforming "Fixed Locks" into "Progressive Capital Accumulation".*

### Concept
Users define a **Target Goal** (e.g., $50,000) but start with a smaller **Initial Deposit** (e.g., $1,000). They can contribute to the vault at any time. Penalties only apply if funds are *withdrawn* before the `unlockTimestamp`. Failing to reach the target amount incurs NO penalty.

### Implementation Steps

#### A. Data Structure Updates (Off-chain Registry)
We need to store the "Target Amount" since it's a UI/Logic metric, not a smart contract constraint.
*   **File:** `lib/receiptService.ts`
*   **Action:** Add `targetAmount` field to the Vault metadata.

#### B. Smart Contract Interaction
*   **Existing Function:** The `Vault.sol` already has a `deposit(uint256 amount)` function.
*   **Action:** No Solidity changes needed for this specific feature.

#### C. Frontend: Vault Creation (`app/dashboard/create/page.tsx`)
*   **Update:** Add an input field for "Target Goal (Optional)".
*   **Logic:**
    *   If provided, save to Registry along with the Vault Address.
    *   If not provided, `Target = Initial Deposit`.

#### D. Frontend: Vault Detail (`app/dashboard/savings/[address]/page.tsx`)
*   **Visuals:** Add a Progress Bar: `(Current Balance / Target) * 100`.
*   **Action:** Add a "Deposit / Top Up" button.
    *   **Click:** Opens modal -> User inputs amount -> Calls `vault.deposit(amount)`.
    *   **Feedback:** "Successfully added $500 to [Vault Name]. New Balance: $X."

---

## 2. Professional Notification System
*Enterprise-grade communication for high-net-worth users.*

### Concept
Send transactional emails (Deposits, Withdrawals) and timed alearts (Statements, Maturity Warnings) using an email API (e.g., Resend).

### Implementation Steps

#### A. Setup Email Service
*   **Dependency:** Install `resend` (or similar).
*   **Config:** Add `RESEND_API_KEY` to `.env`.

#### B. API Route (`app/api/notify/route.ts`)
Create a secure endpoint to handle email usage.

```typescript
// Payload Structure
{
  type: 'DEPOSIT_CONFIRMED' | 'MATURITY_WARNING' | 'MONTHLY_STATEMENT',
  userEmail: 'user@example.com',
  vaultName: 'Corporate Tax Fund',
  amount: '$5,000',
  txHash: '0x123...'
}
```

#### C. Trigger Points
*   **On-Demand:** Call this API from the frontend `onSuccess` callback of `deposit()` and `createVault()`.
*   **Automated (Advanced):** set up a GitHub Action or Vercel Cron to run a script daily:
    1.  Query `activeVaults` from Registry.
    2.  Check `unlockTimestamp`.
    3.  If `unlockTimestamp` is in 7 days, trigger `MATURITY_WARNING` email.

---

## 3. Emergency Beneficiary Protocol
*Estate planning for digital assets.*

### Concept
Allow a designated wallet to claim funds if the owner is inactive for a specific duration *after* the lock expires.

### Implementation Steps

#### A. Smart Contract: `PersonalVault.sol`
*   **State Variable:** `address public beneficiary;` (Immutable or mutable).
*   **State Variable:** `uint256 public constant GRACE_PERIOD = 365 days;`
*   **Function:** `claimByBeneficiary()`
    *   **Logic:**
        ```solidity
        require(msg.sender == beneficiary, "Not beneficiary");
        require(block.timestamp > unlockTimestamp + GRACE_PERIOD, "Not yet eligible");
        // Transfer all funds to beneficiary
        ```

#### B. Factory Update: `VaultFactory.sol`
*   Update `createPersonalVault` arguments to include `address _beneficiary`.

#### C. Frontend
*   **Create Page:** Add "Beneficiary Address (Optional)" input.
*   **Dashboard:** Show "Beneficiary: 0x123..." in the vault details (Auditor view).

---

## 4. Self-Loan Liquidity Protocol
*Unlock liquidity without breaking discipline.*

### Concept
Qualifying users (Balance >= $500) can borrow up to 50% of their locked funds. They must repay before the unlock date. If they fail to repay, it is treated as a "Broken Vault" and the standard 10% penalty is applied to the **Total Original Balance**.

### Rules
1.  **Eligibility:** Vault Balance must be >= $500 (in stablecoin).
2.  **Borrow Limit:** Max 50% of current vault balance.
3.  **Default Penalty:** 10% of **Total Assets** (not just the loan). This math ensures that "Borrow + Default" yields the exact same payout as "Break Vault Early," eliminating any loophole.

### Implementation Steps

#### A. Smart Contract: `PersonalVault.sol` Update
*   **State Variable:** `uint256 public borrowedAmount;`
*   **Function:** `borrow(uint256 amount)`
    *   Check `totalAssets() >= 500 * 10**18` (Eligibility).
    *   Check `amount <= (totalAssets() - borrowedAmount) / 2` (50% rule).
    *   Transfer `amount` USDT to user.
    *   `borrowedAmount += amount`.
*   **Function:** `repay(uint256 amount)`
    *   Transfer `amount` USDT from user to vault.
    *   `borrowedAmount -= amount`.
*   **Function Update:** `withdraw()`
    *   If `block.timestamp > unlockTimestamp`:
        *   If `borrowedAmount > 0`: **Apply Penalty Logic**.
            *   `uint256 totalEquity = token.balanceOf(address(this)) + borrowedAmount;`
            *   `uint256 penalty = (totalEquity * penaltyBps) / 10000;`
            *   `uint256 remainingToWithdraw = token.balanceOf(address(this)) - penalty;`
            *   Transfer `remainingToWithdraw` to user.
            *   Transfer `penalty` to Admin/Burn.
        *   Else: Standard withdraw.

#### B. Frontend Implications
*   **Vault Detail Page:**
    *   Show "Available to Borrow" if Balance > $500.
    *   Add **"Get Loan"** Button.
    *   Add **"Repay Loan"** Button.
    *   Display "Loan Status" (e.g., "Active Loan: $200 (Due: Dec 31)").
