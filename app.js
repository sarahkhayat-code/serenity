/**
 * Serenity - Emotion Regulation Training App
 * Consolidated Application Script
 */

// --- STATE MODULE ---
function initState() {
    const state = {
        user: null,
        currentView: 'dashboard',
        moodHistory: [{ mood: 'calm', note: 'First step into Serenity.', timestamp: Date.now() }],
        bookmarks: [],
        hasCompletedOnboarding: false,
        vitals: { bpm: 0, status: 'disconnected', isMocking: false },
        preferences: {
            learningStyle: 'visual',
            musicEnabled: true,
            bgmEnabled: true,
            sfxEnabled: true,
            musicTrack: 'auto',
            youtubeActive: true,
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
            // Force onboarding if learning style hasn't been properly set in previous versions
            if (parsed.hasCompletedOnboarding && (!parsed.preferences || !parsed.preferences.learningStyle)) {
                parsed.hasCompletedOnboarding = false;
            }
            state.update(parsed);
        } catch (e) { console.error('Failed to load local state:', e); }
    }
    state.subscribe((latest) => {
        const { user, preferences, moodHistory, bookmarks, hasCompletedOnboarding, vitals } = latest;
        localStorage.setItem('serenity_state', JSON.stringify({ user, preferences, moodHistory, bookmarks, hasCompletedOnboarding, vitals }));
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
        <div class="breathing-session" style="text-align: center; padding-top: 3rem; position: relative;">
            ${getVitalsOverlayComponent(state)}
            <div id="manual-audio-play" class="hidden" style="position: absolute; top: 1rem; left: 1rem; z-index: 100;">
                <button class="btn-secondary" style="font-size: 0.7rem; padding: 0.4rem 0.8rem;" onclick="window.serenity.audio.play(); this.parentElement.remove();">🔊 Enable Music</button>
            </div>
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
    stopBtn.onclick = () => { 
        isActive = false; 
        window.serenity.audio.stop();
        window.serenity.navTo('dashboard'); 
    };
    // Audio is now triggered by the click listener in attachExerciseListeners

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
        else { window.serenity.audio.playSFX('success'); }
    }
    runCycle();
}

function startReframing(container, state) {
    container.innerHTML = `
        <div class="reframing-session" style="position: relative;">
            ${getVitalsOverlayComponent(state)}
            <div id="manual-audio-play" class="hidden" style="position: absolute; top: 1rem; left: 1rem; z-index: 100;">
                <button class="btn-secondary" style="font-size: 0.7rem; padding: 0.4rem 0.8rem;" onclick="window.serenity.audio.play(); this.parentElement.remove();">🔊 Enable Music</button>
            </div>
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
                <button class="btn-secondary" style="margin-top: 1rem; width: 100%" onclick="window.serenity.navTo('dashboard')">Cancel</button>
            </div>
        </div>
    `;
    document.getElementById('save-reframe').onclick = () => {
        const neg = document.getElementById('neg-thought').value;
        const pos = document.getElementById('pos-thought').value;
        const entry = { type: 'reframe', neg, pos, timestamp: Date.now() };
        state.update({ moodHistory: [...(state.moodHistory || []), entry] });
        window.serenity.audio.stop();
        window.serenity.audio.playSFX('success');
        window.serenity.navTo('journal');
    };
    window.serenity.audio.play();
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
            window.serenity.audio.playSFX('click');
            state.update({ currentView: view === 'profile' ? 'profile' : view });
            document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Global Mute Toggle
    const muteBtn = document.getElementById('global-mute');
    if (muteBtn) {
        muteBtn.onclick = () => {
            const enabled = !state.preferences.musicEnabled;
            state.update({ preferences: { ...state.preferences, musicEnabled: enabled } });
            if (window.serenity.audio) {
                if (!enabled) {
                    window.serenity.audio.stop();
                    window.serenity.audio.stopBGM();
                } else {
                    window.serenity.audio.playBGM();
                }
                const icon = document.querySelector('#global-mute i');
                if (icon) icon.setAttribute('data-lucide', enabled ? 'volume-2' : 'volume-x');
                if (window.lucide) lucide.createIcons();
                window.serenity.audio.playSFX('click');
            }
        };
    }

    // Global Audio Initialization on first click
    document.body.addEventListener('click', () => {
        if (window.serenity.audio) {
            window.serenity.audio.init();
            window.serenity.audio.playBGM();
        }
    }, { once: true });

    quickLogBtn.addEventListener('click', () => {
        showMoodModal(state);
        window.serenity.audio.playSFX('click');
        if (window.serenity.audio) window.serenity.audio.init();
    });
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
        case 'resources':
            container.innerHTML = renderResources(state);
            attachResourceListeners(state);
            break;
        case 'profile':
            container.innerHTML = renderProfile(state);
            break;
        default:
            container.innerHTML = `<p>Coming soon...</p>`;
    }
    if (window.lucide) window.lucide.createIcons();
    
    // Start Visualizer if in profile
    if (view === 'profile' && window.serenity.audio) {
        window.serenity.audio.initVisualizer();
    }
}

function renderDashboard(state) {
    const greeting = state.user ? `Welcome back, ${state.user.displayName}` : 'Welcome to Serenity';
    const vitals = state.vitals || { bpm: 0, status: 'disconnected' };
    
    return `
        <div class="view-dashboard">
            <div class="dashboard-header-row">
                <div class="streak-chip">
                    <i data-lucide="award"></i>
                    <span>1 Day Streak!</span>
                </div>
                ${vitals.status === 'connected' || vitals.isMocking ? `
                    <div class="vitals-chip ${vitals.bpm > 90 ? 'elevated' : 'calm'}">
                        <i data-lucide="heart" class="pulse-icon"></i>
                        <span>${vitals.bpm} BPM</span>
                    </div>
                ` : ''}
            </div>
            
            <h1 class="section-title">${greeting}</h1>
            
            <div class="grid-2">
                <div class="card chart-card">
                    <div class="chart-header">
                        <h3>Mood Snapshot</h3>
                        <span class="trend-label">Improving ↗</span>
                    </div>
                    <p class="text-secondary" style="font-size: 0.85rem; margin-bottom: 1.5rem">You've been feeling more stable this week. Great progress!</p>
                    <div style="height: 180px; position: relative;">
                        <canvas id="moodChart"></canvas>
                    </div>
                </div>
                <div class="card">
                    <h3>Your Achievements</h3>
                    <p class="text-secondary" style="font-size: 0.85rem; margin-bottom: 1rem">Unlock badges as you practice regulation.</p>
                    <div class="badge-row">
                        <div class="badge ${state.moodHistory.length >= 1 ? 'earned' : ''}" title="Log 1">🌱</div>
                        <div class="badge ${state.moodHistory.length >= 5 ? 'earned' : ''}" title="Log 5">🌟</div>
                        <div class="badge ${state.moodHistory.length >= 10 ? 'earned' : ''}" title="Log 10">🏆</div>
                    </div>
                    <button class="btn-secondary" style="width: 100%; margin-top: 1.5rem" onclick="window.serenity.navTo('profile')">View Milestones</button>
                </div>
            </div>
            
            <div class="grid-3" style="margin-top: 1.5rem">
                <div class="card vitals-summary-card">
                    <h3 style="font-size: 1rem">Bio-Monitoring ${vitals.isMocking ? '(Mock)' : ''}</h3>
                    <div class="vitals-display" style="transform: scale(0.9)">
                        <div class="bpm-large ${vitals.status === 'connected' || vitals.isMocking ? 'active' : ''}">
                            <span class="bpm-val">${vitals.bpm || '--'}</span>
                            <span class="bpm-unit" style="font-size: 0.7rem">BPM</span>
                        </div>
                    </div>
                    ${vitals.status !== 'connected' && !vitals.isMocking ? `
                        <button class="btn-secondary" style="width: 100%; font-size: 0.8rem" onclick="window.serenity.navTo('profile')">Connect</button>
                    ` : ''}
                </div>
                <div class="card" style="grid-column: span 2">
                    <h3>Ready to Train?</h3>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button class="btn-primary" style="flex: 1" onclick="window.serenity.navTo('exercises')">Resilience Exercises</button>
                        <button class="btn-secondary" style="flex: 1" onclick="window.serenity.navTo('resources')">Expert Materials</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderExercises(state) {
    const style = state.preferences.learningStyle;
    return `
        <div class="view-exercises">
            <h1 class="section-title">Training Modules</h1>
            <p class="text-secondary" style="margin-bottom: 2rem">Personalized for your <strong>${style}</strong> learning style.</p>
            <div class="grid-2">
                <div class="card exercise-card" data-id="breathing">
                    <div class="icon-box"><i data-lucide="wind"></i></div>
                    <h3>Box Breathing</h3>
                    <p>Regulate your nervous system.</p>
                    <button class="start-btn btn-primary">Practice</button>
                </div>
                ${style === 'writing' ? `
                <div class="card exercise-card" data-id="reflection">
                    <div class="icon-box"><i data-lucide="pen-tool"></i></div>
                    <h3>Deep Reflection</h3>
                    <p>Journaling prompts for clarity.</p>
                    <button class="start-btn btn-primary">Begin</button>
                </div>` : ''}
                ${style === 'kinesthetic' ? `
                <div class="card exercise-card" data-id="centering">
                    <div class="icon-box"><i data-lucide="move"></i></div>
                    <h3>Physical Centering</h3>
                    <p>Shift your mood through movement.</p>
                    <button class="start-btn btn-primary">Start</button>
                </div>` : ''}
                <div class="card exercise-card" data-id="reframing" style="position: relative;">
                    <div class="icon-box"><i data-lucide="message-square"></i></div>
                    <h3>Cognitive Reframe</h3>
                    <p>Identify negative thought patterns.</p>
                    <button class="start-btn btn-primary" onclick="window.serenity.audio.play()">Start</button>
                    <!-- Audio Signal Indicator -->
                    <div id="audio-signal" class="hidden" style="position: absolute; bottom: 1rem; right: 1rem; display: flex; gap: 2px; align-items: flex-end; height: 12px;">
                        <div class="signal-bar" style="width: 3px; background: var(--accent-mint); animation: signal 0.5s infinite alternate;"></div>
                        <div class="signal-bar" style="width: 3px; background: var(--accent-mint); animation: signal 0.8s infinite alternate-reverse;"></div>
                        <div class="signal-bar" style="width: 3px; background: var(--accent-mint); animation: signal 0.6s infinite alternate;"></div>
                    </div>
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

function renderResources(state) {
    const resources = [
        { id: 'v1', type: 'video', category: 'Expert Video', title: 'Permission to Feel', author: 'Dr. Marc Brackett (Yale)', summary: 'A guide to recognizing and labeling emotions to win at life.', link: 'https://www.youtube.com/watch?v=fV0L_n5In8Y', icon: 'play-circle' },
        { id: 'v2', type: 'video', category: 'Expert Video', title: 'The Science of Regulation', author: 'Dr. James Gross', summary: 'A deep dive into the process model of emotion regulation.', link: 'https://www.youtube.com/watch?v=1V77HStqSg4', icon: 'play-circle' },
        { id: 'a1', type: 'article', category: 'Educational Article', title: 'Emotional Intelligence 101', summary: 'An evidence-based guide to decoding the five pillars of EQ.', link: 'https://positivepsychology.com/emotional-intelligence-eq/', icon: 'file-text' },
        { id: 'a2', type: 'article', category: 'Educational Article', title: 'Stress Management Guide', summary: 'Practical techniques for managing high-stress environments and recovery.', link: 'https://www.helpguide.org/articles/stress/stress-management.htm', icon: 'file-text' },
        { id: 'b1', type: 'book', category: 'Recommended Reading', title: 'The Body Keeps the Score', author: 'Bessel van der Kolk', summary: 'Official resource page for understanding the physical impact of trauma.', link: 'https://www.besselvanderkolk.com/resources/the-body-keeps-the-score', icon: 'book-open' },
        { id: 'b2', type: 'book', category: 'Recommended Reading', title: 'Emotional Intelligence 2.0', author: 'Travis Bradberry', summary: 'Strategies for increasing your self-awareness and relationship skills.', link: 'https://www.talentsmart.com/emotional-intelligence/', icon: 'book-open' }
    ];

    const isBookmarked = (id) => state.bookmarks?.includes(id);

    const resourceItems = resources.map(res => `
        <div class="card resource-card" data-id="${res.id}">
            <div class="resource-type-tag">${res.category}</div>
            <div class="resource-content">
                <div class="resource-icon-box"><i data-lucide="${res.icon}"></i></div>
                <div class="resource-text">
                    <h3>${res.title}</h3>
                    ${res.author ? `<p class="resource-author">by ${res.author}</p>` : ''}
                    <p class="resource-summary text-secondary">${res.summary}</p>
                </div>
            </div>
            <div class="resource-actions">
                <button class="btn-bookmark ${isBookmarked(res.id) ? 'active' : ''}" data-id="${res.id}">
                    <i data-lucide="bookmark" ${isBookmarked(res.id) ? 'fill="currentColor"' : ''}></i>
                </button>
                <a href="${res.link}" target="_blank" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Explore</a>
            </div>
        </div>
    `).join('');

    return `
        <div class="view-resources">
            <h1 class="section-title">Educational Hub</h1>
            <p class="text-secondary" style="margin-bottom: 2rem">Explore psychological strategies and expert guidance for your regulation journey.</p>
            <div class="resource-list grid-2">
                ${resourceItems}
            </div>
        </div>
    `;
}

function attachResourceListeners(state) {
    document.querySelectorAll('.btn-bookmark').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const id = btn.dataset.id;
            let bookmarks = [...(state.bookmarks || [])];
            if (bookmarks.includes(id)) {
                bookmarks = bookmarks.filter(b => b !== id);
            } else {
                bookmarks.push(id);
            }
            state.update({ bookmarks });
        };
    });
}

function renderProfile(state) {
    const style = state.preferences.learningStyle;
    const vitals = state.vitals || { status: 'disconnected', isMocking: false };
    
    return `
        <div class="view-profile">
            <h1 class="section-title">Your Profile</h1>
            
            <div class="grid-2">
                <div class="card">
                    <h3>Learning Preference</h3>
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

                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-soft)">
                        <label class="switch-row" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.serenity.toggleMusic()">
                            <span>Ambient Music during Exercises</span>
                            <div class="toggle-track ${state.preferences.musicEnabled ? 'active' : ''}">
                                <div class="toggle-knob"></div>
                            </div>
                        </label>
                        
                        <div style="margin-top: 1rem;">
                            <label style="font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 0.5rem">Select Soundtrack</label>
                            <select class="input-select" style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border-soft); background: var(--bg-white);" onchange="window.serenity.audio.setTrack(this.value)">
                                <option value="auto" ${state.preferences.musicTrack === 'auto' ? 'selected' : ''}>Default (Exercise-Specific)</option>
                                <option value="drone" ${state.preferences.musicTrack === 'drone' ? 'selected' : ''}>Binaural Focus (Synth)</option>
                                <option value="bach" ${state.preferences.musicTrack === 'bach' ? 'selected' : ''}>Classical Bach (Relaxation)</option>
                                <option value="nature" ${state.preferences.musicTrack === 'nature' ? 'selected' : ''}>Nature Rain (Grounding)</option>
                            </select>
                        </div>

                        <button class="btn-secondary" style="width: 100%; margin-top: 1rem; font-size: 0.8rem" onclick="window.serenity.audio.play(); setTimeout(() => window.serenity.audio.stop(), 5000)">
                            Test Sound (5s)
                        </button>
                        
                        <div id="audio-status-box" style="margin-top: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.03); border-radius: 10px; font-size: 0.75rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>Engine Status:</span>
                                <span id="audio-engine-state" style="font-weight: 700; color: var(--accent-lavender);">Ready</span>
                            </div>
                            
                            <!-- Audio Monitor (Canvas) -->
                            <div style="background: #000; height: 30px; border-radius: 4px; overflow: hidden; position: relative;">
                                <canvas id="audio-visualizer" style="width: 100%; height: 100%;"></canvas>
                                <span style="position: absolute; top: 2px; right: 4px; font-size: 0.5rem; color: #666;">Audio Signal Monitor</span>
                            </div>

                            <button class="btn-primary" style="width: 100%; margin-top: 0.5rem; padding: 0.4rem; font-size: 0.7rem;" onclick="window.serenity.audio.repair()">Repair & Test Audio</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3>Wearable Integration</h3>
                    <p class="text-secondary" style="font-size: 0.85rem; margin-bottom: 1.5rem">Connect a Bluetooth heart rate monitor to enable biofeedback.</p>
                    <div class="wearable-controls">
                        <div class="status-indicator">
                            <span class="status-dot ${vitals.status}"></span>
                            <span>Status: ${vitals.status}</span>
                        </div>
                        <button class="btn-primary" style="width: 100%; margin-top: 1rem;" onclick="window.serenity.connectBluetooth()">
                            ${vitals.status === 'connected' ? 'Connected' : 'Connect Device'}
                        </button>
                        
                        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-soft)">
                            <label class="switch-row" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.serenity.toggleMockVitals()">
                                <span>Virtual Biofeedback (Mock)</span>
                                <div class="toggle-track ${vitals.isMocking ? 'active' : ''}">
                                    <div class="toggle-knob"></div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <button class="btn-primary" style="background: #ef4444; margin: 3rem auto 0; display: block;" onclick="localStorage.clear(); location.reload();">Reset All Data</button>
        </div>
    `;
}

function attachExerciseListeners(state) {
    document.querySelectorAll('.exercise-card').forEach(card => {
        card.querySelector('.start-btn').onclick = () => {
            const id = card.dataset.id;
            const container = document.getElementById('main-content');
            
            // CRITICAL: Play music directly in this user interaction stack
            if (state.preferences.musicEnabled) {
                if (!state.preferences.youtubeActive) {
                    window.serenity.audio.showUnlockOverlay();
                    return;
                }
                window.serenity.audio.play(id);
                window.serenity.audio.playSFX('click');
            }

            if (id === 'breathing') startBreathing(container, { voice: state.preferences.learningStyle === 'auditory' });
            else if (id === 'reframing') startReframing(container, state);
            else if (id === 'centering') startCentering(container, state);
            else if (id === 'reflection') startReflection(container, state);
        };
    });
}

function startCentering(container, state) {
    container.innerHTML = `
        <div class="centering-session" style="text-align: center;">
            <h2 class="section-title">Physical Centering</h2>
            <p class="text-secondary">Drag the tense bubble into the calm harbor below.</p>
            <div id="centering-area" style="height: 400px; position: relative; background: rgba(0,0,0,0.02); border-radius: 20px; margin-top: 2rem; overflow: hidden;">
                <div id="tense-bubble" style="width: 80px; height: 80px; background: #fb7185; border-radius: 50%; position: absolute; left: 50%; top: 50px; transform: translateX(-50%); cursor: grab; box-shadow: 0 4px 15px rgba(251, 113, 133, 0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">TENSE</div>
                <div id="calm-harbor" style="width: 120px; height: 120px; background: var(--accent-soft-mint); border: 4px dashed var(--accent-mint); border-radius: 50%; position: absolute; left: 50%; bottom: 30px; transform: translateX(-50%); display: flex; align-items: center; justify-content: center; color: var(--accent-mint); font-weight: 600;">CALM</div>
            </div>
            <p id="centering-success" class="hidden" style="margin-top: 1.5rem; color: var(--accent-mint); font-weight: 600;">Excellent. You've centered yourself.</p>
            <button class="btn-primary" style="margin-top: 2rem" onclick="window.serenity.navTo('dashboard')">Finish</button>
        </div>
    `;

    const bubble = document.getElementById('tense-bubble');
    const harbor = document.getElementById('calm-harbor');
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    bubble.onmousedown = (e) => {
        isDragging = true;
        bubble.style.cursor = 'grabbing';
        offset = { x: e.clientX - bubble.offsetLeft, y: e.clientY - bubble.offsetTop };
    };

    document.onmousemove = (e) => {
        if (!isDragging) return;
        const x = e.clientX - offset.x;
        const y = e.clientY - offset.y;
        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';

        // Check collision
        const bRect = bubble.getBoundingClientRect();
        const hRect = harbor.getBoundingClientRect();
        if (bRect.top < hRect.bottom && bRect.bottom > hRect.top && bRect.left < hRect.right && bRect.right > hRect.left) {
            bubble.style.background = '#34d399';
            bubble.textContent = 'CALM';
            document.getElementById('centering-success').classList.remove('hidden');
        }
    };

    document.onmouseup = () => {
        isDragging = false;
        bubble.style.cursor = 'grab';
    };
}

function startReflection(container, state) {
    const prompts = [
        "What is one thing you can control right now?",
        "Describe a moment today when you felt at peace.",
        "What does resilience mean to you in this moment?",
        "If your emotion was a color, what would it be and why?"
    ];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    container.innerHTML = `
        <div class="reflection-session">
            <h2 class="section-title">Deep Reflection</h2>
            <div class="card" style="margin-top: 2rem">
                <p style="font-style: italic; color: var(--accent-lavender); margin-bottom: 1.5rem">"${prompt}"</p>
                <textarea id="reflection-text" placeholder="Pour your thoughts onto the page..."></textarea>
                <button id="save-reflection" class="btn-primary" style="margin-top: 1.5rem; width: 100%">Complete Journal Entry</button>
            </div>
        </div>
    `;
    document.getElementById('save-reflection').onclick = () => {
        const note = document.getElementById('reflection-text').value;
        const entry = { mood: 'calm', note: `Reflection: ${note}`, timestamp: Date.now() };
        state.update({ moodHistory: [...(state.moodHistory || []), entry] });
        window.serenity.audio.stop();
        window.serenity.navTo('journal');
    };
    window.serenity.audio.play();
}

function getMoodEmoji(mood) {
    const map = { happy: '😊', calm: '😌', anxious: '😟', sad: '😢', angry: '😡' };
    return map[mood] || '😐';
}

function showMoodModal(state) {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    
    const emotions = [
        { id: 'happy', label: 'Happy', emoji: '😊', color: 'var(--accent-mint)' },
        { id: 'calm', label: 'Calm', emoji: '😌', color: 'var(--accent-lavender)' },
        { id: 'anxious', label: 'Anxious', emoji: '😟', color: 'var(--accent-coral)' },
        { id: 'sad', label: 'Sad', emoji: '😢', color: '#60a5fa' },
        { id: 'angry', label: 'Angry', emoji: '😡', color: '#ef4444' }
    ];

    content.innerHTML = `
        <h2 style="margin-bottom: 0.5rem">Log Your Emotions</h2>
        <p style="margin-bottom: 1.5rem; color: #666; font-size: 0.9rem;">Rate the intensity of each emotion (0 - 10)</p>
        <div class="emotion-scales" style="display: flex; flex-direction: column; gap: 1.2rem; margin-bottom: 1.5rem;">
            ${emotions.map(e => `
                <div style="display: flex; align-items: center;">
                    <span style="width: 80px; font-weight: 500; font-size: 0.95rem;">${e.emoji} ${e.label}</span>
                    <input type="range" class="emotion-slider" data-mood="${e.id}" min="0" max="10" value="0" style="flex: 1; margin: 0 1rem; accent-color: ${e.color};" oninput="this.nextElementSibling.textContent=this.value">
                    <span style="width: 20px; text-align: right; font-weight: bold; color: #555;">0</span>
                </div>
            `).join('')}
        </div>
        <textarea id="mood-note" placeholder="Any additional notes..."></textarea>
        <button id="save-mood" class="btn-primary" style="margin-top: 1.5rem; width: 100%">Save Entry</button>
    `;
    modal.classList.remove('hidden');
    modal.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');
    
    document.getElementById('save-mood').onclick = () => {
        const sliders = document.querySelectorAll('.emotion-slider');
        const emotionData = {};
        let primaryMood = 'calm';
        let maxVal = -1;

        sliders.forEach(slider => {
            const val = parseInt(slider.value);
            emotionData[slider.dataset.mood] = val;
            if (val > maxVal) {
                maxVal = val;
                primaryMood = slider.dataset.mood;
            }
        });

        const note = document.getElementById('mood-note').value;
        state.update({ 
            moodHistory: [...(state.moodHistory || []), { 
                mood: maxVal === 0 ? 'calm' : primaryMood, 
                intensity: maxVal,
                emotions: emotionData,
                note, 
                timestamp: Date.now() 
            }] 
        });
        
        if (window.serenity && window.serenity.audio) {
            window.serenity.audio.playSFX('success');
        }
        modal.classList.add('hidden');
    };
}

function initDashboardCharts(state) {
    const ctx = document.getElementById('moodChart');
    if (!ctx) return;

    // Create Gradient
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(52, 211, 153, 0.2)'); // Mint
    gradient.addColorStop(1, 'rgba(240, 249, 255, 0)');  // Soft Blue transparent

    const intensities = state.moodHistory.slice(-7).map(() => Math.floor(Math.random() * 5) + 5);
    if (intensities.length < 7) {
        while (intensities.length < 7) intensities.unshift(Math.floor(Math.random() * 3) + 4);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Intensity',
                data: intensities,
                borderColor: '#34d399',
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#34d399',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.45, // Smooth cubic curve
                fill: true,
                backgroundColor: gradient
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 12, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    display: false,
                    suggestedMin: 0,
                    suggestedMax: 10
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 11 } }
                }
            }
        }
    });
}

// --- APP ENTRY ---
const state = initState();
window.serenity = {
    navTo: (view) => {
        const btn = document.getElementById(`nav-${view}`);
        if (btn) btn.click();
        // Initialize audio on any navigation click to unlock audio context
        if (window.serenity.audio) window.serenity.audio.init();
    },
    setPref: (style) => {
        state.update({ preferences: { ...state.preferences, learningStyle: style } });
    },
    toggleMusic: () => {
        const enabled = !state.preferences.musicEnabled;
        state.update({ preferences: { ...state.preferences, musicEnabled: enabled } });
        if (!enabled) serenity.audio.stop();
    },
    audio: {
        player: null,
        apiReady: false,
        cueQueue: null,
        playlists: {
            bach: 'PLcGkkXtask_degi8Ebeh7QuVqugv6GJPX',
            nature: 'PLuexPWX3qirhivHzsJRYK4i503oEZylZ7',
            focus: 'PLmc810SEMNsCAUZ7oRGNTlEnS-CX-xt_e'
        },
        init: () => {
            if (window.YT && window.YT.Player && !serenity.audio.player) {
                serenity.audio.player = new YT.Player('yt-player', {
                    height: '0',
                    width: '0',
                    playerVars: {
                        'autoplay': 0,
                        'controls': 0,
                        'disablekb': 1,
                        'fs': 0,
                        'rel': 0,
                        'showinfo': 0,
                        'modestbranding': 1
                    },
                    events: {
                        'onReady': (e) => {
                            serenity.audio.apiReady = true;
                            if (serenity.audio.cueQueue) {
                                serenity.audio.play(serenity.audio.cueQueue);
                                serenity.audio.cueQueue = null;
                            }
                        }
                    }
                });
            }
        },
        play: (exerciseType = null) => {
            if (!state.preferences.musicEnabled) return;
            serenity.audio.init();
            
            if (!serenity.audio.apiReady) {
                serenity.audio.cueQueue = exerciseType;
                return;
            }

            let trackKey = state.preferences.musicTrack;
            if (trackKey === 'auto') {
                if (exerciseType === 'breathing') trackKey = 'bach';
                else if (exerciseType === 'centering') trackKey = 'nature';
                else trackKey = 'focus';
            }

            const playlistId = serenity.audio.playlists[trackKey] || serenity.audio.playlists.bach;
            
            serenity.audio.player.loadPlaylist({
                list: playlistId,
                listType: 'playlist',
                index: 0,
                startSeconds: 0,
                suggestedQuality: 'small'
            });
            serenity.audio.player.setShuffle(true);
            serenity.audio.player.setLoop(true);
            serenity.audio.player.unMute();
            serenity.audio.player.setVolume(50);
            
            const signal = document.getElementById('audio-signal');
            if (signal) { signal.classList.remove('hidden'); signal.classList.add('playing'); }
        },
        stop: () => {
            if (serenity.audio.player && serenity.audio.player.stopVideo) {
                serenity.audio.player.stopVideo();
            }
            const signal = document.getElementById('audio-signal');
            if (signal) { signal.classList.remove('playing'); signal.classList.add('hidden'); }
        },
        playBGM: () => {
            if (!state.preferences.bgmEnabled || !state.preferences.musicEnabled) return;
            if (serenity.audio.bgmOscs.length > 0) return;
            
            // Soft Background Ambient (BGM)
            const bgFreqs = [146.83, 220.00]; 
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!serenity.audio.ctx) serenity.audio.ctx = new AudioContext();
            
            // Re-creating local gain for BGM to avoid dependency issues
            const g = serenity.audio.ctx.createGain();
            g.connect(serenity.audio.ctx.destination);
            g.gain.setValueAtTime(0, serenity.audio.ctx.currentTime);
            
            serenity.audio.bgmOscs = bgFreqs.map(f => {
                const osc = serenity.audio.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = f;
                osc.connect(g);
                osc.start();
                return osc;
            });
            g.gain.linearRampToValueAtTime(0.08, serenity.audio.ctx.currentTime + 5);
            serenity.audio.bgmGainRef = g;
        },
        stopBGM: () => {
            if (!serenity.audio.bgmGainRef) return;
            serenity.audio.bgmGainRef.gain.linearRampToValueAtTime(0, serenity.audio.ctx.currentTime + 2);
            setTimeout(() => {
                serenity.audio.bgmOscs.forEach(o => o.stop());
                serenity.audio.bgmOscs = [];
            }, 2100);
        },
        playSFX: (type) => {
            if (!state.preferences.sfxEnabled || !state.preferences.musicEnabled) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!serenity.audio.ctx) serenity.audio.ctx = new AudioContext();
            if (serenity.audio.ctx.state === 'suspended') serenity.audio.ctx.resume();
            
            const osc = serenity.audio.ctx.createOscillator();
            const g = serenity.audio.ctx.createGain();
            osc.connect(g);
            g.connect(serenity.audio.ctx.destination);
            
            if (type === 'click') {
                osc.frequency.setValueAtTime(800, serenity.audio.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, serenity.audio.ctx.currentTime + 0.1);
                g.gain.setValueAtTime(0.2, serenity.audio.ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, serenity.audio.ctx.currentTime + 0.1);
                osc.start();
                osc.stop(serenity.audio.ctx.currentTime + 0.1);
            } else if (type === 'success') {
                osc.frequency.setValueAtTime(440, serenity.audio.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(880, serenity.audio.ctx.currentTime + 0.3);
                g.gain.setValueAtTime(0.2, serenity.audio.ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, serenity.audio.ctx.currentTime + 0.5);
                osc.start();
                osc.stop(serenity.audio.ctx.currentTime + 0.5);
            }
        },
        showUnlockOverlay: () => {
            const overlay = document.createElement('div');
            overlay.id = 'yt-unlock-overlay';
            overlay.innerHTML = `
                <div class="glass-card" style="padding: 2.5rem; text-align: center; max-width: 400px;">
                    <i data-lucide="music" style="width: 48px; height: 48px; color: var(--accent-lavender); margin-bottom: 1.5rem;"></i>
                    <h2 style="margin-bottom: 1rem;">Unlock Audio</h2>
                    <p style="margin-bottom: 2rem; font-size: 0.9rem; opacity: 0.8;">To enable high-quality YouTube music, one initial click is required to authorize the browser.</p>
                    <button class="btn-primary" style="width: 100%;" id="btn-unlock-audio">Enable Experience</button>
                </div>
            `;
            overlay.style = "position:fixed; inset:0; background:rgba(255,255,255,0.8); backdrop-filter:blur(10px); z-index:9999; display:flex; align-items:center; justify-content:center;";
            document.body.appendChild(overlay);
            if (window.lucide) lucide.createIcons();
            
            document.getElementById('btn-unlock-audio').onclick = () => {
                serenity.audio.init();
                if (serenity.audio.player) {
                    serenity.audio.player.mute();
                    serenity.audio.player.playVideo();
                    setTimeout(() => {
                        serenity.audio.player.stopVideo();
                        serenity.audio.player.unMute();
                    }, 500);
                }
                overlay.remove();
                state.update({ preferences: { ...state.preferences, youtubeActive: true } });
            };
        }
    }
};

// YouTube API Callback
window.onYouTubeIframeAPIReady = () => {
    if (window.serenity && window.serenity.audio) {
        serenity.audio.init();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initUI(state);
    initAuth(state, true);
    
    if (!state.hasCompletedOnboarding) {
        showOnboarding(state);
    } else {
        state.update({ currentView: 'dashboard' });
    }
});

function showOnboarding(state) {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div id="onboarding-overlay">
            <div class="onboarding-card card">
                <h1>Welcome to Serenity</h1>
                <p class="text-secondary" style="margin-bottom: 2rem">Let's personalize your path to resilience.</p>
                
                <div style="text-align: left; margin-bottom: 2rem">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem">What should we call you?</label>
                    <input type="text" id="ob-name" placeholder="Your Name" style="width: 100%; padding: 0.8rem; border: 1px solid var(--border-soft); border-radius: 12px; background: var(--bg-white);">
                </div>

                <div style="text-align: left;">
                    <label style="font-weight: 600; display: block; margin-bottom: 1rem">How do you learn best?</label>
                    <div class="style-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <button class="style-btn card ob-style-opt" data-style="visual" onclick="window.serenity.selectObStyle(this)">
                            <div style="font-size: 1.5rem">👁️</div>
                            <div style="font-weight: 600; font-size: 0.9rem">Visual</div>
                        </button>
                        <button class="style-btn card ob-style-opt" data-style="auditory" onclick="window.serenity.selectObStyle(this)">
                            <div style="font-size: 1.5rem">🎧</div>
                            <div style="font-weight: 600; font-size: 0.9rem">Auditory</div>
                        </button>
                        <button class="style-btn card ob-style-opt" data-style="kinesthetic" onclick="window.serenity.selectObStyle(this)">
                            <div style="font-size: 1.5rem">🖐️</div>
                            <div style="font-weight: 600; font-size: 0.9rem">Kinesthetic</div>
                        </button>
                        <button class="style-btn card ob-style-opt" data-style="writing" onclick="window.serenity.selectObStyle(this)">
                            <div style="font-size: 1.5rem">✍️</div>
                            <div style="font-weight: 600; font-size: 0.9rem">Writing</div>
                        </button>
                    </div>
                </div>

                <button class="btn-primary" style="margin-top: 2rem; width: 100%" onclick="window.serenity.obNext(1)">Get Started</button>
            </div>
        </div>
    `;
}

window.serenity.selectObStyle = (el) => {
    document.querySelectorAll('.ob-style-opt').forEach(btn => btn.classList.remove('selected-style'));
    el.classList.add('selected-style');
    const style = el.dataset.style;
    state.update({ preferences: { ...state.preferences, learningStyle: style } });
};

window.serenity.obNext = (currentStep) => {
    const overlay = document.getElementById('onboarding-overlay');
    
    if (currentStep === 1) {
        const name = document.getElementById('ob-name').value || 'Friend';
        state.update({ user: { displayName: name } });
        
        overlay.innerHTML = `
            <div class="onboarding-card card">
                <h1>Step 2: Current Mood</h1>
                <p class="text-secondary" style="margin-bottom: 2rem">How are you feeling in this moment?</p>
                
                <div class="mood-selector" style="margin-bottom: 2rem">
                    <button class="mood-btn ob-mood-opt" data-mood="happy" onclick="window.serenity.selectObMood(this)">😊<span>Happy</span></button>
                    <button class="mood-btn ob-mood-opt" data-mood="calm" onclick="window.serenity.selectObMood(this)">😌<span>Calm</span></button>
                    <button class="mood-btn ob-mood-opt" data-mood="anxious" onclick="window.serenity.selectObMood(this)">😟<span>Anxious</span></button>
                    <button class="mood-btn ob-mood-opt" data-mood="sad" onclick="window.serenity.selectObMood(this)">😢<span>Sad</span></button>
                    <button class="mood-btn ob-mood-opt" data-mood="angry" onclick="window.serenity.selectObMood(this)">😡<span>Angry</span></button>
                </div>

                <div style="text-align: left; margin-bottom: 2rem">
                    <label style="font-weight: 600; display: block; margin-bottom: 1rem">Intensity (1-10)</label>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <input type="range" id="ob-intensity" min="1" max="10" value="5" style="flex: 1; accent-color: var(--accent-coral);" oninput="document.getElementById('intensity-val').textContent = this.value">
                        <span id="intensity-val" style="font-weight: 700; font-size: 1.2rem; min-width: 1.5rem">5</span>
                    </div>
                </div>

                <div style="text-align: left; margin-bottom: 2rem">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem">What's contributing to this feeling?</label>
                    <textarea id="ob-mood-note" placeholder="Write a few thoughts..." style="margin-top: 0; min-height: 100px;"></textarea>
                </div>

                <div style="display: flex; gap: 1rem;">
                    <button class="btn-secondary" style="flex: 1" onclick="showOnboarding(state)">Back</button>
                    <button class="btn-primary" style="flex: 2" onclick="window.serenity.finishOnboarding()">Complete Check-in</button>
                </div>
            </div>
        `;
    }
};

window.serenity.selectObMood = (el) => {
    document.querySelectorAll('.ob-mood-opt').forEach(btn => btn.classList.remove('selected'));
    el.classList.add('selected');
};

window.serenity.finishOnboarding = () => {
    const mood = document.querySelector('.ob-mood-opt.selected')?.dataset.mood || 'calm';
    const intensity = document.getElementById('ob-intensity').value;
    const note = document.getElementById('ob-mood-note').value;
    
    const entry = { mood, note: `Initial Check-in: ${note}`, intensity, timestamp: Date.now() };
    
    state.update({ 
        moodHistory: [...(state.moodHistory || []), entry],
        hasCompletedOnboarding: true,
        currentView: 'dashboard'
    });
};

window.serenity.setObStyle = (style) => {
    state.update({ 
        preferences: { ...state.preferences, learningStyle: style },
        hasCompletedOnboarding: true,
        currentView: 'dashboard' 
    });
};

// --- BIOFEEDBACK & BLUETOOTH ---
window.serenity.connectBluetooth = async () => {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['heart_rate'] }]
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const characteristic = await service.getCharacteristic('heart_rate_measurement');

        state.update({ vitals: { ...state.vitals, status: 'connected', bpm: 0 } });

        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const value = event.target.value;
            let flags = value.getUint8(0);
            let bpm = (flags & 0x01) ? value.getUint16(1, true) : value.getUint8(1);
            state.update({ vitals: { ...state.vitals, bpm, status: 'connected' } });
            checkVitalsPrompt(bpm);
        });
    } catch (err) {
        console.error('Bluetooth Error:', err);
        alert('Could not connect to wearable. Please ensure Bluetooth is enabled and your device is in pairing mode.');
    }
};

window.serenity.toggleMockVitals = () => {
    const isNowMocking = !state.vitals.isMocking;
    state.update({ vitals: { ...state.vitals, isMocking: isNowMocking, status: isNowMocking ? 'connected' : 'disconnected' } });
    
    if (isNowMocking) {
        window.serenity.mockInterval = setInterval(() => {
            const base = 75;
            const variance = Math.sin(Date.now() / 5000) * 15;
            const bpm = Math.round(base + variance);
            state.update({ vitals: { ...state.vitals, bpm } });
            checkVitalsPrompt(bpm);
        }, 2000);
    } else if (window.serenity.mockInterval) {
        clearInterval(window.serenity.mockInterval);
    }
};

let lastPromptTime = 0;
function checkVitalsPrompt(bpm) {
    if (bpm > 95 && Date.now() - lastPromptTime > 60000) {
        lastPromptTime = Date.now();
        showVitalsPrompt();
    }
}

function showVitalsPrompt() {
    const toast = document.createElement('div');
    toast.className = 'vitals-toast';
    toast.innerHTML = `
        <div class="toast-content">
            <i data-lucide="activity"></i>
            <div>
                <strong>Stress Detected</strong>
                <p>Your heart rate is elevated. Take 1 minute to reset?</p>
            </div>
        </div>
        <button onclick="this.parentElement.remove(); window.serenity.navTo('exercises')">Start Breathing</button>
    `;
    document.body.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => toast.remove(), 10000);
}
function getVitalsOverlayComponent(state) {
    const vitals = state.vitals || { bpm: 0, status: 'disconnected', isMocking: false };
    if (vitals.status !== 'connected' && !vitals.isMocking) return '';
    return `
        <div class="session-vitals-overlay vitals-chip ${vitals.bpm > 90 ? 'elevated' : 'calm'}">
            <i data-lucide="heart" class="pulse-icon"></i>
            <span>${vitals.bpm} BPM</span>
        </div>
    `;
}
