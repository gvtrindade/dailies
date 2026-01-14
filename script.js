class DailyActivitiesTracker {
    constructor() {
        this.activities = this.loadActivities();
        this.lastResetDate = this.getLastResetDate();
        this.history = this.loadHistory();
        this.isReorderMode = false;
        this.draggedElement = null;
        this.draggedIndex = null;

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

        // Reorder button click handler
        const reorderBtn = document.getElementById('reorder-btn');
        if (reorderBtn) {
            reorderBtn.addEventListener('click', () => this.toggleReorderMode());
        }

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

    toggleReorderMode() {
        this.isReorderMode = !this.isReorderMode;
        const reorderBtn = document.getElementById('reorder-btn');

        if (this.isReorderMode) {
            reorderBtn.textContent = '✓ Finish';
            reorderBtn.classList.add('active');
        } else {
            reorderBtn.textContent = '↕️ Reorder';
            reorderBtn.classList.remove('active');
        }

        this.renderActivities();
    }

    setupDragAndDrop(element, index) {
        element.setAttribute('draggable', 'true');

        element.addEventListener('dragstart', (e) => {
            this.draggedElement = element;
            this.draggedIndex = index;
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', element.innerHTML);
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            this.draggedElement = null;
            this.draggedIndex = null;
        });

        element.addEventListener('dragover', (e) => {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';

            const container = document.getElementById('activities-container');
            const afterElement = this.getDragAfterElement(container, e.clientY);

            if (afterElement == null) {
                container.appendChild(this.draggedElement);
            } else {
                container.insertBefore(this.draggedElement, afterElement);
            }

            return false;
        });

        element.addEventListener('drop', (e) => {
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            if (this.draggedIndex !== null) {
                const newIndex = Array.from(element.parentNode.children).indexOf(this.draggedElement);

                if (this.draggedIndex !== newIndex) {
                    const [movedItem] = this.activities.splice(this.draggedIndex, 1);
                    this.activities.splice(newIndex, 0, movedItem);
                    this.saveActivities();
                }
            }

            return false;
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.activity-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
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
        if (this.isReorderMode) {
            event.preventDefault();
            return;
        }

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
        if (this.isReorderMode) return;

        const activity = this.activities.find(a => a.id === id);
        if (activity) {
            activity.completed = !activity.completed;
            this.saveActivities();
            this.updateCurrentDayHistory();
            this.renderActivities();
        }
    }

    deleteActivity(id) {
        if (this.isReorderMode) return;

        this.activities = this.activities.filter(a => a.id !== id);
        this.saveActivities();
        this.updateCurrentDayHistory();
        this.renderActivities();
    }

    startEdit(id) {
        if (this.isReorderMode) return;

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

    dismissAllActions() {
        const allActionsElements = document.querySelectorAll('.activity-actions.show');
        allActionsElements.forEach(el => el.classList.remove('show'));

        const allMoreButtons = document.querySelectorAll('.btn-more');
        allMoreButtons.forEach(btn => {
            if (window.innerWidth < 601) {
                btn.style.display = 'block';
            }
        });
    }

    toggleActions(id) {
        if (this.isReorderMode) return;

        const activityElement = document.querySelector(`[data-activity-id="${id}"]`);
        const actionsElement = activityElement.querySelector('.activity-actions');
        const moreButton = activityElement.querySelector('.btn-more');

        const isCurrentlyShown = actionsElement.classList.contains('show');

        this.dismissAllActions();

        if (!isCurrentlyShown) {
            actionsElement.classList.add('show');
            moreButton.style.display = 'none';
        }
    }

    renderActivities() {
        const container = document.getElementById('activities-container');

        if (this.activities.length === 0) {
            container.innerHTML = '<p class="empty-state">No activities yet. Add your first activity above!</p>';
            return;
        }

        console.log('Rendering activities with current order:', this.activities.map((a, i) => `${i}: ${a.name}`));

        container.innerHTML = this.activities.map((activity, index) => `
            <div class="activity-item ${this.isReorderMode ? 'reorder-mode' : ''}" data-activity-id="${activity.id}">
                ${this.isReorderMode ? '<div class="drag-handle">☰</div>' : ''}
                ${!this.isReorderMode ? `<input type="checkbox" class="activity-checkbox" ${activity.completed ? 'checked' : ''} onchange="tracker.handleCheckboxClick(event, ${activity.id})">` : ''}
                <span class="activity-text ${activity.completed ? 'completed' : ''}">${activity.name}</span>
                ${!this.isReorderMode ? `
                    <button class="btn-more" onclick="tracker.toggleActions(${activity.id})">⋮</button>
                    <div class="activity-actions">
                        <button class="btn-edit" onclick="tracker.startEdit(${activity.id})">Edit</button>
                        <button class="btn-delete" onclick="tracker.deleteActivity(${activity.id})">Delete</button>
                    </div>
                ` : ''}
            </div>
        `).join('');

        // Setup drag and drop for reorder mode
        if (this.isReorderMode) {
            const activityItems = container.querySelectorAll('.activity-item');
            activityItems.forEach((item, index) => {
                this.setupDragAndDrop(item, index);
            });
        }
    }
}

// Initialize the tracker
const tracker = new DailyActivitiesTracker();
