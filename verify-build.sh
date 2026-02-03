#!/bin/bash
# Verification script for post-build checks
# This script verifies that all post-build issues have been fixed

set -e

echo "=== Post-Build Verification Script ==="
echo ""

BUILD_DIR="${1:-build}"

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Error: Build directory '$BUILD_DIR' not found"
    echo "   Run 'npm run build' first"
    exit 1
fi

echo "Checking build directory: $BUILD_DIR"
echo ""

# Check 1: Verify PWA icons exist
echo "1. Checking PWA icons..."
ICONS_OK=true
for icon in "icons/icon-192.png" "icons/icon-512.png" "icons/maskable-192.png" "icons/maskable-512.png"; do
    if [ -f "$BUILD_DIR/$icon" ]; then
        echo "   ✓ $icon exists"
    else
        echo "   ✗ $icon is missing"
        ICONS_OK=false
    fi
done

if [ "$ICONS_OK" = true ]; then
    echo "   ✅ All PWA icons present"
else
    echo "   ❌ Some icons are missing"
    exit 1
fi
echo ""

# Check 2: Verify manifest.json exists and is valid
echo "2. Checking manifest.json..."
if [ -f "$BUILD_DIR/manifest.json" ]; then
    echo "   ✓ manifest.json exists"
    
    # Check if manifest contains all icon references
    ICON_COUNT=$(jq '.icons | length' "$BUILD_DIR/manifest.json")
    if [ "$ICON_COUNT" -eq 4 ]; then
        echo "   ✓ manifest.json contains 4 icons"
        echo "   ✅ Manifest is valid"
    else
        echo "   ✗ manifest.json should contain 4 icons, found $ICON_COUNT"
        exit 1
    fi
else
    echo "   ✗ manifest.json is missing"
    exit 1
fi
echo ""

# Check 3: Verify .htaccess exists and contains MIME types
echo "3. Checking .htaccess..."
if [ -f "$BUILD_DIR/.htaccess" ]; then
    echo "   ✓ .htaccess exists"
    
    # Check for essential MIME type declarations
    if grep -q "AddType application/javascript .js" "$BUILD_DIR/.htaccess"; then
        echo "   ✓ JavaScript MIME type configured"
    else
        echo "   ✗ JavaScript MIME type not configured"
        exit 1
    fi
    
    if grep -q "AddType application/json .json" "$BUILD_DIR/.htaccess"; then
        echo "   ✓ JSON MIME type configured"
    else
        echo "   ✗ JSON MIME type not configured"
        exit 1
    fi
    
    echo "   ✅ .htaccess configured correctly"
else
    echo "   ✗ .htaccess is missing"
    exit 1
fi
echo ""

# Check 4: Verify index.html doesn't use deprecated methods
echo "4. Checking for deprecated JavaScript methods..."
if grep -q "\.substr(" "$BUILD_DIR/index.html"; then
    echo "   ✗ index.html still uses deprecated substr() method"
    exit 1
else
    echo "   ✓ No deprecated substr() found"
    echo "   ✅ JavaScript is up to date"
fi
echo ""

# Check 5: Verify manifest icons are accessible
echo "5. Verifying manifest icon paths..."
ALL_ICONS_EXIST=true
for icon in $(jq -r '.icons[].src' "$BUILD_DIR/manifest.json"); do
    # Remove leading slash for file system path
    ICON_PATH="${BUILD_DIR}${icon}"
    if [ -f "$ICON_PATH" ]; then
        echo "   ✓ $icon is accessible"
    else
        echo "   ✗ $icon is not accessible"
        ALL_ICONS_EXIST=false
    fi
done

if [ "$ALL_ICONS_EXIST" = true ]; then
    echo "   ✅ All manifest icons are accessible"
else
    echo "   ❌ Some manifest icons are not accessible"
    exit 1
fi
echo ""

echo "==================================="
echo "✅ All post-build checks passed!"
echo "==================================="
echo ""
echo "The build is ready for deployment."
