#!/bin/bash

echo "🚀 Creating GitHub Release with BGF Revival IV Files"

# Create release
gh release create v1.0.0 \
  --title "BGF Revival IV - Download Files" \
  --notes "Download files for BGF Revival IV mod pack" \
  downloadable-files/componentpeds.img.zip \
  downloadable-files/pedprops.img.zip \
  downloadable-files/radar.img.zip \
  downloadable-files/Vehicle.img.zip \
  downloadable-files/weapons.img.zip \
  downloadable-files/weapons_e1.img.zip \
  downloadable-files/weapons_e2.img.zip

echo "✅ Release created successfully!"
echo "🌐 Downloads available at: https://github.com/GabuGustav/GTA-Connected-BGF-Revival-IV-/releases/latest"
