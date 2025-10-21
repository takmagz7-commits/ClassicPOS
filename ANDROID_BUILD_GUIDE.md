# ClassicPOS Android APK Build Guide - Offline Mode

## Overview

ClassicPOS is now configured to run **completely offline** with an embedded Node.js backend server running directly inside the Android APK. No internet or external server connection is required!

## Architecture

```
Android APK
├── React Frontend (WebView)
├── Embedded Node.js Runtime (Capacitor-NodeJS Plugin)
│   └── Express Backend (127.0.0.1:3001)
│       ├── API Routes
│       ├── SQLite Database (Local Storage)
│       └── All Business Logic
└── Auto-starts when app launches
```

## What's Been Configured

✅ **Capacitor-NodeJS Plugin** - Installed and configured
✅ **Embedded Backend** - All backend code copied to `nodejs/` folder
✅ **Auto-Start** - Backend starts automatically when app launches
✅ **Local API** - Frontend configured to use `http://127.0.0.1:3001/api`
✅ **Offline Database** - SQLite database runs locally on device
✅ **Build Scripts** - NPM scripts added for easy building

## How It Works

1. **App Launches** → Capacitor-NodeJS auto-starts the embedded Express server
2. **Backend Starts** → Node.js server runs on `http://127.0.0.1:3001`
3. **Frontend Loads** → React app connects to localhost backend
4. **100% Offline** → All data stored and processed locally on device

## Critical Fix: Missing Node.js Dependencies

**⚠️ IMPORTANT**: Before building the APK, you MUST install the backend dependencies in `public/nodejs/`. This was the cause of the app crashes.

### The Problem
The app was crashing with `Error: Cannot find module 'winston'` because the `node_modules` directory was missing from the embedded backend. When Node.js tried to start, it couldn't find any of the required dependencies.

### The Solution
Run this automated build script that handles everything:

```bash
./build-android.sh
```

Or manually:

```bash
# Install backend dependencies
cd public/nodejs
npm install --production
cd ../..

# Build and sync
npm run build
npx cap sync android
```

### Verification
Before building the APK, verify dependencies are installed:

```bash
# Should show 180+ packages
ls public/nodejs/node_modules/ | wc -l

# Should exist
test -d public/nodejs/node_modules/winston && echo "✓ Ready to build"
```

## Building the Android APK

### Prerequisites

- Node.js and npm installed
- Android Studio installed
- Java JDK 17+ installed
- Android SDK configured
- **Backend dependencies installed** (see Critical Fix above)

### Build Steps

#### Option 1: Automated Build (Recommended)

```bash
# Build frontend, sync Android, and open Android Studio
npm run android:build
```

This will:
1. Build the React frontend
2. Sync all files to Android project
3. Open Android Studio automatically

#### Option 2: Manual Build

```bash
# Step 1: Build the frontend
npm run build

# Step 2: Sync Capacitor
npm run android:sync

# Step 3: Open Android Studio
npm run android:open
```

#### Option 3: Individual Commands

```bash
# Build only
npm run build

# Sync Android only
npx cap sync android

# Open Android Studio only
npx cap open android
```

### Building APK in Android Studio

Once Android Studio opens:

1. **Wait for Gradle sync** to complete (bottom right)
2. **Build Menu** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. APK will be generated in `android/app/build/outputs/apk/debug/`
4. Install on device: `adb install app-debug.apk`

### Building Signed Release APK

For production/distribution:

1. **Build Menu** → **Generate Signed Bundle / APK**
2. Select **APK**
3. Create/select your keystore
4. Choose **release** build variant
5. APK will be in `android/app/build/outputs/apk/release/`

## Testing Offline Functionality

### Verify Embedded Backend

1. **Install APK** on Android device/emulator
2. **Enable Airplane Mode** (disconnect all internet)
3. **Launch ClassicPOS** app
4. **Test Registration** - Create new account
5. **Test Login** - Sign in with credentials
6. **Test Features** - Sales, inventory, reports, etc.
7. **Verify Data** - All data should persist between app restarts

### Debugging

If you encounter issues:

1. **Check Android Logcat** in Android Studio
2. Look for Node.js startup messages:
   - `🚀 Starting ClassicPOS Embedded Backend...`
   - `✅ ClassicPOS Backend running on http://127.0.0.1:3001`
3. Check for API connection errors in WebView console

## Project Structure

```
classicpos/
├── public/                    # Static assets (copied to dist during build)
│   └── nodejs/                # Embedded Node.js backend
│       ├── index.js           # Backend entry point (auto-starts)
│       ├── routes/            # API routes
│       ├── db/                # Database logic
│       ├── middleware/        # Auth, validation, etc.
│       ├── utils/             # Utilities
│       ├── services/          # Business services
│       ├── classicpos.db      # SQLite database (copied to device)
│       ├── package.json       # Backend dependencies
│       └── node_modules/      # Installed packages
├── backend/                   # Original backend (for web/dev server)
├── src/                       # React frontend
│   └── utils/
│       └── platformConfig.ts  # Platform detection for API URLs
├── android/                   # Android native project
│   └── app/src/main/assets/
│       └── public/nodejs/     # Backend copied here after sync
├── dist/                      # Build output (contains nodejs/)
├── capacitor.config.ts        # Capacitor config (NodeJS plugin enabled)
└── package.json              # Main project with build scripts
```

## Key Configuration Files

### capacitor.config.ts

```typescript
plugins: {
  CapacitorNodeJS: {
    nodeDir: 'nodejs',      // Backend location
    startMode: 'auto'       // Auto-start on launch
  }
}
```

### platformConfig.ts

Automatically detects platform and returns correct API URL:
- **Android/iOS**: `http://127.0.0.1:3001/api` (embedded backend)
- **Web/Browser**: `/api` or `VITE_API_URL` (external backend)

## Important Notes

### APK Size
- **Base APK**: ~50-60 MB
- **With Node.js Runtime**: ~90-100 MB
- **With All Dependencies**: ~100-120 MB

The embedded Node.js runtime adds approximately 40-50 MB to the APK size.

### Performance
- Backend runs natively on device (good performance)
- SQLite is optimized for mobile
- No network latency (everything local)

### Data Storage
- Database stored in app's private storage
- Data persists between app restarts
- Uninstalling app deletes all data
- Consider implementing backup/export features

### Security
- Backend only accessible from localhost (127.0.0.1)
- No external network access required
- All data encrypted at rest (Android storage encryption)
- Use proper authentication/authorization

### Limitations
- Cannot use `child_process.spawn()` or `.fork()`
- `process.exit()` not allowed (Apple guidelines)
- Some Node.js modules may not work on mobile
- APK size increases significantly

## Important: C++ Linker Fix Applied

### What Was Fixed
The `capacitor-nodejs` plugin had a C++ linker issue where the native library wasn't properly linking to the Android NDK's C++ standard library. This caused undefined symbol errors during the build process.

### Applied Fixes
1. **CMakeLists.txt Patch**: Modified the plugin's CMakeLists.txt to link against `c++_shared` library
2. **Packaging Configuration**: Updated `android/app/build.gradle` to handle multiple copies of `libc++_shared.so`
3. **Patch Management**: Used `patch-package` to maintain the fix permanently

### Automatic Patch Application
The fix is automatically applied when you run `npm install` through the `postinstall` script. The patch file is located at:
```
patches/capacitor-nodejs+1.0.0-beta.9.patch
```

**Important**: Do not delete the `patches/` directory - it contains the critical fix for Android builds.

### If You Encounter Build Errors
If you see errors like:
```
ld.lld: error: undefined symbol: std::__ndk1::mutex::lock()
ld.lld: error: undefined symbol: operator new(unsigned long)
```

This means the patch wasn't applied. Run:
```bash
npm install
```

This will re-apply the patch automatically.

## Troubleshooting

### Backend Not Starting

```bash
# Check Android Logcat for errors
adb logcat | grep -i nodejs
```

Look for:
- Node.js initialization errors
- Module loading issues
- Database permission errors

### API Connection Failures

1. Verify platform detection: Check that `Capacitor.isNativePlatform()` returns `true`
2. Confirm API URL: Should be `http://127.0.0.1:3001/api` on Android
3. Check CORS settings: Backend allows localhost by default

### Database Issues

- Ensure SQLite database is copied to `nodejs/` folder
- Check file permissions in Android storage
- Verify database initialization in logs

## Development vs Production

### Web Development (Current Workflow)
```bash
npm run dev:all  # Run both backend and frontend
```
- Frontend: `http://localhost:5000`
- Backend: `http://localhost:3001`
- Uses `backend/` folder

### Android Production (Embedded)
```bash
npm run android:build
```
- Frontend: WebView (bundled HTML/CSS/JS)
- Backend: Embedded Node.js (127.0.0.1:3001)
- Uses `public/nodejs/` folder (copied to `android/app/src/main/assets/public/nodejs/`)

## Future Enhancements

Consider adding:
- [ ] Cloud sync when online (optional)
- [ ] Backup/restore to external storage
- [ ] Export data (CSV, PDF)
- [ ] Multi-device sync via Bluetooth
- [ ] Background tasks for scheduled operations

## Support

For issues or questions:
1. Check Android Logcat
2. Review Capacitor-NodeJS docs: https://github.com/hampoelz/Capacitor-NodeJS
3. Check Capacitor docs: https://capacitorjs.com/docs

## Version Info

- Capacitor: 7.4.3
- Capacitor-NodeJS: 1.0.0-beta.9
- Node.js Runtime: nodejs-mobile
- Android Target: API 24+ (Android 7.0+)
