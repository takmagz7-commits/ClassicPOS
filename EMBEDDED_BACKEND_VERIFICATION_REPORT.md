# ClassicPOS Embedded Backend Verification Report

**Date:** October 18, 2025  
**App:** ClassicPOS Android with Embedded Node.js Backend  
**Capacitor-NodeJS Version:** 1.0.0-beta.9

---

## Executive Summary

✅ **Overall Status:** The embedded Node.js backend is **mostly configured correctly** but requires **one critical fix** for full Android compatibility.

The backend is properly embedded, auto-starts correctly, and all API endpoints are configured. However, some frontend components use relative URLs that will not work on Android native builds.

---

## 1. ✅ Node.js Backend Placement - VERIFIED

**Status:** ✅ PASS

### Findings:
- nodejs folder is correctly located at `public/nodejs/`
- Vite automatically copies `public/` directory contents to `dist/` during build
- Verified that `dist/nodejs/` exists with all necessary files
- Android assets at `android/app/src/main/assets/public/nodejs/` contain the complete backend
- node_modules are properly bundled in both dist and Android assets

### Structure Verified:
```
public/nodejs/
├── config/
├── db/
├── middleware/
├── routes/
├── services/
├── utils/
├── index.js ✅ (entry point)
├── package.json ✅
├── package-lock.json
├── node_modules/ ✅ (bundled)
└── classicpos.db
```

**Recommendation:** ✅ No action needed

---

## 2. ✅ Capacitor Configuration - VERIFIED

**Status:** ✅ PASS

### Findings:
**capacitor.config.ts:**
```typescript
plugins: {
  CapacitorNodeJS: {
    nodeDir: 'nodejs',      // ✅ Correct
    startMode: 'auto'       // ✅ Correct - auto-starts on app launch
  }
}
```

**Android Assets Configuration:**
- `android/app/src/main/assets/capacitor.config.json` matches TypeScript config
- `android/app/src/main/assets/capacitor.plugins.json` correctly registers the plugin
- Plugin classpath: `net.hampoelz.capacitor.nodejs.CapacitorNodeJSPlugin` ✅

### Verified Plugin Configuration:
- Package: `capacitor-nodejs` v1.0.0-beta.9 from GitHub
- nodeDir points to relative path 'nodejs' (relative to webDir 'dist')
- startMode 'auto' ensures backend starts when app launches
- No manual initialization code needed

**Recommendation:** ✅ No action needed

---

## 3. ⚠️ Frontend API URL Logic - NEEDS FIX

**Status:** ⚠️ **CRITICAL ISSUE FOUND**

### Findings:

#### ✅ Correct Implementation:
**src/utils/platformConfig.ts:**
```typescript
export const getApiBaseUrl = (): string => {
  if (Capacitor.isNativePlatform()) {
    return 'http://127.0.0.1:3001/api';  // ✅ For Android
  }
  
  return import.meta.env.VITE_API_URL || '/api';  // ✅ For web
};
```

This function is correctly imported and used in:
- ✅ `src/services/apiService.ts` - Main API service
- ✅ `src/components/auth/AuthContext.tsx` - Authentication
- ✅ `src/pages/Signup.tsx`, `src/pages/PinSetup.tsx`
- ✅ All payroll and attendance modules
- ✅ Role management and audit logs

#### ❌ Incorrect Implementation (CRITICAL):

**The following files use relative URLs that will NOT work on Android:**

1. **src/context/SaleContext.tsx** (lines 31, 81)
   ```typescript
   const response = await fetch('/api/sales/completed');  // ❌ Will fail on Android
   const response = await fetch('/api/sales/held');       // ❌ Will fail on Android
   ```

2. **src/context/AccountingContext.tsx** (lines 25, 36, 73, 84, 107, 118)
   ```typescript
   fetch('/api/accounting/accounts')           // ❌
   fetch('/api/accounting/journal-entries')    // ❌
   fetch('/api/accounting/bank-accounts')      // ❌
   ```

3. **src/modules/accounting/TrialBalance.tsx** (line 24)
   ```typescript
   fetch('/api/accounting/trial-balance')      // ❌
   ```

4. **src/modules/accounting/AccountsReceivable.tsx** (line 25)
5. **src/modules/accounting/AccountsPayable.tsx** (line 25)
6. **src/components/sales/ReceiptPreviewDialog.tsx** (line 57)

### Why This Is Critical:

In a Capacitor Android app:
- Web content is served from `capacitor://localhost`
- Relative URLs like `/api/sales/completed` resolve to `capacitor://localhost/api/sales/completed`
- This does NOT reach the embedded Node.js backend at `http://127.0.0.1:3001`
- These API calls will fail with network errors

### Recommended Fix:

**Option 1: Use getApiBaseUrl() in all contexts (RECOMMENDED)**

Example fix for SaleContext.tsx:
```typescript
import { getApiBaseUrl } from '@/utils/platformConfig';

const API_BASE_URL = getApiBaseUrl();

// Inside loadAll function:
const response = await fetch(`${API_BASE_URL}/sales/completed`);
const response = await fetch(`${API_BASE_URL}/sales/held`);
```

**Option 2: Use absolute URLs via apiService wrapper**

Create helper functions in apiService.ts that wrap these calls.

### Files That Need Updating:
1. `src/context/SaleContext.tsx`
2. `src/context/AccountingContext.tsx`
3. `src/modules/accounting/TrialBalance.tsx`
4. `src/modules/accounting/AccountsReceivable.tsx`
5. `src/modules/accounting/AccountsPayable.tsx`
6. `src/components/sales/ReceiptPreviewDialog.tsx`

---

## 4. ✅ Critical API Endpoints - VERIFIED

**Status:** ✅ PASS

### Endpoints Verified:

**Authentication (`/api/auth`):**
- ✅ POST `/signup` - User registration
- ✅ POST `/login` - Email/password login
- ✅ POST `/pin-login` - PIN-based login
- ✅ POST `/setup-mfa` - MFA secret generation
- ✅ POST `/complete-mfa-setup` - MFA activation
- ✅ POST `/verify-mfa` - TOTP/backup code verification
- ✅ POST `/logout` - Session termination
- ✅ GET `/me` - Current user info
- ✅ GET `/users` - User list (admin)
- ✅ POST/PUT/DELETE `/users` - User management

**Products (`/api/products`):**
- ✅ GET `/` - List all products
- ✅ GET `/:id` - Get product by ID
- ✅ POST `/` - Create product
- ✅ PUT `/:id` - Update product
- ✅ DELETE `/:id` - Delete product

**Inventory Management:**
- ✅ `/api/purchase-orders` - CRUD operations
- ✅ `/api/grns` - Goods Received Notes
- ✅ `/api/stock-adjustments` - Stock adjustments
- ✅ `/api/transfers` - Inter-store transfers
- ✅ `/api/inventory-history` - History tracking

**Backups (`/api/backups`):**
- ✅ POST `/manual` - Manual backup (admin only)
- ✅ GET `/list` - List available backups (admin only)
- ✅ POST `/restore/:filename` - Restore from backup (admin only)

**Additional Modules:**
- ✅ Sales, Customers, Suppliers, Categories
- ✅ Stores, Tax Rates, Payment Methods
- ✅ Accounting, Payroll, Attendance
- ✅ Reports, Activity Logs, Roles
- ✅ Settings

All endpoints are properly protected with authentication middleware where appropriate.

**Recommendation:** ✅ No action needed

---

## 5. ✅ SQLite Database Configuration - VERIFIED

**Status:** ✅ PASS (Minor inconsistency noted)

### Findings:

**Database Initialization (`public/nodejs/db/sqlite.cjs`):**
```javascript
const dbPath = process.env.DB_PATH || path.join(__dirname, '../classicpos.db');
db = new Database(dbPath);
db.pragma('foreign_keys = ON');
```

**Features Verified:**
- ✅ Uses `better-sqlite3` (synchronous, fast)
- ✅ Foreign key constraints enabled
- ✅ Automatic table creation on first run
- ✅ Migration system for schema updates
- ✅ Plaintext PIN migration to bcrypt hashes
- ✅ Default roles and permissions seeding
- ✅ Database file exists at `public/nodejs/classicpos.db`
- ✅ Database copied to Android assets successfully

**Environment Configuration:**
- Default `DB_PATH`: `./backend/classicpos.db` (envValidator.cjs)
- Actual default: `path.join(__dirname, '../classicpos.db')` (sqlite.cjs)
- These resolve to the same location in production but are expressed differently

### Minor Issue:
⚠️ **No .env.example file** in `public/nodejs/`

The `envValidator.cjs` expects `.env.example` to auto-generate `.env` files. While the code has fallback defaults, creating this file would improve deployment reliability.

**Recommended .env.example:**
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database
DB_PATH=./classicpos.db

# Security
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=1h

# CORS (embedded mode allows all)
CORS_ORIGIN=http://localhost:5000

# MFA Rate Limiting
MFA_RATE_LIMIT_WINDOW_MS=60000
MFA_MAX_ATTEMPTS=5

# Backups
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=14
BACKUP_SCHEDULE=0 2 * * *
```

**Recommendation:** Create `.env.example` in `public/nodejs/` folder

---

## 6. ✅ Logging and Error Handling - VERIFIED

**Status:** ✅ PASS

### Findings:

**Logger Configuration (`public/nodejs/utils/logger.cjs`):**
- ✅ Winston logger with daily rotating files
- ✅ Separate error log files: `logs/error-YYYY-MM-DD.log`
- ✅ Combined log files: `logs/combined-YYYY-MM-DD.log`
- ✅ Console logging with colors for development
- ✅ Log rotation: 20MB max size, 14 days retention
- ✅ Log levels: error, warn, info, http, debug

**Error Handling in Backend (`public/nodejs/index.js`):**
```javascript
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});
```

**Startup Logging:**
```javascript
console.log('🚀 Starting ClassicPOS Embedded Backend...');
logger.info(`✅ Backend server running on port ${PORT}`);
```

These messages are visible in Android Logcat for debugging.

**Recommendation:** ✅ No action needed

---

## 7. ✅ Build Configuration - VERIFIED

**Status:** ✅ PASS

### Findings:

**vite.config.ts:**
- ✅ `base: ''` - Correct for Capacitor (uses relative paths)
- ✅ Public directory automatically copied to dist
- ✅ No special configuration needed for nodejs folder

**Build Process Verified:**
```bash
npm run build
→ dist/
  ├── assets/
  ├── nodejs/  ✅ Complete backend with node_modules
  ├── index.html
  └── ...
```

**Capacitor Sync:**
```bash
npx cap sync android
→ android/app/src/main/assets/public/
  ├── nodejs/  ✅ Backend embedded in APK
  ├── assets/
  └── ...
```

**Recommendation:** ✅ No action needed

---

## Summary of Action Items

### 🔴 CRITICAL (Must Fix for Android):

**1. Fix Relative URL API Calls**
- Update 6 files to use `getApiBaseUrl()` instead of relative URLs
- Affects: Sales, Accounting contexts and modules
- **Impact:** These features will NOT work on Android without this fix
- **Effort:** Low (15-30 minutes)

### 🟡 RECOMMENDED (Best Practices):

**2. Create .env.example File**
- Add `.env.example` to `public/nodejs/`
- Helps with deployment and configuration documentation
- **Impact:** Improves maintainability
- **Effort:** Very low (5 minutes)

### 🟢 OPTIONAL (Minor Improvements):

**3. Standardize DB_PATH Defaults**
- Align default paths between `envValidator.cjs` and `sqlite.cjs`
- Currently both work but are expressed differently
- **Impact:** Code consistency
- **Effort:** Very low (2 minutes)

---

## Testing Checklist for Android

Once the critical fix is applied, test the following on an Android device/emulator **with airplane mode enabled**:

### Backend Startup:
- [ ] Check Android Logcat for: `🚀 Starting ClassicPOS Embedded Backend...`
- [ ] Check Android Logcat for: `✅ ClassicPOS Backend running on http://127.0.0.1:3001`
- [ ] Verify no startup errors in Logcat

### Authentication:
- [ ] User signup works
- [ ] Email/password login works
- [ ] PIN login works
- [ ] MFA setup works
- [ ] MFA verification works
- [ ] Logout works

### Core Features:
- [ ] Products: Create, read, update, delete
- [ ] Sales: Complete sale, hold sale, resume held sale
- [ ] Inventory: Purchase orders, GRNs, stock adjustments
- [ ] Accounting: View trial balance, A/R, A/P ⚠️ (Critical fix required)
- [ ] Reports: Generate various reports

### Data Persistence:
- [ ] Data persists after app restart
- [ ] SQLite database maintains integrity
- [ ] Backups can be created and restored

### Network Independence:
- [ ] All features work in airplane mode
- [ ] No internet required for any operation
- [ ] Local-only operation confirmed

---

## Conclusion

The ClassicPOS embedded backend configuration is **well-implemented** with a solid architecture. The Capacitor-NodeJS plugin is correctly configured, the backend structure is sound, and most frontend components properly use the platform-aware API URL logic.

**The critical fix required** is straightforward: updating 6 frontend files to use `getApiBaseUrl()` instead of relative URLs. Without this fix, sales and accounting features will not function on Android.

Once this fix is applied and tested, ClassicPOS will be **fully operational as an offline-first Android POS system** with zero internet dependency.

---

**Report Generated:** 2025-10-18  
**Verified Components:** 7/7  
**Critical Issues:** 1  
**Recommendations:** 2
