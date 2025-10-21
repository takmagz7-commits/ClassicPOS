# Android Crash Fix - Missing Node.js Dependencies

## Problem Identified

The Android app was crashing immediately after launch with the error:
```
Error: Cannot find module 'winston'
```

### Root Cause

When building the Android APK, Capacitor copies the Node.js backend files from `public/nodejs/` to the Android assets folder. However, **the `node_modules` directory was not present**, causing all `require()` statements to fail when the embedded Node.js server tried to start.

The crash sequence was:
1. Android app launches
2. Capacitor NodeJS plugin starts
3. Node.js tries to execute `public/index.js`
4. `index.js` requires `./utils/logger.cjs`
5. `logger.cjs` requires `winston`
6. Winston not found → crash

## Solution Applied

### Step 1: Install Dependencies in `public/nodejs`
```bash
cd public/nodejs
npm install --production
```

This installed all required Node.js modules including:
- winston
- winston-daily-rotate-file
- express
- bcryptjs
- better-sqlite3
- jsonwebtoken
- and all other dependencies from package.json

### Step 2: Rebuild and Sync
```bash
# Build the frontend
npm run build

# Sync with Android platform (copies all files including node_modules)
npx cap sync android
```

### Step 3: Verify Dependencies Were Copied
The dependencies are now present in:
```
android/app/src/main/assets/public/nodejs/node_modules/
```

## Building the Android APK

To build the APK on your local machine with Android Studio/Java SDK:

```bash
cd android
./gradlew assembleDebug
```

The APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Testing the Fix

1. Install the rebuilt APK on your Android device
2. Launch the app
3. The Node.js backend should now start successfully
4. Check Android logcat - you should see:
   ```
   ✅ ClassicPOS Backend running on http://127.0.0.1:3001
   ```

## Important Notes

### For Future Builds

**Always ensure** `public/nodejs/node_modules` exists before building:

```bash
# Check if dependencies are installed
test -d public/nodejs/node_modules && echo "✓ Dependencies installed" || echo "✗ Run: cd public/nodejs && npm install"
```

### File Size Considerations

The `node_modules` directory adds ~30-50MB to the APK size. This is necessary for the embedded backend to function.

### Alternative Approach (If Size is Critical)

If APK size is a major concern, you could:
1. Use a bundler like `webpack` or `esbuild` to bundle the backend into a single file with dependencies
2. This would reduce the number of files but might not significantly reduce the overall size

## Verification Checklist

Before building the APK, verify:

- [ ] `public/nodejs/node_modules/` exists
- [ ] `public/nodejs/node_modules/winston/` exists
- [ ] `public/nodejs/node_modules/express/` exists
- [ ] `public/nodejs/node_modules/better-sqlite3/` exists
- [ ] Run `npx cap sync android` to copy everything
- [ ] Check `android/app/src/main/assets/public/nodejs/node_modules/` has all modules

## Expected Behavior After Fix

1. App launches successfully
2. Splash screen appears
3. Embedded Node.js server starts on port 3001
4. React frontend loads and connects to backend
5. Authentication screens appear
6. No more crashes related to missing modules

## Troubleshooting

If the app still crashes after this fix:

1. **Clear Android cache:**
   ```bash
   cd android
   ./gradlew clean
   ```

2. **Re-sync Capacitor:**
   ```bash
   npx cap sync android --force
   ```

3. **Rebuild from scratch:**
   ```bash
   npm run build
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```

4. **Check logcat for specific errors:**
   ```bash
   adb logcat | grep -E "(nodejs|ClassicPOS|ERROR)"
   ```

## Summary

The crash was caused by missing Node.js dependencies in the Android APK. Installing `node_modules` in `public/nodejs/` and syncing with Capacitor resolves the issue. The app should now run successfully on Android devices.
