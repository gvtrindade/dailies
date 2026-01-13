# Daily Activities Tracker - PWA

A Progressive Web App (PWA) for tracking daily activities with completion history and offline support.

## Features

- Add, edit, and delete daily activities
- Mark activities as complete/incomplete
- Drag and drop reordering (desktop & mobile)
- Automatic daily reset at 3 AM
- Activity history with statistics
- CSV export functionality
- Offline support
- Installable as native app

## PWA Features

- **Service Worker**: Caches all assets for offline functionality
- **Web App Manifest**: Enables installation on home screen
- **Responsive Design**: Works on all devices
- **Theme Color**: Consistent branding

## Installation

1. Serve files from a web server (required for service workers)
2. Visit the app in a compatible browser
3. Click "Add to Home Screen" or install prompt

## Files Structure

```
├── index.html          # Main app page
├── history.html         # History page
├── manifest.json        # PWA manifest
├── sw.js               # Service worker
├── styles.css          # Main styles
├── history.css         # History page styles
├── script.js           # Main app logic
└── history.js          # History page logic
```

## Icons

✅ **PNG icons already created** in `/assets/` directory:
- `icon_144.png` (144x144px)
- `icon_192.png` (192x192px) 
- `icon_256.png` (256x256px)
- `icon_512.png` (512x512px)

These icons are optimized for PWA installation and include proper transparency and maskable support.

## Local Development

For local development with PWA support, use the provided script:

```bash
# Quick start with mobile testing guide
./start-pwa.sh

# Or manually:
npx http-server -p 8000 -C-0
```

**Mobile Testing Steps:**
1. Start server with `npx http-server -p 8000 -C-0`
2. Find your IP: `ipconfig getifaddr en0` (Mac) or `ip a` (Linux)
3. On phone: `http://YOUR_IP:8000`
4. Follow mobile install requirements in console output

## 📱 Mobile Installation Issues Fixed

**Key Changes Applied:**
- ✅ **PNG Icons**: Replaced base64 SVG with actual PNG files
- ✅ **Multiple Sizes**: 144px, 192px, 256px, 512px for better compatibility
- ✅ **Enhanced Service Worker**: v2 with better logging and caching
- ✅ **Mobile Engagement Tracking**: Monitors user interaction time
- ✅ **Detailed Debugging**: Console logs show specific mobile issues
- ✅ **Storage Checks**: Validates available device storage
- ✅ **Install Status**: Persists installation state
- ✅ **Network Conditions**: Better handling of mobile connectivity

**Mobile Install Requirements:**
- Spend 30+ seconds on site with interaction
- Minimum 50MB free storage space
- Updated Chrome browser
- Google Play Store login (for WebAPK signing)
- Stable network connection

Then visit `http://localhost:8000` in your browser.

## Browser Support

- Chrome/Edge (full PWA support)
- Firefox (service worker support)
- Safari (limited PWA support on iOS)