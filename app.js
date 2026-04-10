/**
 * Serenity - Emotion Regulation Training App
 * Consolidated Application Script
 */

// --- STATE MODULE ---
function initState() {
    const state = {
        user: null,
        currentView: 'dashboard',
        moodHistory: [],
        preferences: {
            learningStyle: 'visual',
            goals: []
        },
        listeners: [],
        subscribe(callback) { this.listeners.push(callback); },
        update(newData) {
            Object.assign(this, newData);
            this.listeners.forEach(cb => cb(this));
        }
    };
    const localData = localStorage.getItem('serenity_state');
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            state.update(parsed);
        } catch (e) { console.error('Failed to load local state:', e); }
    }
    state.subscribe((latest) => {
        const { user, preferences, moodHistory } = latest;
        localStorage.setItem('serenity_state', JSON.stringify({ user, preferences, moodHistory }));
    });
    return state;
}

// --- AUTH MODULE ---
async function initAuth(state, isMock = true) {
    if (isMock) return initMockAuth(state);
}

function initMockAuth(state) {
    const auth = {
        currentUser: null,
        async signUp(email, name, password) {
            return new Promise((resolve) => setTimeout(() => {
                const user = { uid: 'mock_' + Date.now(), email, displayName: name };
                this.currentUser = user;
                state.update({ user });
                resolve(user);
            }, 800));
        },
        async login(email, password) {
            return new Promise((resolve) => setTimeout(() => {
                const user = { uid: 'mock_123', email, displayName: 'Sarah' };
                this.currentUser = user;
                state.update({ user });
                resolve(user);
            }, 800));
        },
        async logout() {
            this.currentUser = null;
            state.update({ user: null });
            localStorage.removeItem('serenity_state');
        }
    };
    if (state.user) auth.currentUser = state.user;
    return auth;
}

// --- EXERCISES MODULE ---
function startBreathing(container, settings = { voice: true }) {
    let isActive = true;
    let phase = 'Inhale';
    const phases = {
        'Inhale': { duration: 4000, color: '#10b981', next: 'Hold' },
        'Hold': { duration: 2000, color: '#3b82f6', next: 'Exhale' },
        'Exhale': { duration: 4000, color: '#10b981', next: 'Inhale' }
    };

    container.innerHTML = `
        <div class="breathing-session" style="text-align: center; padding-top: 3rem;">
            <h2 id="breath-phase" style="font-size: 2.5rem; margin-bottom: 2rem;">${phase}</h2>
            <div class="breathing-circle">
                <span id="breath-timer" style="font-size: 2rem; font-weight: bold;">4</span>
            </div>
            <button id="stop-breathing" class="btn-secondary" style="margin-top: 3rem;">Stop Session</button>
        </div>
    `;

    const phaseEl = document.getElementById('breath-phase');
    const timerEl = document.getElementById('breath-timer');
    const stopBtn = document.getElementById('stop-breathing');
    stopBtn.onclick = () => { isActive = false; window.serenity.navTo('dashboard'); };

    async function runCycle() {
        if (!isActive) return;
        const current = phases[phase];
        phaseEl.textContent = phase;
        phaseEl.style.color = current.color;
        if (settings.voice) speak(phase);
        let remaining = current.duration / 1000;
        while (remaining > 0 && isActive) {
            timerEl.textContent = remaining;
            await new Promise(r => setTimeout(r, 1000));
            remaining--;
        }
        if (isActive) { phase = current.next; runCycle(); }
    }
    runCycle();
}

function startReframing(container, state) {
    container.innerHTML = `
        <div class="reframing-session">
            <h2 class="section-title">Cognitive Reframing</h2>
            <p class="text-secondary">Transform negative thought patterns into balanced perspectives.</p>
            <div class="card" style="margin-top: 2rem">
                <label>Identify the Negative Thought</label>
                <textarea id="neg-thought" placeholder="e.g., 'I always fail at everything...'"></textarea>
                <div style="margin: 2rem 0; border-left: 4px solid #10b981; padding-left: 1rem;">
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

function speak(text) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
}

// --- UI MODULE ---
function initUI(state) {
    const navItems = document.querySelectorAll('.nav-item');
    const mainContent = document.getElementById('main-content');
    const quickLogBtn = document.getElementById('quick-log-btn');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.id.replace('nav-', '');
            state.update({ currentView: view === 'profile' ? 'profile' : view });
            document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
            item.classList.add('active');
        });
    });

    quickLogBtn.addEventListener('click', () => showMoodModal(state));
    state.subscribe((latest) => renderView(latest, mainContent));
}

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
    if (window.lucide) window.lucide.createIcons();
}

function renderDashboard(state) {
    const greeting = state.user ? `Welcome back, ${state.user.displayName}` : 'Welcome to Serenity';
    return `
        <div class="view-dashboard">
            <h1 class="section-title">${greeting}</h1>
            <div class="grid-2">
                <div class="card">
                    <h3>Mood Snapshot</h3>
                    <p class="text-secondary">Intensity trends (last 7 logs).</p>
                    <canvas id="moodChart" height="200"></canvas>
                </div>
                <div class="card">
                    <h3>Achievements</h3>
                    <div class="badge-row">
                        <div class="badge ${state.moodHistory.length >= 1 ? 'earned' : ''}" title="Log 1">🌱</div>
                        <div class="badge ${state.moodHistory.length >= 5 ? 'earned' : ''}" title="Log 5">🌟</div>
                        <div class="badge ${state.moodHistory.length >= 10 ? 'earned' : ''}" title="Log 10">🏆</div>
                    </div>
                </div>
            </div>
            <div class="card" style="margin-top: 1.5rem">
                <h3>Ready to Train?</h3>
                <button class="btn-primary" onclick="window.serenity.navTo('exercises')">Find an Exercise</button>
            </div>
        </div>
    `;
}

function renderExercises(state) {
    return `
        <div class="view-exercises">
            <h1 class="section-title">Training Modules</h1>
            <div class="grid-2">
                <div class="card exercise-card" data-id="breathing">
                    <div class="icon-box"><i data-lucide="wind"></i></div>
                    <h3>Box Breathing</h3>
                    <p>Regulate your nervous system.</p>
                    <button class="start-btn btn-primary">Practice</button>
                </div>
                <div class="card exercise-card" data-id="reframing">
                    <div class="icon-box"><i data-lucide="message-square"></i></div>
                    <h3>Cognitive Reframe</h3>
                    <p>Identify negative thought patterns.</p>
                    <button class="start-btn btn-primary">Start</button>
                </div>
            </div>
        </div>
    `;
}

function renderJournal(state) {
    const logs = state.moodHistory || [];
    const logItems = logs.length > 0 
        ? logs.map(log => `
            <div class="journal-entry">
                <span class="entry-date">${new Date(log.timestamp).toLocaleDateString()}</span>
                <span class="entry-mood">${log.type === 'reframe' ? '🧠' : getMoodEmoji(log.mood)}</span>
                <p>${log.type === 'reframe' ? `Reframed: ${log.pos}` : log.note}</p>
            </div>
        `).reverse().join('')
        : '<p class="text-secondary">Your journal is empty.</p>';
    return `<div class="view-journal"><h1 class="section-title">Emotional History</h1><div class="card journal-list">${logItems}</div></div>`;
}

function renderProfile(state) {
    const style = state.preferences.learningStyle;
    return `
        <div class="view-profile">
            <h1 class="section-title">Your Profile</h1>
            <div class="card">
                <h3>Learning Preferences</h3>
                <div class="preference-options" style="margin-top: 1.5rem">
                    <label class="radio-label">
                        <input type="radio" name="learningStyle" value="visual" ${style === 'visual' ? 'checked' : ''} onchange="window.serenity.setPref('visual')">
                        <span style="margin-left: 0.5rem">Visual</span>
                    </label><br><br>
                    <label class="radio-label">
                        <input type="radio" name="learningStyle" value="auditory" ${style === 'auditory' ? 'checked' : ''} onchange="window.serenity.setPref('auditory')">
                        <span style="margin-left: 0.5rem">Auditory (Voice)</span>
                    </label>
                </div>
            </div>
            <button class="btn-primary" style="background: #ef4444; margin-top: 2rem" onclick="localStorage.clear(); location.reload();">Reset App</button>
        </div>
    `;
}

function attachExerciseListeners(state) {
    document.querySelectorAll('.exercise-card').forEach(card => {
        card.querySelector('.start-btn').onclick = () => {
            const id = card.dataset.id;
            const container = document.getElementById('main-content');
            if (id === 'breathing') startBreathing(container, { voice: state.preferences.learningStyle === 'auditory' });
            else if (id === 'reframing') startReframing(container, state);
        };
    });
}

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
        <textarea id="mood-note" placeholder="Note..."></textarea>
        <button id="save-mood" class="btn-primary" style="margin-top: 1.5rem; width: 100%">Save Entry</button>
    `;
    modal.classList.remove('hidden');
    modal.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');
    document.getElementById('save-mood').onclick = () => {
        const mood = document.querySelector('.mood-btn.selected')?.dataset.mood || 'calm';
        const note = document.getElementById('mood-note').value;
        state.update({ moodHistory: [...(state.moodHistory || []), { mood, note, timestamp: Date.now() }] });
        modal.classList.add('hidden');
    };
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
    const intensities = state.moodHistory.slice(-7).map(() => Math.floor(Math.random() * 5) + 5);
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.moodHistory.slice(-7).map(l => new Date(l.timestamp).toLocaleDateString()),
            datasets: [{ label: 'Intensity', data: intensities, borderColor: '#10b981', tension: 0.4, fill: true }]
        },
        options: { plugins: { legend: { display: false } }, override: true }
    });
}

// --- APP ENTRY ---
const state = initState();
window.serenity = {
    navTo: (view) => {
        const btn = document.getElementById(`nav-${view}`);
        if (btn) btn.click();
    },
    setPref: (style) => {
        state.update({ preferences: { ...state.preferences, learningStyle: style } });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initUI(state);
    initAuth(state, true);
    state.update({ currentView: 'dashboard' });
});
