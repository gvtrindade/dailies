// Register service worker only in production
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        const isProduction = !location.hostname.includes('localhost') && !location.hostname.includes('127.0.0.1') && location.protocol === 'https:';
        
        if (isProduction) {
            navigator.serviceWorker.register('/sw.js')
                .then(function (registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);

                    // Check for service worker updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('New service worker found');
                        
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker is available, show update prompt
                                console.log('New version available');
                                showUpdatePrompt();
                            }
                        });
                    });

                    // Check for updates immediately
                    registration.update();
                })
                .catch(function (err) {
                    console.log('ServiceWorker registration failed: ', err);
                });
        } else {
            console.log('Development mode detected - ServiceWorker registration skipped');
        }
    });
} else {
    console.log('Service workers not supported');
}

// Update management
let updatePromptShown = false;
let updateDismissedCount = 0;
const UPDATE_DISMISSAL_THRESHOLD = 3; // Auto-update after 3 dismissals

function showUpdatePrompt() {
    // Check if we should auto-update after 24 hours or 3 dismissals
    const lastDismissal = localStorage.getItem('updateLastDismissed');
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (lastDismissal && (now - parseInt(lastDismissal)) > twentyFourHours) {
        // Auto-update after 24 hours
        console.log('Auto-updating after 24 hours');
        applyUpdate();
        return;
    }
    
    if (updateDismissedCount >= UPDATE_DISMISSAL_THRESHOLD) {
        // Auto-update after 3 dismissals
        console.log('Auto-updating after 3 dismissals');
        applyUpdate();
        return;
    }
    
    // Don't show if already shown in this session
    if (updatePromptShown) {
        return;
    }
    
    updatePromptShown = true;
    
    // Create update banner
    const updateBanner = document.createElement('div');
    updateBanner.id = 'update-banner';
    updateBanner.className = 'update-banner';
    updateBanner.innerHTML = `
        <div class="update-banner-content">
            <span class="update-message">🔄 New version available</span>
            <div class="update-actions">
                <button id="update-now-btn" class="btn-update-now">Refresh Now</button>
                <button id="update-later-btn" class="btn-update-later">Later</button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(updateBanner);
    
    // Add event listeners
    document.getElementById('update-now-btn').addEventListener('click', () => {
        applyUpdate();
    });
    
    document.getElementById('update-later-btn').addEventListener('click', () => {
        dismissUpdateBanner();
    });
    
    // Show with animation
    setTimeout(() => {
        updateBanner.classList.add('show');
    }, 100);
}

function applyUpdate() {
    console.log('Applying update...');
    
    // Remove banner
    const banner = document.getElementById('update-banner');
    if (banner) {
        banner.remove();
    }
    
    // Tell service worker to skip waiting
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    
    // Reload page after a short delay
    setTimeout(() => {
        window.location.reload();
    }, 100);
}

function dismissUpdateBanner() {
    console.log('Update dismissed');
    
    // Update dismissal count and timestamp
    updateDismissedCount++;
    localStorage.setItem('updateDismissedCount', updateDismissedCount.toString());
    localStorage.setItem('updateLastDismissed', Date.now().toString());
    
    // Remove banner with animation
    const banner = document.getElementById('update-banner');
    if (banner) {
        banner.classList.remove('show');
        setTimeout(() => {
            banner.remove();
        }, 300);
    }
}

// Load dismissal count from localStorage
updateDismissedCount = parseInt(localStorage.getItem('updateDismissedCount') || '0');

// PWA compatibility check
function checkPWACompatibility() {
    const checks = {
        serviceWorker: 'serviceWorker' in navigator,
        manifest: !!document.querySelector('link[rel="manifest"]'),
        https: location.protocol === 'https:' || location.hostname === 'localhost',
        installable: 'onbeforeinstallprompt' in window,
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
        storage: 'storage' in navigator && 'estimate' in navigator.storage
    };

    console.log('PWA Compatibility Check:', checks);

    const allSupported = Object.values(checks).every(Boolean);
    console.log(`PWA Installable: ${allSupported ? 'YES' : 'NO'}`);

    // Mobile-specific checks
    if (checks.mobile) {
        console.log('Mobile device detected');
        if (checks.connection) {
            console.log('Connection type:', checks.connection.effectiveType);
        }

        // Check storage
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                console.log('Storage quota:', estimate.quota, 'Used:', estimate.usage);
                const quotaMB = estimate.quota / (1024 * 1024);
                const usedMB = estimate.usage / (1024 * 1024);
                console.log(`Storage: ${usedMB.toFixed(2)}MB / ${quotaMB.toFixed(2)}MB`);

                if (quotaMB < 100) {
                    console.warn('Low storage quota may affect PWA installation');
                }
            });
        }
    }

    // Check manifest loading
    fetch('/manifest.json')
        .then(response => {
            console.log('Manifest status:', response.status);
            if (!response.ok) {
                console.error('Manifest failed to load:', response.status);
            }
        })
        .catch(error => {
            console.error('Manifest fetch error:', error);
        });

    // Check icons
    const manifestIcons = [
        'assets/icon_144.png',
        'assets/icon_192.png',
        'assets/icon_256.png',
        'assets/icon_512.png'
    ];

    Promise.all(
        manifestIcons.map(icon =>
            fetch(icon)
                .then(response => ({ icon, status: response.status, ok: response.ok }))
                .catch(error => ({ icon, error: error.message }))
        )
    ).then(results => {
        console.log('Icon loading results:', results);
        results.forEach(result => {
            if (!result.ok) {
                console.error(`Icon failed to load:`, result);
            }
        });
    });

    if (!allSupported) {
        console.warn('PWA installation may not work due to missing requirements');

        // Show user-friendly message
        const missingReqs = Object.entries(checks)
            .filter(([key, value]) => !value)
            .map(([key]) => key);

        console.log('Missing requirements:', missingReqs);
    }

    return allSupported;
}

// Run compatibility check
setTimeout(checkPWACompatibility, 1000);

// Initialize the tracker when the page loads
const tracker = new DailyActivitiesTracker();

// Record activity when page unloads (for manual history tracking)
window.addEventListener('beforeunload', () => {
    tracker.recordDailyActivity();
});

// Install prompt for PWA
let deferredPrompt;
let installPromptShown = false;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt event fired!');
    e.preventDefault();
    deferredPrompt = e;

    // Show install button
    const installBtn = document.getElementById('install-btn');
    const installPrompt = document.getElementById('install-prompt');

    if (installBtn) installBtn.style.display = 'inline-flex';

    // Check if already installed
    if (localStorage.getItem('pwaInstalled') === 'true') {
        console.log('PWA already installed');
        return;
    }

    // Mobile-specific timing: longer delay for mobile engagement
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const delayTime = isMobile ? 8000 : 5000; // 8 seconds for mobile

    // Show prompt after delay if not dismissed
    setTimeout(() => {
        if (!installPromptShown && deferredPrompt) {
            installPrompt.style.display = 'block';
            installPromptShown = true;
            console.log(`Install prompt shown after ${delayTime}ms delay`);
        }
    }, delayTime);
});

// Add mobile-specific engagement tracking
let engagementTime = 0;
let lastActivityTime = Date.now();

function trackEngagement() {
    engagementTime += Date.now() - lastActivityTime;
    lastActivityTime = Date.now();

    // Log engagement every 5 seconds
    if (engagementTime % 5000 < 100) {
        console.log(`User engagement: ${Math.round(engagementTime / 1000)}s`);

        // Check if eligible for install (30+ seconds engagement)
        if (engagementTime >= 30000 && !installPromptShown) {
            console.log('User engagement threshold reached - install should be available');
        }
    }
}

// Track user engagement for mobile
['click', 'touchstart', 'scroll', 'keydown'].forEach(event => {
    document.addEventListener(event, trackEngagement);
});

// Check for already installed PWA
window.addEventListener('load', () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is running in standalone mode');
        // Hide install elements if running as standalone
        const installBtn = document.getElementById('install-btn');
        const installPrompt = document.getElementById('install-prompt');
        if (installBtn) installBtn.style.display = 'none';
        if (installPrompt) installPrompt.style.display = 'none';
    }

    // Check storage quota for mobile
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
            const quotaMB = estimate.quota / (1024 * 1024);
            console.log(`Storage quota: ${quotaMB.toFixed(2)}MB`);

            if (quotaMB < 50) {
                console.warn('Low storage quota may prevent PWA installation');
            }
        });
    }
});

// Handle app installed event
window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed');

    // Hide install elements
    const installBtn = document.getElementById('install-btn');
    const installPrompt = document.getElementById('install-prompt');
    if (installBtn) installBtn.style.display = 'none';
    if (installPrompt) installPrompt.style.display = 'none';

    // Show success message
    const successMsg = document.createElement('div');
    successMsg.className = 'install-success';
    successMsg.textContent = '✅ App installed successfully!';
    successMsg.style.cssText = `
        background: #48bb78;
        color: white;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        text-align: center;
        font-weight: 600;
    `;

    const main = document.querySelector('main');
    main.insertBefore(successMsg, main.firstChild);

    setTimeout(() => successMsg.remove(), 3000);
});