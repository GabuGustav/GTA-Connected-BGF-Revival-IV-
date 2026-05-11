#!/bin/bash

echo "🚀 Setting up GitHub Releases for BGF Revival IV Downloads"
echo ""

# List of files to upload
FILES=(
    "downloadable-files/componentpeds.img.zip"
    "downloadable-files/pedprops.img.zip"
    "downloadable-files/radar.img.zip"
    "downloadable-files/Vehicle.img.zip"
    "downloadable-files/weapons.img.zip"
    "downloadable-files/weapons_e1.img.zip"
    "downloadable-files/weapons_e2.img.zip"
)

echo "📦 Files to upload:"
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo "  ✅ $file ($size)"
    else
        echo "  ❌ $file (not found)"
    fi
done

echo ""
echo "🔧 Manual Setup Instructions:"
echo "1. Go to: https://github.com/GabuGustav/GTA-Connected-BGF-Revival-IV-/releases"
echo "2. Click 'Create a new release'"
echo "3. Tag: v1.0.0"
echo "4. Title: 'BGF Revival IV - Download Files'"
echo "5. Upload all the ZIP files listed above"
echo "6. Publish release"
echo ""
echo "🌐 After setup, users can download from:"
echo "https://github.com/GabuGustav/GTA-Connected-BGF-Revival-IV-/releases/latest/download/[filename]"
