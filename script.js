class DailyActivitiesTracker {
    constructor() {
        this.activities = this.loadActivities();
        this.lastResetDate = this.getLastResetDate();
        this.history = this.loadHistory();

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCurrentDate();
        this.checkAndResetActivities();
        this.renderActivities();

        // Check for reset every minute
        setInterval(() => this.checkAndResetActivities(), 60000);
    }

    setupEventListeners() {
        const form = document.getElementById('activity-form');
        const input = document.getElementById('activity-input');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addActivity();
        });

        // Install button click handler
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => this.promptInstall());
        }

        // Install prompt button click handler
        const installPromptBtn = document.getElementById('install-prompt-btn');
        if (installPromptBtn) {
            installPromptBtn.addEventListener('click', () => this.promptInstall());
        }

        // Dismiss prompt button
        const dismissPrompt = document.getElementById('dismiss-prompt');
        if (dismissPrompt) {
            dismissPrompt.addEventListener('click', () => {
                document.getElementById('install-prompt').style.display = 'none';
                window.installPromptShown = true;
            });
        }

        // Add click listener to dismiss action menus
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.activity-item') || e.target.classList.contains('activity-text')) {
                this.dismissAllActions();
            }
        });


    }

    updateCurrentDate() {
        const dateElement = document.getElementById('current-date');
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = today.toLocaleDateString('en-US', options);
    }

    loadActivities() {
        const stored = localStorage.getItem('dailyActivities');
        return stored ? JSON.parse(stored) : [];
    }

    loadHistory() {
        const stored = localStorage.getItem('activityHistory');
        return stored ? JSON.parse(stored) : {};
    }

    saveHistory() {
        localStorage.setItem('activityHistory', JSON.stringify(this.history));
    }

    getCurrentDayKey() {
        // Get the current "day" based on 3 AM reset logic
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentDay = now.getHours() >= 3 ? today : new Date(today.getTime() - (24 * 60 * 60 * 1000));
        return currentDay.toISOString().split('T')[0];
    }

    getCurrentDayKeyForDate(date) {
        // Get the day key for a specific date based on 3 AM reset logic
        return date.toISOString().split('T')[0];
    }

    updateCurrentDayHistory() {
        const dayKey = this.getCurrentDayKey();

        this.history[dayKey] = {
            activities: this.activities.map(activity => ({
                id: activity.id,
                name: activity.name,
                completed: activity.completed,
                timestamp: new Date().toISOString()
            })),
            totalActivities: this.activities.length,
            completedActivities: this.activities.filter(a => a.completed).length
        };

        this.saveHistory();
    }

    handleCheckboxClick(event, activityId) {
        // Prevent event from propagating to drag handlers
        event.stopPropagation();
        event.preventDefault();

        // Ensure checkbox state is properly updated
        const checkbox = event.target;
        const isChecked = checkbox.checked;

        // Update activity state
        const activity = this.activities.find(a => a.id === activityId);
        if (activity) {
            activity.completed = isChecked;
            this.saveActivities();
            this.updateCurrentDayHistory();
            this.renderActivities();
        }
    }

    recordDailyActivity() {
        const dayKey = this.getCurrentDayKey();

        this.history[dayKey] = {
            activities: this.activities.map(activity => ({
                id: activity.id,
                name: activity.name,
                completed: activity.completed,
                timestamp: new Date().toISOString()
            })),
            totalActivities: this.activities.length,
            completedActivities: this.activities.filter(a => a.completed).length
        };

        this.saveHistory();
    }

    saveActivities() {
        localStorage.setItem('dailyActivities', JSON.stringify(this.activities));
    }

    getLastResetDate() {
        const stored = localStorage.getItem('lastResetDate');
        return stored ? new Date(stored) : null;
    }

    saveLastResetDate() {
        localStorage.setItem('lastResetDate', new Date().toISOString());
    }

    checkAndResetActivities() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastReset = this.lastResetDate ? new Date(this.lastResetDate.getFullYear(), this.lastResetDate.getMonth(), this.lastResetDate.getDate()) : null;

        // Check if it's 3 AM or later and we haven't reset today
        if (now.getHours() >= 3 && (!lastReset || lastReset < today)) {
            // Record yesterday's activity before reset - use getCurrentDayKey to get correct day
            const yesterdayKey = this.getCurrentDayKeyForDate(new Date(today.getTime() - (24 * 60 * 60 * 1000)));

            if (!this.history[yesterdayKey]) {
                this.history[yesterdayKey] = {
                    activities: this.activities.map(activity => ({
                        id: activity.id,
                        name: activity.name,
                        completed: activity.completed,
                        timestamp: new Date().toISOString()
                    })),
                    totalActivities: this.activities.length,
                    completedActivities: this.activities.filter(a => a.completed).length
                };
                this.saveHistory();
            }

            this.resetActivities();
            this.saveLastResetDate();
            this.lastResetDate = new Date();
        }
    }

    resetActivities() {
        this.activities = this.activities.map(activity => ({
            ...activity,
            completed: false
        }));
        this.saveActivities();
        this.renderActivities();
    }

    addActivity() {
        const input = document.getElementById('activity-input');
        const activityNames = input.value.split(';').map(name => name.trim()).filter(name => name);

        if (activityNames.length > 0) {
            const newActivities = activityNames.map(name => ({
                id: Date.now() + Math.random(),
                name: name,
                completed: false,
                createdAt: new Date().toISOString()
            }));

            this.activities.push(...newActivities);
            this.saveActivities();
            this.renderActivities();
            input.value = '';
        }
    }

    toggleActivity(id) {
        const activity = this.activities.find(a => a.id === id);
        if (activity) {
            activity.completed = !activity.completed;
            this.saveActivities();
            this.updateCurrentDayHistory();
            this.renderActivities();
        }
    }

    deleteActivity(id) {
        this.activities = this.activities.filter(a => a.id !== id);
        this.saveActivities();
        this.updateCurrentDayHistory();
        this.renderActivities();
    }

    startEdit(id) {
        const activityElement = document.querySelector(`[data-activity-id="${id}"]`);
        const textElement = activityElement.querySelector('.activity-text');
        const actionsElement = activityElement.querySelector('.activity-actions');

        // Dismiss all action menus when editing starts
        this.dismissAllActions();

        textElement.classList.add('editing');
        textElement.contentEditable = true;
        textElement.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(textElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        actionsElement.innerHTML = `
            <button class="btn-save" onclick="tracker.saveEdit(${id})">Save</button>
            <button class="btn-cancel" onclick="tracker.cancelEdit(${id})">Cancel</button>
        `;
    }

    saveEdit(id) {
        const activityElement = document.querySelector(`[data-activity-id="${id}"]`);
        const textElement = activityElement.querySelector('.activity-text');
        const newName = textElement.textContent.trim();

        if (newName) {
            const activity = this.activities.find(a => a.id === id);
            if (activity) {
                activity.name = newName;
                this.saveActivities();
                this.updateCurrentDayHistory();
                this.renderActivities();
            }
        } else {
            this.cancelEdit(id);
        }
    }

    cancelEdit(id) {
        this.renderActivities();
    }

    renderActivities() {
        const container = document.getElementById('activities-container');

        if (this.activities.length === 0) {
            container.innerHTML = '<p class="empty-state">No activities yet. Add your first activity above!</p>';
            return;
        }

        console.log('Rendering activities with current order:', this.activities.map((a, i) => `${i}: ${a.name}`));

        container.innerHTML = this.activities.map((activity, index) => `
            <div class="activity-item" data-activity-id="${activity.id}">
                <input type="checkbox" 
                       class="activity-checkbox" 
                       id="checkbox-${activity.id}"
                       ${activity.completed ? 'checked' : ''} 
                       onchange="tracker.toggleActivity(${activity.id})"
                       onclick="tracker.handleCheckboxClick(event, ${activity.id})">
                <div class="activity-text ${activity.completed ? 'completed' : ''}">${activity.name}</div>
                <button class="btn-more" onclick="tracker.toggleActions(${activity.id})">⋮</button>
                <div class="activity-actions" id="actions-${activity.id}">
                    <button class="btn-edit" onclick="tracker.startEdit(${activity.id})">Edit</button>
                    <button class="btn-delete" onclick="tracker.deleteActivity(${activity.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    toggleActions(id) {
        const actionsElement = document.getElementById(`actions-${id}`);
        const allActions = document.querySelectorAll('.activity-actions');

        // Close all other action menus
        allActions.forEach(actions => {
            if (actions.id !== `actions-${id}`) {
                actions.classList.remove('show');
            }
        });

        // Toggle current action menu
        actionsElement.classList.toggle('show');
    }

    dismissAllActions() {
        const allActions = document.querySelectorAll('.activity-actions');
        allActions.forEach(actions => {
            actions.classList.remove('show');
        });
    }

    promptInstall() {
        console.log('Install prompt triggered');

        if (!deferredPrompt) {
            // Enhanced debugging for mobile
            console.error('Install prompt not available');

            const debugInfo = {
                userAgent: navigator.userAgent,
                isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
                isStandalone: window.matchMedia('(display-mode: standalone)').matches,
                hasServiceWorker: !!navigator.serviceWorker,
                hasManifest: !!document.querySelector('link[rel="manifest"]'),
                protocol: location.protocol,
                hostname: location.hostname,
                https: location.protocol === 'https:' || location.hostname === 'localhost'
            };

            console.log('Debug info:', debugInfo);

            // Check for specific mobile issues
            const issues = [];
            if (!debugInfo.https) issues.push('HTTPS required');
            if (!debugInfo.hasServiceWorker) issues.push('Service Worker not supported');
            if (!debugInfo.hasManifest) issues.push('Manifest not found');

            const message = issues.length > 0
                ? `Cannot install: ${issues.join(', ')}. Try:\n\n1. Using HTTPS or localhost\n2. Spending 30+ seconds on site\n3. Tapping/clicking around the app\n4. Checking storage space\n5. Updating Chrome to latest version`
                : 'Install not available. Make sure you spend at least 30 seconds on the site and tap around before trying to install.';

            alert(message);
            return;
        }

        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            console.log(`User response to install prompt: ${choiceResult.outcome}`);
            deferredPrompt = null;

            // Hide prompt regardless of choice
            document.getElementById('install-prompt').style.display = 'none';
            const installBtn = document.getElementById('install-btn');
            if (installBtn) installBtn.style.display = 'none';

            if (choiceResult.outcome === 'accepted') {
                console.log('PWA installation accepted');
                // Record successful installation
                localStorage.setItem('pwaInstalled', 'true');
                localStorage.setItem('pwaInstallDate', new Date().toISOString());
            } else {
                console.log('PWA installation declined');
            }
        });
    }


}
