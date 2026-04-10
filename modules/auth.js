/**
 * modules/auth.js
 * Authentication Module (Mock + Firebase Ready)
 */

export async function initAuth(state, isMock = true) {
    if (isMock) {
        console.log('Auth: Initializing in MOCK mode.');
        return initMockAuth(state);
    } else {
        // Here we would initialize real Firebase Auth
        // import { getAuth } from "https://www.gstatic.com/firebasejs/10.x/firebase-auth.js";
        console.log('Auth: Real Firebase integration required.');
    }
}

function initMockAuth(state) {
    const auth = {
        currentUser: null,
        
        async signUp(email, name, password) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const user = { uid: 'mock_' + Date.now(), email, displayName: name };
                    this.currentUser = user;
                    state.update({ user });
                    resolve(user);
                }, 800);
            });
        },
        
        async login(email, password) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const user = { uid: 'mock_123', email, displayName: 'Sarah' };
                    this.currentUser = user;
                    state.update({ user });
                    resolve(user);
                }, 800);
            });
        },
        
        async logout() {
            this.currentUser = null;
            state.update({ user: null });
            localStorage.removeItem('serenity_state');
        }
    };

    // Auto-login if user exists in state (from LocalStorage)
    if (state.user) {
        auth.currentUser = state.user;
    }

    return auth;
}
