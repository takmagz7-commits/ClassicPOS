#!/bin/bash

# ClassicPOS - Reproduction Script for Linux/Mac
# This script reproduces the fix and verifies the build

set -e  # Exit on error

echo "========================================"
echo "ClassicPOS Build Verification Script"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
NODE_VERSION=$(node --version)
echo -e "${GREEN}Node version: $NODE_VERSION${NC}"

NODE_MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\)\..*/\1/')
if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    echo -e "${RED}WARNING: Node.js 18+ is recommended. Current version: $NODE_VERSION${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERROR: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}1. Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
echo ""

echo -e "${YELLOW}2. Running ESLint...${NC}"
if npm run lint; then
    echo -e "${GREEN}✓ Linting passed${NC}"
else
    echo -e "${YELLOW}WARNING: Linter found issues, but continuing...${NC}"
fi
echo ""

echo -e "${YELLOW}3. Building production bundle...${NC}"
npm run build
echo -e "${GREEN}✓ Build completed successfully${NC}"
echo ""

echo -e "${YELLOW}4. Checking build artifacts...${NC}"
if [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✓ dist/index.html exists${NC}"
else
    echo -e "${RED}ERROR: dist/index.html not found${NC}"
    exit 1
fi

if [ -d "dist/assets" ]; then
    ASSET_COUNT=$(ls -1 dist/assets | wc -l)
    echo -e "${GREEN}✓ Found $ASSET_COUNT asset files in dist/assets${NC}"
else
    echo -e "${RED}ERROR: dist/assets directory not found${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}BUILD VERIFICATION COMPLETE${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo -e "${NC}  1. Start dev server:  npm run dev${NC}"
echo -e "${NC}  2. Open browser to:   http://localhost:8080${NC}"
echo -e "${NC}  3. Test inventory forms:${NC}"
echo -e "${GRAY}     - Purchase Orders: /purchase-orders${NC}"
echo -e "${GRAY}     - GRN: /goods-received-notes${NC}"
echo -e "${GRAY}     - Stock Adjustments: /stock-adjustments${NC}"
echo -e "${GRAY}     - Transfer of Goods: /transfer-of-goods${NC}"
echo ""

read -p "Start development server now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Starting development server...${NC}"
    echo -e "${GRAY}Press Ctrl+C to stop the server${NC}"
    echo ""
    npm run dev
fi
