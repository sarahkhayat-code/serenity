/**
 * modules/state.js
 * Application State Management
 */

export function initState() {
    // Reactive State Object
    const state = {
        user: null,
        currentView: 'dashboard',
        moodHistory: [],
        preferences: {
            learningStyle: 'visual', // visual, auditory, kinesthetic, writing
            goals: []
        },
        
        // Listeners for state changes
        listeners: [],
        
        subscribe(callback) {
            this.listeners.push(callback);
        },
        
        update(newData) {
            Object.assign(this, newData);
            this.listeners.forEach(cb => cb(this));
        }
    };

    // Load from LocalStorage if available (persistence)
    const localData = localStorage.getItem('serenity_state');
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            state.update(parsed);
        } catch (e) {
            console.error('Failed to load local state:', e);
        }
    }

    // Persist on update
    state.subscribe((latest) => {
        const { user, preferences, moodHistory } = latest;
        localStorage.setItem('serenity_state', JSON.stringify({ user, preferences, moodHistory }));
    });

    return state;
}
