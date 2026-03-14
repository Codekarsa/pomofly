#!/usr/bin/env node

/**
 * Creates placeholder PNG icons for Pomofly PWA
 * These are simple colored squares that can be replaced with proper icons later
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');

// Simple 1x1 blue PNG as base64 (will be used as placeholder)
const BLUE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8D+gAAAABJRU5ErkJggg==';
const RED_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// Simple SVG to PNG conversion for basic icons
function createSimpleIcon(size, color = '#3b82f6', name = 'Pomofly') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.125}" fill="${color}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="white" stroke="#e5e7eb" stroke-width="${size * 0.02}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="none" stroke="#10b981" stroke-width="${size * 0.025}" 
            stroke-linecap="round" stroke-dasharray="${size * 2.2}" stroke-dashoffset="${size * 0.55}" transform="rotate(-90 ${size/2} ${size/2})"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size * 0.03}" fill="#374151"/>
    <text x="${size/2}" y="${size * 0.9}" text-anchor="middle" font-family="system-ui" font-size="${size * 0.1}" font-weight="700" fill="white">P</text>
  </svg>`;
}

// Icon configurations
const ICONS = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

function createPlaceholderIcons() {
  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  console.log('📱 Creating placeholder PWA icons...');
  console.log('⚠️ These are temporary placeholders - replace with actual branded icons');
  console.log('');

  for (const { size, name } of ICONS) {
    try {
      const iconPath = path.join(ICONS_DIR, name);
      
      // Create SVG content
      const svgContent = createSimpleIcon(size);
      
      // Write SVG file (as placeholder until proper PNG generation)
      const svgPath = iconPath.replace('.png', '.svg');
      fs.writeFileSync(svgPath, svgContent);
      
      // Create a simple PNG placeholder using base64 data
      const pngBuffer = Buffer.from(BLUE_PNG_BASE64, 'base64');
      fs.writeFileSync(iconPath, pngBuffer);
      
      console.log(`✅ Created placeholder ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to create ${name}:`, error.message);
    }
  }

  // Create favicon.ico as copy of 32x32
  try {
    const favicon32Path = path.join(ICONS_DIR, 'favicon-32x32.png');
    const faviconPath = path.join(__dirname, '../public/favicon.ico');
    
    if (fs.existsSync(favicon32Path)) {
      fs.copyFileSync(favicon32Path, faviconPath);
      console.log('✅ Created favicon.ico');
    }
  } catch (error) {
    console.error('❌ Failed to create favicon.ico:', error.message);
  }

  console.log('');
  console.log('🎨 Placeholder icons created!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Install sharp: npm install --save-dev sharp');
  console.log('2. Run: node scripts/generate-icons.js (for proper icons)');
  console.log('3. Replace icon.svg with your branded design');
  console.log('4. Test PWA installation on various devices');
  console.log('');
  console.log('⚠️ Remember: Current icons are basic placeholders');
  console.log('   Create proper branded icons for production use');
}

// Create browserconfig.xml for Windows Metro tiles
function createBrowserConfig() {
  const browserConfigContent = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square70x70logo src="/icons/ms-icon-70x70.png"/>
            <square150x150logo src="/icons/ms-icon-150x150.png"/>
            <square310x310logo src="/icons/ms-icon-310x310.png"/>
            <TileColor>#3b82f6</TileColor>
        </tile>
    </msapplication>
</browserconfig>`;
  
  const browserConfigPath = path.join(__dirname, '../public/browserconfig.xml');
  fs.writeFileSync(browserConfigPath, browserConfigContent);
  console.log('✅ Created browserconfig.xml');
}

// Run the script
createPlaceholderIcons();
createBrowserConfig();