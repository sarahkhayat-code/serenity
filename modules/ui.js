/**
 * modules/ui.js
 * DOM Manipulation and Component Rendering
 */
import { startBreathing } from './exercises.js';

export function initUI(state) {
    const navItems = document.querySelectorAll('.nav-item');
    const mainContent = document.getElementById('main-content');
    const quickLogBtn = document.getElementById('quick-log-btn');

    // Navigation setup
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.id.replace('nav-', '');
            if (view === 'profile') {
                state.update({ currentView: 'profile' });
            } else {
                state.update({ currentView: view });
            }
            updateActiveNav(item);
        });
    });

    // Quick Log Action
    quickLogBtn.addEventListener('click', () => {
        showMoodModal(state);
    });

    // Subscribe to state changes to re-render
    state.subscribe((latest) => {
        renderView(latest, mainContent);
    });
}

export function updateRoute(state) {
    // Basic routing logic could go here
    state.update({ currentView: state.currentView || 'dashboard' });
}

function updateActiveNav(activeItem) {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    activeItem.classList.add('active');
}

// Global helper for simple navigation
window.serenity = {
    navTo: (view) => {
        const btn = document.getElementById(`nav-${view}`);
        if (btn) btn.click();
    }
};

/**
 * Render designated views
 */
function renderView(state, container) {
    const view = state.currentView;
    
    switch(view) {
        case 'dashboard':
            container.innerHTML = renderDashboard(state);
            initDashboardCharts(state);
            break;
        case 'exercises':
            container.innerHTML = renderExercises(state);
            attachExerciseListeners(state);
            break;
        case 'journal':
            container.innerHTML = renderJournal(state);
            break;
        case 'profile':
            container.innerHTML = renderProfile(state);
            break;
        default:
            container.innerHTML = `<p>Coming soon...</p>`;
    }

    // Refresh lucide icons for dynamic content
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Component: Dashboard
 */
function renderDashboard(state) {
    const greeting = state.user ? `Welcome back, ${state.user.displayName}` : 'Welcome to Serenity';
    
    return `
        <div class="view-dashboard">
            <h1 class="section-title">${greeting}</h1>
            
            <div class="grid-2">
                <div class="card">
                    <h3>Mood Snapshot</h3>
                    <p class="text-secondary">Your emotional landscape over the last 7 days.</p>
                    <canvas id="moodChart" height="200"></canvas>
                </div>
                
                <div class="card">
                    <h3>Ready to Train?</h3>
                    <p class="text-secondary">Take a 4-minute mindful break to recalibrate.</p>
                    <button class="btn-primary" onclick="window.serenity.navTo('exercises')">Start Breathing</button>
                </div>
            </div>

            <div class="card">
                <h3>Achievements</h3>
                <div class="badge-row">
                    <div class="badge ${state.moodHistory.length >= 1 ? 'earned' : ''}" title="Log your first mood">🌱</div>
                    <div class="badge ${state.moodHistory.length >= 5 ? 'earned' : ''}" title="Log 5 moods">🌟</div>
                    <div class="badge ${state.moodHistory.length >= 10 ? 'earned' : ''}" title="Log 10 moods">🏆</div>
                </div>
            </div>

            <div class="card">
                <h3>Recommended for you</h3>
                <div class="suggestion-list">
                    <div class="suggestion-item">
                        <i data-lucide="brain"></i>
                        <span>Cognitive Reframing for Visual Learners</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Component: Exercises
 */
function renderExercises(state) {
    return `
        <div class="view-exercises">
            <h1 class="section-title">Training Modules</h1>
            <div class="grid-2">
                <div class="card exercise-card" data-id="breathing">
                    <div class="icon-box"><i data-lucide="wind"></i></div>
                    <h3>Box Breathing</h3>
                    <p>Regulate your nervous system with a simple rhythm.</p>
                    <button class="start-btn">Practice</button>
                </div>
                <div class="card exercise-card" data-id="reframing">
                    <div class="icon-box"><i data-lucide="message-square"></i></div>
                    <h3>Cognitive Reframe</h3>
                    <p>Identify and reshape negative thought patterns.</p>
                    <button class="start-btn">Start</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Component: Journal
 */
function renderJournal(state) {
    const logs = state.moodHistory || [];
    const logItems = logs.length > 0 
        ? logs.map(log => `
            <div class="journal-entry">
                <span class="entry-date">${new Date(log.timestamp).toLocaleDateString()}</span>
                <span class="entry-mood">${getMoodEmoji(log.mood)}</span>
                <p>${log.note}</p>
            </div>
        `).join('')
        : '<p class="text-secondary">Your journal is empty. Start by logging your mood.</p>';

    return `
        <div class="view-journal">
            <h1 class="section-title">Emotional History</h1>
            <div class="card journal-list">
                ${logItems}
            </div>
        </div>
    `;
}

/**
 * Component: Profile
 */
function renderProfile(state) {
    const style = state.preferences.learningStyle;
    return `
        <div class="view-profile">
            <h1 class="section-title">Your Profile</h1>
            <div class="card">
                <h3>Learning Preferences</h3>
                <p class="text-secondary">Tailor your training experience to your learning style.</p>
                
                <div class="preference-options" style="margin-top: 1.5rem">
                    <label class="radio-label">
                        <input type="radio" name="learningStyle" value="visual" ${style === 'visual' ? 'checked' : ''}>
                        <span style="margin-left: 0.5rem">Visual (Animations & Graphics)</span>
                    </label><br><br>
                    <label class="radio-label">
                        <input type="radio" name="learningStyle" value="auditory" ${style === 'auditory' ? 'checked' : ''}>
                        <span style="margin-left: 0.5rem">Auditory (Voice Guidance)</span>
                    </label><br><br>
                    <label class="radio-label">
                        <input type="radio" name="learningStyle" value="kinesthetic" ${style === 'kinesthetic' ? 'checked' : ''}>
                        <span style="margin-left: 0.5rem">Kinesthetic (Interactive Gestures)</span>
                    </label>
                </div>
            </div>
            
            <button class="btn-primary logout-btn" style="background: #ef4444; margin-top: 2rem">Delete Local Data & Logout</button>
        </div>
    `;
}

/**
 * Event Listeners for Exercises
 */
function attachExerciseListeners(state) {
    const cards = document.querySelectorAll('.exercise-card');
    cards.forEach(card => {
        const startBtn = card.querySelector('.start-btn');
        startBtn.onclick = () => {
            const id = card.dataset.id;
            const container = document.getElementById('main-content');
            if (id === 'breathing') {
                startBreathing(container, { voice: state.preferences.learningStyle === 'auditory' });
            } else if (id === 'reframing') {
                startReframing(container, state);
            }
        };
    });
}

/**
 * Component: Cognitive Reframing Session
 */
export function startReframing(container, state) {
    container.innerHTML = `
        <div class="reframing-session">
            <h2 class="section-title">Cognitive Reframing</h2>
            <p class="text-secondary">Transform negative thought patterns into balanced perspectives.</p>
            
            <div class="card" style="margin-top: 2rem">
                <label>Identify the Negative Thought</label>
                <textarea id="neg-thought" placeholder="e.g., 'I always fail at everything...'"></textarea>
                
                <div style="margin: 2rem 0; border-left: 4px solid var(--accent-emerald); padding-left: 1rem;">
                    <p><strong>Reflection:</strong> Is there evidence that contradicts this thought? What would you say to a friend in this situation?</p>
                </div>

                <label>A Balanced Perspective</label>
                <textarea id="pos-thought" placeholder="e.g., 'I struggled today, but I have succeeded before...'"></textarea>
                
                <button id="save-reframe" class="btn-primary" style="margin-top: 1.5rem; width: 100%">Save Reflection</button>
            </div>
        </div>
    `;

    document.getElementById('save-reframe').onclick = () => {
        const neg = document.getElementById('neg-thought').value;
        const pos = document.getElementById('pos-thought').value;
        const entry = { type: 'reframe', neg, pos, timestamp: Date.now() };
        state.update({ moodHistory: [...(state.moodHistory || []), entry] });
        window.serenity.navTo('journal');
    };
}


/**
 * Utilities
 */
function getMoodEmoji(mood) {
    const map = { happy: '😊', calm: '😌', anxious: '😟', sad: '😢', angry: '😡' };
    return map[mood] || '😐';
}

function showMoodModal(state) {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <h2 style="margin-bottom: 1.5rem">How are you feeling?</h2>
        <div class="mood-selector">
            <button class="mood-btn" data-mood="happy">😊<span>Happy</span></button>
            <button class="mood-btn" data-mood="calm">😌<span>Calm</span></button>
            <button class="mood-btn" data-mood="anxious">😟<span>Anxious</span></button>
            <button class="mood-btn" data-mood="sad">😢<span>Sad</span></button>
            <button class="mood-btn" data-mood="angry">😡<span>Angry</span></button>
        </div>
        <textarea id="mood-note" placeholder="What's on your mind? (Optional)"></textarea>
        <button id="save-mood" class="btn-primary" style="margin-top: 1.5rem; width: 100%">Save Entry</button>
    `;

    modal.classList.remove('hidden');

    // Modal Close Logic
    modal.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');
    modal.querySelector('.modal-overlay').onclick = () => modal.classList.add('hidden');

    // Save Logic
    document.getElementById('save-mood').onclick = () => {
        const mood = document.querySelector('.mood-btn.selected')?.dataset.mood || 'calm';
        const note = document.getElementById('mood-note').value;
        const newHistory = [...(state.moodHistory || []), { mood, note, timestamp: Date.now() }];
        state.update({ moodHistory: newHistory });
        modal.classList.add('hidden');
    };

    // Selection Logic
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
    });
}

function initDashboardCharts(state) {
    const ctx = document.getElementById('moodChart');
    if (!ctx) return;

    // Simple Line Chart Mock
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Emotional Intensity',
                data: [5, 6, 4, 7, 8, 5, 6],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { display: false }, x: { grid: { display: false } } }
        }
    });
}
