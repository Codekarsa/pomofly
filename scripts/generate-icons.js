#!/usr/bin/env node

/**
 * Icon Generation Script for Pomofly PWA
 * 
 * This script generates all the required PWA icons from a source SVG.
 * 
 * Usage:
 *   npm run generate-icons
 * 
 * Requirements:
 *   - sharp (npm package for image processing)
 *   - Source SVG file at public/icons/icon.svg
 * 
 * Generated Icons:
 *   - Favicon (16x16, 32x32)
 *   - Apple Touch Icon (180x180)
 *   - PWA Icons (72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512)
 *   - Windows Metro Tiles (70x70, 150x150, 310x310)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Sharp is not installed. Install it with:');
  console.error('npm install --save-dev sharp');
  process.exit(1);
}

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SOURCE_SVG = path.join(ICONS_DIR, 'icon.svg');

// Icon sizes to generate
const ICON_SIZES = [
  // Favicons
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  
  // Apple Touch Icons
  { size: 180, name: 'apple-touch-icon.png' },
  
  // PWA Icons
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  
  // Windows Metro Tiles
  { size: 70, name: 'ms-icon-70x70.png' },
  { size: 150, name: 'ms-icon-150x150.png' },
  { size: 310, name: 'ms-icon-310x310.png' }
];

async function generateIcons() {
  // Check if source SVG exists
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error('❌ Source SVG not found at:', SOURCE_SVG);
    console.error('Please create the source icon at public/icons/icon.svg');
    process.exit(1);
  }

  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  console.log('🎨 Generating PWA icons from SVG...');
  console.log('📁 Source:', SOURCE_SVG);
  console.log('📂 Output:', ICONS_DIR);
  console.log('');

  for (const { size, name } of ICON_SIZES) {
    try {
      const outputPath = path.join(ICONS_DIR, name);
      
      await sharp(SOURCE_SVG)
        .resize(size, size)
        .png()
        .toFile(outputPath);
        
      console.log(`✅ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
    }
  }

  // Generate favicon.ico (multi-size ICO file)
  try {
    const faviconPath = path.join(__dirname, '../public/favicon.ico');
    
    // Generate 16x16 PNG for ICO conversion
    const favicon16Buffer = await sharp(SOURCE_SVG)
      .resize(16, 16)
      .png()
      .toBuffer();
      
    const favicon32Buffer = await sharp(SOURCE_SVG)
      .resize(32, 32)
      .png()
      .toBuffer();

    // Note: For full ICO support, you'd need a library like 'to-ico'
    // For now, just copy the 32x32 PNG as favicon.ico
    fs.writeFileSync(faviconPath, favicon32Buffer);
    
    console.log('✅ Generated favicon.ico (32x32)');
  } catch (error) {
    console.error('❌ Failed to generate favicon.ico:', error.message);
  }

  console.log('');
  console.log('🎉 Icon generation complete!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Review generated icons in public/icons/');
  console.log('2. Test PWA installation on different devices');
  console.log('3. Validate icons using PWA testing tools');
}

// Run the script
generateIcons().catch(console.error);