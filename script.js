class DailyActivitiesTracker {
    constructor() {
        this.activities = this.loadActivities();
        this.lastResetDate = this.getLastResetDate();
        this.history = this.loadHistory();
        this.isReorderMode = false;
        this.draggedElement = null;
        this.draggedIndex = null;
        this.placeholder = null;

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
        if (this.activities.length > 0) {
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
        } else {
            if (this.history[dayKey]) {
                delete this.history[dayKey];
            }
        }
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
            if (!this.history[yesterdayKey] && this.activities.length > 0) {
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
            this.updateCurrentDayHistory();
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

    makePlaceholder(draggedTask) {
        const placeholder = document.createElement('div');
        placeholder.classList.add('activity-item-placeholder');
        placeholder.style.height = `${draggedTask.offsetHeight}px`;
        return placeholder;
    }

    movePlaceholder(event, container) {
        if (!event.dataTransfer.types.includes('activity')) {
            return;
        }
        event.preventDefault();

        // Must exist because the ID is added for all drag events with an "activity" data entry
        const draggedTask = document.getElementById('dragged-task');
        if (!draggedTask) return;

        const existingPlaceholder = container.querySelector('.activity-item-placeholder');

        // If there's already a placeholder, and the cursor is still inside it, don't change anything
        if (existingPlaceholder) {
            const placeholderRect = existingPlaceholder.getBoundingClientRect();
            if (placeholderRect.top <= event.clientY && placeholderRect.bottom >= event.clientY) {
                return;
            }
        }

        // Get all activity items in the container
        const activityItems = Array.from(container.querySelectorAll('.activity-item'));

        // Find the first task that is not fully above the cursor
        for (const task of activityItems) {
            if (task.getBoundingClientRect().bottom >= event.clientY) {
                if (task === existingPlaceholder) return;
                existingPlaceholder?.remove();
                // Don't add placeholder if we're inserting exactly where the dragged item started
                if (task === draggedTask || task.previousElementSibling === draggedTask) {
                    return;
                }
                container.insertBefore(
                    existingPlaceholder || this.makePlaceholder(draggedTask),
                    task
                );
                return;
            }
        }

        // If we get here, all existing tasks are above the cursor - insert at end
        existingPlaceholder?.remove();
        if (activityItems[activityItems.length - 1] === draggedTask) return;
        container.append(existingPlaceholder || this.makePlaceholder(draggedTask));
    }

    setupDragAndDrop(item, index) {
        const container = document.getElementById('activities-container');
        
        // Helper to get current index from DOM
        const getCurrentIndex = (element) => {
            return parseInt(element.dataset.index);
        };
        
        // ==================== DESKTOP: Drag Events (MDN Pattern) ====================
        
        item.addEventListener('dragstart', (e) => {
            this.draggedElement = item;
            this.draggedIndex = getCurrentIndex(item);
            
            // Mark with ID for easy identification
            item.id = 'dragged-task';
            
            e.dataTransfer.effectAllowed = 'move';
            // Custom type to identify an activity drag
            e.dataTransfer.setData('activity', '');
        });

        item.addEventListener('dragend', (e) => {
            // Clean up ID
            item.removeAttribute('id');
            
            // Remove any remaining placeholder
            const placeholder = container.querySelector('.activity-item-placeholder');
            placeholder?.remove();
            
            this.draggedElement = null;
            this.draggedIndex = null;
        });

        // Container-level dragover handler (only attach once)
        if (!container.dataset.dragoverAttached) {
            container.dataset.dragoverAttached = 'true';
            
            container.addEventListener('dragover', (e) => {
                this.movePlaceholder(e, container);
            });

            container.addEventListener('dragleave', (e) => {
                // If we are moving into a child element, we aren't actually leaving the container
                if (container.contains(e.relatedTarget)) return;
                const placeholder = container.querySelector('.activity-item-placeholder');
                placeholder?.remove();
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();

                const draggedTask = document.getElementById('dragged-task');
                const placeholder = container.querySelector('.activity-item-placeholder');
                
                if (!placeholder || !draggedTask) return;

                // Remove dragged task from DOM
                draggedTask.remove();
                
                // Insert at placeholder position
                container.insertBefore(draggedTask, placeholder);
                
                // Remove placeholder
                placeholder.remove();

                // Now update the activities array to match DOM order
                const newOrder = Array.from(container.querySelectorAll('.activity-item')).map(el => {
                    const activityId = parseFloat(el.dataset.activityId);
                    return this.activities.find(a => a.id === activityId);
                }).filter(Boolean);

                this.activities = newOrder;
                this.saveActivities();
                this.updateCurrentDayHistory();
                
                // Re-render to ensure everything is in sync
                this.renderActivities();
            });
        }

        // ==================== MOBILE: Touch Events ====================
        
        item.addEventListener('touchstart', (e) => {
            if (!this.isReorderMode) return;
            
            this.draggedElement = item;
            this.draggedIndex = getCurrentIndex(item);
            
            const touch = e.touches[0];
            this.touchStartY = touch.clientY;
            
            // Create placeholder at current position
            this.placeholder = this.makePlaceholder(item);
            item.parentNode.insertBefore(this.placeholder, item);
            
            // Visual feedback
            item.style.opacity = '0.4';
            item.style.zIndex = '1000';
            item.style.position = 'relative';
            
            e.preventDefault();
        }, { passive: false });
    
        item.addEventListener('touchmove', (e) => {
            if (!this.isReorderMode || !this.draggedElement) return;
            
            e.preventDefault();
            
            const touch = e.touches[0];
            this.touchCurrentY = touch.clientY;
            
            // Move the element visually
            const deltaY = this.touchCurrentY - this.touchStartY;
            item.style.transform = `translateY(${deltaY}px)`;
            
            // Get element under touch point
            item.style.pointerEvents = 'none';
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            item.style.pointerEvents = '';
            
            const droppableBelow = elementBelow?.closest('.activity-item');
            
            // Move placeholder to show drop position
            if (droppableBelow && droppableBelow !== item && this.placeholder) {
                const rect = droppableBelow.getBoundingClientRect();
                const middle = rect.top + rect.height / 2;
                const insertBefore = touch.clientY < middle;
                
                const parent = droppableBelow.parentNode;
                if (insertBefore) {
                    parent.insertBefore(this.placeholder, droppableBelow);
                } else {
                    parent.insertBefore(this.placeholder, droppableBelow.nextSibling);
                }
            }
        }, { passive: false });
    
        item.addEventListener('touchend', (e) => {
            if (!this.isReorderMode || !this.draggedElement) return;
            
            // Reset visual state
            item.style.opacity = '1';
            item.style.transform = '';
            item.style.zIndex = '';
            item.style.position = '';
            
            // Calculate new position based on placeholder location
            if (this.placeholder && this.placeholder.parentNode) {
                const container = this.placeholder.parentNode;
                
                // Remove dragged item from DOM
                item.remove();
                
                // Insert at placeholder position
                container.insertBefore(item, this.placeholder);
                
                // Remove placeholder
                this.placeholder.remove();
                
                // Now update the activities array to match DOM order
                const newOrder = Array.from(container.querySelectorAll('.activity-item')).map(el => {
                    const activityId = parseFloat(el.dataset.activityId);
                    return this.activities.find(a => a.id === activityId);
                }).filter(Boolean);

                this.activities = newOrder;
                this.saveActivities();
                this.updateCurrentDayHistory();
                
                // Re-render to ensure everything is in sync
                this.renderActivities();
            } else {
                // No placeholder, just clean up
                this.placeholder?.remove();
            }
            
            this.placeholder = null;
            this.draggedElement = null;
            this.draggedIndex = null;
        });
    
        item.addEventListener('touchcancel', (e) => {
            if (!this.isReorderMode) return;
            
            item.style.opacity = '1';
            item.style.transform = '';
            item.style.zIndex = '';
            item.style.position = '';
            
            this.placeholder?.remove();
            this.placeholder = null;
            this.draggedElement = null;
            this.draggedIndex = null;
        });
    }

    renderActivities() {
        const container = document.getElementById('activities-container');

        if (this.activities.length === 0) {
            container.innerHTML = '<p class="empty-state">No activities yet. Add your first activity above!</p>';
            return;
        }

        console.log('Rendering activities with current order:', this.activities.map((a, i) => `${i}: ${a.name}`));

        container.innerHTML = this.activities.map((activity, index) => `
            <div class="activity-item ${this.isReorderMode ? 'reorder-mode' : ''}" 
                 data-activity-id="${activity.id}" 
                 data-index="${index}"
                 ${this.isReorderMode ? 'draggable="true"' : ''}>
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
