# App Icons for Pomofly PWA

This directory contains all the required icons for the Pomofly Progressive Web App (PWA).

## Icon Requirements

To properly support PWA installation across all devices and platforms, the following icons are required:

### Standard PWA Icons

- `icon-72x72.png` - Android Chrome
- `icon-96x96.png` - Android Chrome
- `icon-128x128.png` - Android Chrome, Windows
- `icon-144x144.png` - Android Chrome
- `icon-152x152.png` - iOS Safari
- `icon-192x192.png` - Android Chrome (minimum required)
- `icon-384x384.png` - Android Chrome
- `icon-512x512.png` - Android Chrome (recommended)

### Platform-Specific Icons

- `apple-touch-icon.png` (180x180) - iOS Safari
- `favicon-16x16.png` - Browser favicon
- `favicon-32x32.png` - Browser favicon
- `favicon.ico` - Legacy favicon support

### Windows Metro Tiles (Optional)

- `ms-icon-70x70.png` - Small tile
- `ms-icon-150x150.png` - Medium tile
- `ms-icon-310x310.png` - Wide tile

## Icon Generation

### Automated Generation

Use the provided script to generate all icons from the source SVG:

1. Install sharp for image processing:

   ```bash
   npm install --save-dev sharp
   ```

2. Run the icon generation script:
   ```bash
   node scripts/generate-icons.js
   ```

### Manual Generation

1. Start with the source SVG: `icon.svg`
2. Use any image editor or online tool to create PNG versions
3. Ensure all icons have proper padding and are centered
4. Test on various devices for proper display

### Icon Design Guidelines

#### Visual Design

- **Simple and recognizable** - Should be clear at small sizes
- **Consistent branding** - Use Pomofly brand colors and style
- **Proper contrast** - Ensure visibility on various backgrounds
- **Maskable safe area** - For Android adaptive icons

#### Technical Requirements

- **Format**: PNG with transparent background
- **Color depth**: 24-bit or 32-bit (with alpha channel)
- **Compression**: Optimize for file size without quality loss
- **Naming**: Follow exact naming convention for PWA compatibility

#### Maskable Icons

Android uses "maskable" icons that can be cropped into different shapes:

- Keep important elements within the safe area (center 80% of icon)
- Use solid background for better adaptation
- Test with different mask shapes (circle, square, rounded square)

## Testing Icons

### PWA Testing Tools

- [PWA Builder](https://www.pwabuilder.com/) - Test PWA compliance
- Chrome DevTools - Audit PWA requirements
- [Favicon Checker](https://realfavicongenerator.net/favicon_checker) - Test favicon display

### Device Testing

- **Android Chrome**: Test add to homescreen
- **iOS Safari**: Test add to homescreen
- **Desktop Chrome**: Test PWA installation
- **Various screen densities**: Ensure crisp display

## Icon Specifications by Platform

### Android (Chrome)

- Requires: 192x192 (minimum), 512x512 (recommended)
- Supports: Maskable icons with adaptive display
- Format: PNG with transparency

### iOS (Safari)

- Requires: 180x180 (apple-touch-icon)
- Supports: No transparency (solid background)
- Format: PNG without transparency

### Windows

- Requires: 144x144 (tile icon)
- Supports: Various tile sizes
- Format: PNG with transparency

### Desktop Browsers

- Requires: 16x16, 32x32 (favicon)
- Supports: ICO format for legacy support
- Format: PNG and ICO

## File Size Optimization

- Keep icons under 10KB each for faster loading
- Use appropriate compression for each size
- Consider using WebP format for modern browsers (fallback to PNG)
- Remove unnecessary metadata from PNG files

## Current Status

⚠️ **Placeholder icons in place** - Replace with actual Pomofly branded icons
✅ Proper file structure and naming
✅ Manifest.json configuration
✅ Generation script ready

## Next Steps

1. Design final icon based on Pomofly branding
2. Generate all required sizes using the script
3. Test PWA installation across devices
4. Optimize icon file sizes
5. Add app screenshots for enhanced PWA listing
