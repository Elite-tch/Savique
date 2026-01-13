# Firebase Setup for SafeVault

This document explains the Firebase/Firestore integration for transaction receipt storage.

## Overview

SafeVault now uses **Firebase Firestore** to store transaction receipts instead of localStorage. This provides:

- ✅ **Proper wallet isolation** - Each wallet only sees its own transactions
- ✅ **Cross-device sync** - Access your history from any device
- ✅ **Persistent storage** - Data survives browser clearing
- ✅ **Better security** - Server-side data validation

## Firebase Configuration

The Firebase project is already configured in `lib/firebase.ts` with the following details:

```
Project ID: project-61ecf
App ID: 1:263054069293:web:cca30648df250b0227b2a4
```

## Firestore Database Structure

### Collection: `receipts`

Each receipt document contains:

```typescript
{
  walletAddress: string;      // Lowercase wallet address (indexed)
  txHash: string;             // Transaction hash
  timestamp: number;          // Unix timestamp in milliseconds
  purpose: string;            // Vault purpose/description
  amount: string;             // Amount in C2FLR
  verified: boolean;          // ProofRails verification status
  type: 'created' | 'breaked' | 'completed';
  penalty?: string;           // Penalty amount (for breaked vaults)
  proofRailsId?: string;      // ProofRails receipt ID
  createdAt: Timestamp;       // Firestore server timestamp
}
```

## Firestore Security Rules

**IMPORTANT**: You need to set up Firestore security rules in the Firebase Console.

### Recommended Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /receipts/{receiptId} {
      // Users can only read their own receipts
      allow read: if request.auth != null && 
                     resource.data.walletAddress == request.auth.token.wallet_address.toLowerCase();
      
      // Users can only create receipts for their own wallet
      allow create: if request.auth != null && 
                       request.resource.data.walletAddress == request.auth.token.wallet_address.toLowerCase();
      
      // No updates or deletes allowed (immutable receipts)
      allow update, delete: if false;
    }
  }
}
```

**Note**: The above rules assume wallet-based authentication. For now, we're using client-side filtering, but you should implement proper authentication for production.

### Temporary Development Rules (INSECURE - DO NOT USE IN PRODUCTION):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /receipts/{receiptId} {
      allow read, write: if true;
    }
  }
}
```

## Setting Up Firestore Indexes

For optimal query performance, create the following composite index:

1. Go to Firebase Console → Firestore Database → Indexes
2. Create a composite index:
   - Collection: `receipts`
   - Fields:
     - `walletAddress` (Ascending)
     - `timestamp` (Descending)

This index enables fast queries for wallet-specific receipts sorted by date.

## Migration from localStorage

If you have existing receipts in localStorage, use the migration page:

1. Navigate to: `http://localhost:3000/dashboard/migrate`
2. Connect your wallet
3. Click "Start Migration"
4. After migration completes, optionally clear localStorage

## API Functions

### `saveReceipt(receipt: Omit<Receipt, 'id'>): Promise<string>`

Saves a receipt to Firestore.

```typescript
await saveReceipt({
  walletAddress: address.toLowerCase(),
  txHash: "0x...",
  timestamp: Date.now(),
  purpose: "Emergency Fund",
  amount: "100.00",
  verified: true,
  type: 'created',
  proofRailsId: "receipt_123"
});
```

### `getReceiptsByWallet(walletAddress: string): Promise<Receipt[]>`

Retrieves all receipts for a specific wallet, sorted by timestamp (newest first).

```typescript
const receipts = await getReceiptsByWallet(userAddress);
```

### `migrateLocalStorageToFirestore(walletAddress: string): Promise<number>`

Migrates receipts from localStorage to Firestore.

```typescript
const count = await migrateLocalStorageToFirestore(address);
console.log(`Migrated ${count} receipts`);
```

## Testing

### Test Receipt Creation:

1. Create a new vault
2. Check Firestore Console → receipts collection
3. Verify the receipt document exists with correct `walletAddress`

### Test Wallet Isolation:

1. Create receipts with Wallet A
2. Disconnect and connect Wallet B
3. Verify Wallet B doesn't see Wallet A's receipts
4. Check browser console logs for filtering details

## Troubleshooting

### Issue: Receipts not showing up

**Solution**:
- Check browser console for errors
- Verify Firebase configuration in `lib/firebase.ts`
- Check Firestore security rules allow reads
- Ensure wallet address matches (case-insensitive)

### Issue: "Permission denied" errors

**Solution**:
- Update Firestore security rules (see above)
- For development, temporarily use permissive rules
- For production, implement proper authentication

### Issue: Old receipts still showing from other wallets

**Solution**:
- Clear localStorage: Open browser console and run:
  ```javascript
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('receipt_')) localStorage.removeItem(key);
  }
  ```
- Or use the migration page to clean up

## Production Checklist

Before deploying to production:

- [ ] Set up proper Firestore security rules
- [ ] Create required Firestore indexes
- [ ] Implement wallet-based authentication
- [ ] Add rate limiting for Firestore writes
- [ ] Set up Firebase billing alerts
- [ ] Test with multiple wallets thoroughly
- [ ] Migrate all existing localStorage data
- [ ] Add error tracking (e.g., Sentry)

## Cost Estimation

Firebase Firestore free tier includes:
- 50,000 reads/day
- 20,000 writes/day
- 1 GB storage

For SafeVault usage:
- Each vault creation = 1 write
- Each history page load = 1 read per receipt
- Average receipt size = ~500 bytes

**Estimated capacity**: ~40,000 vaults/month on free tier

## Support

For Firebase-related issues:
- Firebase Documentation: https://firebase.google.com/docs/firestore
- Firebase Console: https://console.firebase.google.com/project/project-61ecf

For SafeVault-specific issues:
- Check browser console logs
- Review `lib/receiptService.ts` for implementation details
