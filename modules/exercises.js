/**
 * modules/exercises.js
 * Logic for Emotion Regulation Modules
 */

export function initExercises(state) {
    // This will be called when the Exercise View is loaded
}

/**
 * Breathing Exercise Controller
 */
export function startBreathing(container, settings = { voice: true }) {
    let isActive = true;
    let phase = 'Inhale'; // Inhale, Hold, Exhale
    const phases = {
        'Inhale': { duration: 4000, color: 'var(--accent-emerald)', next: 'Hold' },
        'Hold': { duration: 2000, color: 'var(--accent-blue)', next: 'Exhale' },
        'Exhale': { duration: 4000, color: 'var(--accent-emerald)', next: 'Inhale' }
    };

    container.innerHTML = `
        <div class="breathing-session">
            <h2 id="breath-phase">${phase}</h2>
            <div class="breathing-circle">
                <span id="breath-timer">4</span>
            </div>
            <button id="stop-breathing" class="btn-secondary">Stop Session</button>
        </div>
    `;

    const phaseEl = document.getElementById('breath-phase');
    const timerEl = document.getElementById('breath-timer');
    const stopBtn = document.getElementById('stop-breathing');

    stopBtn.onclick = () => {
        isActive = false;
        container.innerHTML = '<p>Session complete. How do you feel?</p>';
    };

    async function runCycle() {
        if (!isActive) return;

        const current = phases[phase];
        phaseEl.textContent = phase;
        phaseEl.style.color = current.color;

        if (settings.voice) {
            speak(phase);
        }

        // Countdown
        let remaining = current.duration / 1000;
        while (remaining > 0 && isActive) {
            timerEl.textContent = remaining;
            await sleep(1000);
            remaining--;
        }

        if (isActive) {
            phase = current.next;
            runCycle();
        }
    }

    runCycle();
}

/**
 * Speech Synthesis Helper
 */
function speak(text) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
