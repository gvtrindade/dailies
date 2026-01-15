class ActivityHistory {
    constructor() {
        this.history = this.loadHistory();
        this.activities = this.loadActivities();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDates();
        this.renderHistory();
        this.updateSummary();
    }

    setupEventListeners() {
        document.getElementById('export-csv').addEventListener('click', () => this.exportToCSV());
        document.getElementById('filter-btn').addEventListener('click', () => this.applyFilter());
        document.getElementById('clear-filter').addEventListener('click', () => this.clearFilter());
    }

    loadHistory() {
        const stored = localStorage.getItem('activityHistory');
        return stored ? JSON.parse(stored) : {};
    }

    loadActivities() {
        const stored = localStorage.getItem('dailyActivities');
        return stored ? JSON.parse(stored) : [];
    }

    saveHistory() {
        localStorage.setItem('activityHistory', JSON.stringify(this.history));
    }

    recordDailyActivity() {
        // Get the current "day" based on the 3 AM reset logic
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentDay = now.getHours() >= 3 ? today : new Date(today.getTime() - (24 * 60 * 60 * 1000));
        const dayKey = currentDay.toISOString().split('T')[0];
        
        const activities = this.loadActivities();
        
        this.history[dayKey] = {
            activities: activities.map(activity => ({
                id: activity.id,
                name: activity.name,
                completed: activity.completed,
                timestamp: new Date().toISOString()
            })),
            totalActivities: activities.length,
            completedActivities: activities.filter(a => a.completed).length
        };
        
        this.saveHistory();
    }

    setDefaultDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        document.getElementById('end-date').value = today.toISOString().split('T')[0];
        document.getElementById('start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
    }

    applyFilter() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (startDate && endDate) {
            this.renderHistory(startDate, endDate);
        }
    }

    clearFilter() {
        this.setDefaultDates();
        this.renderHistory();
    }

    renderHistory(startDate = null, endDate = null) {
        const container = document.getElementById('history-container');
        const dates = Object.keys(this.history).sort((a, b) => new Date(b) - new Date(a));
        
        let filteredDates = dates;
        if (startDate && endDate) {
            filteredDates = dates.filter(date => date >= startDate && date <= endDate);
        }

        if (filteredDates.length === 0) {
            container.innerHTML = '<p class="empty-state">No history records found for the selected period.</p>';
            return;
        }

        container.innerHTML = filteredDates.map(date => {
            const dayData = this.history[date];
            const completionRate = dayData.totalActivities > 0 
            ? Math.round((dayData.completedActivities / dayData.totalActivities) * 100)
            : 0;
            
            const dateParts = date.split("-");
            const dateObj = new Date(dateParts[0], dateParts[1], dateParts[2]);
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            return `
                <div class="history-day">
                    <div class="day-header">
                        <h3>${formattedDate}</h3>
                        <div class="day-stats">
                            <span class="completion-badge ${completionRate >= 80 ? 'high' : completionRate >= 50 ? 'medium' : 'low'}">
                                ${completionRate}% Complete
                            </span>
                            <span class="activity-count">
                                ${dayData.completedActivities}/${dayData.totalActivities} activities
                            </span>
                        </div>
                    </div>
                    <div class="day-activities">
                        ${dayData.activities.map(activity => `
                            <div class="history-activity ${activity.completed ? 'completed' : 'incomplete'}">
                                <span class="activity-status">${activity.completed ? '✓' : '○'}</span>
                                <span class="activity-name">${activity.name}</span>
                                <span class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    updateSummary() {
        const dates = Object.keys(this.history);
        const totalDays = dates.length;
        
        if (totalDays === 0) {
            document.getElementById('total-days').textContent = '0';
            document.getElementById('completion-rate').textContent = '0%';
            document.getElementById('most-completed').textContent = '-';
            return;
        }

        // Calculate overall completion rate
        const totalActivities = dates.reduce((sum, date) => sum + this.history[date].totalActivities, 0);
        const totalCompleted = dates.reduce((sum, date) => sum + this.history[date].completedActivities, 0);
        const overallRate = totalActivities > 0 ? Math.round((totalCompleted / totalActivities) * 100) : 0;

        // Find most completed activity
        const activityStats = {};
        dates.forEach(date => {
            this.history[date].activities.forEach(activity => {
                if (!activityStats[activity.name]) {
                    activityStats[activity.name] = { completed: 0, total: 0 };
                }
                activityStats[activity.name].total++;
                if (activity.completed) {
                    activityStats[activity.name].completed++;
                }
            });
        });

        let mostCompleted = '-';
        let highestRate = 0;
        Object.entries(activityStats).forEach(([name, stats]) => {
            const rate = (stats.completed / stats.total) * 100;
            if (rate > highestRate) {
                highestRate = rate;
                mostCompleted = name;
            }
        });

        document.getElementById('total-days').textContent = totalDays;
        document.getElementById('completion-rate').textContent = `${overallRate}%`;
        document.getElementById('most-completed').textContent = mostCompleted;
    }

    exportToCSV() {
        const dates = Object.keys(this.history).sort();
        
        if (dates.length === 0) {
            alert('No history data to export.');
            return;
        }

        let csv = 'Date,Activity Name,Status,Time,Completion Rate\n';
        
        dates.forEach(date => {
            const dayData = this.history[date];
            const completionRate = dayData.totalActivities > 0 
                ? Math.round((dayData.completedActivities / dayData.totalActivities) * 100)
                : 0;
            
            dayData.activities.forEach(activity => {
                const row = [
                    date,
                    `"${activity.name}"`,
                    activity.completed ? 'Completed' : 'Incomplete',
                    new Date(activity.timestamp).toLocaleTimeString(),
                    `${completionRate}%`
                ];
                csv += row.join(',') + '\n';
            });
        });

        // Create and download the CSV file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `activity-history-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Register service worker only in production
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        const isProduction = !location.hostname.includes('localhost') && !location.hostname.includes('127.0.0.1') && location.protocol === 'https:';
        
        if (isProduction) {
            navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
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
                .catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                });
        } else {
            console.log('Development mode detected - ServiceWorker registration skipped');
        }
    });
} else {
    console.log('Service workers not supported');
}

// Update management (shared with main page)
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

// Initialize history page
const historyTracker = new ActivityHistory();

// Install button handling for history page
let deferredPromptHistory;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPromptHistory = e;
    
    // Check if already installed
    if (localStorage.getItem('pwaInstalled') === 'true') {
        console.log('PWA already installed');
        return;
    }
    
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'inline-flex';
});

// Install button click handler
const installBtn = document.getElementById('install-btn');
if (installBtn) {
    installBtn.addEventListener('click', () => {
        if (!deferredPromptHistory) {
            // Enhanced debugging
            const debugInfo = {
                userAgent: navigator.userAgent,
                isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
                hasServiceWorker: !!navigator.serviceWorker,
                protocol: location.protocol,
                https: location.protocol === 'https:' || location.hostname === 'localhost'
            };
            
            console.log('History page install debug info:', debugInfo);
            
            const issues = [];
            if (!debugInfo.https) issues.push('HTTPS required');
            if (!debugInfo.hasServiceWorker) issues.push('Service Worker not supported');
            
            const message = issues.length > 0 
                ? `Cannot install: ${issues.join(', ')}. Try:\n\n1. Using HTTPS or localhost\n2. Spending 30+ seconds on site\n3. Tapping around the app\n4. Updating Chrome to latest version`
                : 'Install not available. Make sure you spend at least 30 seconds on the site and tap around before trying to install.';
            
            alert(message);
            return;
        }

        deferredPromptHistory.prompt();
        deferredPromptHistory.userChoice.then((choiceResult) => {
            console.log(`User response to install prompt: ${choiceResult.outcome}`);
            deferredPromptHistory = null;
            
            const btn = document.getElementById('install-btn');
            if (btn) btn.style.display = 'none';
            
            if (choiceResult.outcome === 'accepted') {
                localStorage.setItem('pwaInstalled', 'true');
                localStorage.setItem('pwaInstallDate', new Date().toISOString());
            }
        });
    });
}

// Handle app installed event
window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed');
    
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'none';
});