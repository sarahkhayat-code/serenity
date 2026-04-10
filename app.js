/**
 * Serenity - Emotion Regulation Training App
 * Main Entry Point
 */

import { initUI, updateRoute } from './modules/ui.js';
import { initAuth } from './modules/auth.js';
import { initState } from './modules/state.js';

// Configuration
const CONFIG = {
    MOCK_MODE: true, // Use mock data until Firebase config is provided
    VERSION: '1.0.0'
};

/**
 * Initialize Application
 */
async function initApp() {
    console.log('Serenity Initializing...');
    
    // Initialize State Management
    const state = initState();
    
    // Initialize UI
    initUI(state);
    
    // Initialize Authentication
    const auth = await initAuth(state, CONFIG.MOCK_MODE);
    
    // Handle Navigation
    window.addEventListener('popstate', () => {
        updateRoute(state);
    });

    // Initial Route
    updateRoute(state);
    
    console.log('Serenity Ready.');
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
