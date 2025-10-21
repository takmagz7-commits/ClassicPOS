#!/bin/bash

# ClassicPOS Android Build Script
# This script ensures all dependencies are in place before building

set -e

echo "🏗️  ClassicPOS Android Build Script"
echo "===================================="
echo ""

# Step 1: Check and install backend dependencies
echo "📦 Step 1: Checking Node.js backend dependencies..."
if [ ! -d "public/nodejs/node_modules" ]; then
    echo "   Installing backend dependencies..."
    cd public/nodejs
    npm install --production
    cd ../..
    echo "   ✓ Backend dependencies installed"
else
    echo "   ✓ Backend dependencies already present"
fi

# Step 2: Build frontend
echo ""
echo "🎨 Step 2: Building frontend..."
npm run build
echo "   ✓ Frontend built"

# Step 3: Sync with Capacitor
echo ""
echo "📲 Step 3: Syncing with Android platform..."
npx cap sync android
echo "   ✓ Android platform synced"

# Step 4: Verify
echo ""
echo "✅ Step 4: Verification..."
if [ -d "android/app/src/main/assets/public/nodejs/node_modules" ]; then
    echo "   ✓ Dependencies copied to Android assets"
else
    echo "   ✗ ERROR: Dependencies not found in Android assets"
    exit 1
fi

# Step 5: Build APK (if Java is available)
echo ""
echo "📱 Step 5: Building Android APK..."
if command -v java &> /dev/null; then
    cd android
    chmod +x gradlew
    ./gradlew assembleDebug
    cd ..
    echo ""
    echo "🎉 Build complete!"
    echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"
else
    echo "⚠️  Java not found. Please build manually using:"
    echo "   cd android && ./gradlew assembleDebug"
    echo ""
    echo "Or open android/ folder in Android Studio and build from there."
fi

echo ""
echo "✨ Done!"
