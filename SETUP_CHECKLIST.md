# 🚀 Firebase Setup Checklist

Complete these steps to get Firebase working with SafeVault:

## ✅ Step 1: Set Up Firestore Security Rules

1. Open [Firebase Console](https://console.firebase.google.com/project/project-61ecf)
2. Click **Firestore Database** in the left sidebar
3. Click the **Rules** tab
4. Replace the existing rules with:

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

5. Click **Publish**
6. Wait for confirmation message

⚠️ **Note**: These are development rules. For production, implement proper authentication!

---

## ✅ Step 2: Create Firestore Index

1. In Firebase Console, stay in **Firestore Database**
2. Click the **Indexes** tab
3. Click **Create Index** button
4. Fill in:
   - **Collection ID**: `receipts`
   - **Field 1**: `walletAddress` → **Ascending**
   - **Field 2**: `timestamp` → **Descending**
   - **Query scope**: Collection
5. Click **Create**
6. Wait 2-5 minutes for index to build (you'll see "Building..." → "Enabled")

---

## ✅ Step 3: Test the Integration

### Test 1: Create a Vault
1. Start your dev server: `npm run dev`
2. Open http://localhost:3000
3. Connect your wallet
4. Create a new vault
5. Go to Firebase Console → Firestore → `receipts` collection
6. **Verify**: You should see a new document with your wallet address

### Test 2: View History
1. Navigate to http://localhost:3000/dashboard/history
2. **Verify**: You should see your newly created vault receipt
3. Open browser console (F12)
4. **Verify**: You should see logs like:
   ```
   [History] Loading receipts from Firestore for: 0x...
   [History] Loaded receipts: 1
   ```

### Test 3: Wallet Isolation
1. Create a vault with Wallet A
2. Disconnect wallet
3. Connect a different Wallet B
4. Go to history page
5. **Verify**: Wallet B should NOT see Wallet A's receipts

---

## ✅ Step 4: Migrate Old Data (Optional)

If you have existing receipts in localStorage:

1. Navigate to http://localhost:3000/dashboard/migrate
2. Connect your wallet
3. Click **Start Migration**
4. Wait for completion
5. **Verify**: Check Firestore Console for migrated receipts
6. Optionally click **Clear localStorage** to clean up

---

## ✅ Step 5: Clean Up (Optional)

Remove the debug page (not needed for production):
```bash
rm app/dashboard/history/debug-receipts.tsx
```

---

## 🎯 Success Criteria

You'll know everything is working when:

- ✅ New vaults create receipts in Firestore (not localStorage)
- ✅ History page loads receipts from Firestore
- ✅ Different wallets see only their own receipts
- ✅ Receipts persist across browser sessions
- ✅ No "Permission denied" errors in console

---

## 🐛 Troubleshooting

### "Permission denied" error
**Problem**: Firestore security rules not set up
**Solution**: Complete Step 1 above

### "Missing index" error
**Problem**: Firestore index not created
**Solution**: Complete Step 2 above (wait 2-5 minutes)

### Receipts not showing
**Check**:
1. Browser console for errors
2. Firestore Console → receipts collection (should have documents)
3. Wallet address matches (case-insensitive)

### Old receipts from other wallets still showing
**Solution**: 
1. Open browser console (F12)
2. Run:
   ```javascript
   for (let i = localStorage.length - 1; i >= 0; i--) {
     const key = localStorage.key(i);
     if (key?.startsWith('receipt_')) localStorage.removeItem(key);
   }
   ```

---

## 📊 Monitor Usage

Check Firebase usage regularly:
1. Firebase Console → Firestore Database → **Usage** tab
2. Monitor reads, writes, and storage

**Free tier limits**:
- 50,000 reads/day
- 20,000 writes/day  
- 1 GB storage

---

## 📚 Additional Resources

- Full documentation: `FIREBASE_SETUP.md`
- Migration guide: `FIREBASE_MIGRATION.md`
- Firebase Docs: https://firebase.google.com/docs/firestore

---

**Status**: Ready to test! 🎉
**Estimated time**: 10-15 minutes
