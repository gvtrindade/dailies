class ActivityHistory {
    constructor() {
        this.history = this.loadHistory();
        this.activities = this.loadActivities();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDates();
        this.updateHistory();
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

    updateHistory() {
        let changedHistory = false;
        Object.keys(this.history).forEach(day => {
            if (this.history[day].totalActivities === 0) {
                delete this.history[day];
            }
        });

        if (changedHistory) this.saveHistory();
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
            const dateObj = new Date(dateParts[0], parseInt(dateParts[1]) - 1, dateParts[2]);
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

// Initialize history page
const historyTracker = new ActivityHistory();
