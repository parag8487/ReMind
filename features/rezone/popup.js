document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const backBtn = document.getElementById('backBtn');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const goalInput = document.getElementById('goalInput');
    const setGoalBtn = document.getElementById('setGoalBtn');
    const currentGoal = document.getElementById('currentGoal');
    const goalText = document.getElementById('goalText');
    const clearGoalBtn = document.getElementById('clearGoalBtn');
    const toneOptions = document.querySelectorAll('.tone-option');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const sessionTimeDisplay = document.getElementById('sessionTime');
    const currentContextDisplay = document.getElementById('currentContext');
    const insightsContainer = document.getElementById('insightsContainer');

    // Stats
    const totalDriftsText = document.createElement('div');
    totalDriftsText.className = 'insight-text';

    // Back Navigation
    backBtn.addEventListener('click', () => {
        window.location.href = '../../popup/popup.html';
    });

    // Load Initial State
    loadState();

    // Event Listeners
    setGoalBtn.addEventListener('click', setGoal);
    clearGoalBtn.addEventListener('click', clearGoal);
    clearDataBtn.addEventListener('click', clearData);

    // Pause Button Logic
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.addEventListener('click', togglePause);

    // Insights Button Logic
    const showInsightsBtn = document.getElementById('showInsightsBtn');
    showInsightsBtn.addEventListener('click', toggleDetailedInsights);

    toneOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectTone(option);
        });
    });

    // Determine current tab context
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            currentContextDisplay.textContent = tab.title.substring(0, 30) + (tab.title.length > 30 ? '...' : '');

            // Analyze "Studying" likelihood
            document.getElementById('aiStatus').style.display = 'flex';
            document.getElementById('aiStatusText').textContent = "Analyzing context...";
            setTimeout(() => {
                document.getElementById('aiStatusText').textContent = "Context Active";
            }, 800);
        }
    } catch (e) {
        currentContextDisplay.textContent = "Unknown";
    }

    // Load Insights Preview
    loadInsights();


    // Functions
    async function loadState() {
        const data = await chrome.storage.local.get(['rezone_goal', 'rezone_topic', 'rezone_tone', 'rezone_drifts', 'rezone_paused']);

        // Goal
        if (data.rezone_goal) {
            showGoal(data.rezone_goal, data.rezone_topic || '');
        }

        // Tone
        if (data.rezone_tone) {
            updateToneUI(data.rezone_tone);
        }

        // Pause State
        if (data.rezone_paused) {
            updatePauseUI(true);
        }

        // Drifts count
        const drifts = data.rezone_drifts || [];
        totalDriftsText.textContent = `Tracked ${drifts.length} drifts this week.`;
        if (drifts.length > 0) {
            const container = document.querySelector('.insight-item');
            if (container) container.innerHTML = '<span class="insight-icon">📊</span>';
            container.appendChild(totalDriftsText);
        }

        sessionTimeDisplay.textContent = "Active";
    }

    function togglePause() {
        chrome.storage.local.get('rezone_paused', (data) => {
            const isPaused = !data.rezone_paused;
            chrome.storage.local.set({ rezone_paused: isPaused });
            updatePauseUI(isPaused);
        });
    }

    function updatePauseUI(isPaused) {
        const pauseBtn = document.getElementById('pauseBtn');
        const btnText = pauseBtn.querySelector('.btn-text');

        // Find or create SVG path to update icon if needed, or just replace innerHTML
        // Simpler to rely on CSS classes if feasible, but text update is needed
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');

        if (isPaused) {
            btnText.textContent = "Resume Tracking";
            // Update icon if possible, but text is key
            pauseBtn.classList.add('paused');
            statusText.textContent = "Paused";
            statusText.style.color = "var(--warning)";
            statusDot.classList.remove('active');
            statusDot.style.backgroundColor = "var(--warning)";
        } else {
            btnText.textContent = "Pause Tracking";
            pauseBtn.classList.remove('paused');
            statusText.textContent = "Active & Learning";
            statusText.style.color = "var(--success)";
            statusDot.classList.add('active');
            statusDot.style.backgroundColor = ""; // reset to CSS default
        }
    }

    // Goal/Topic Linked Interactions
    goalInput.addEventListener('input', () => {
        const topicInput = document.getElementById('topicInput');
        if (goalInput.value.trim().length > 0) {
            topicInput.style.display = 'block';
        } else {
            topicInput.style.display = 'none';
        }
    });

    function setGoal() {
        const goal = goalInput.value.trim();
        const topic = document.getElementById('topicInput').value.trim();

        if (goal) {
            chrome.storage.local.set({ rezone_goal: goal, rezone_topic: topic });
            showGoal(goal, topic);
            goalInput.value = '';
            document.getElementById('topicInput').value = '';
        } else {
            // Shake effect or warning if empty
            goalInput.style.borderColor = 'var(--danger)';
            setTimeout(() => goalInput.style.borderColor = '', 500);
        }
    }

    function clearGoal() {
        chrome.storage.local.remove(['rezone_goal', 'rezone_topic']);
        currentGoal.style.display = 'none';
        document.querySelector('.goal-input').style.display = 'flex';
    }

    function showGoal(goal, topic) {
        document.querySelector('.goal-input').style.display = 'none';
        currentGoal.style.display = 'flex';
        goalText.textContent = goal;

        if (topic) {
            goalText.innerHTML = `${goal} <br><span style="font-size:12px; color:var(--text-tertiary); font-weight:400;">Tag: ${topic}</span>`;
        }
    }

    function selectTone(optionElement) {
        // UI
        toneOptions.forEach(opt => opt.classList.remove('active'));
        optionElement.classList.add('active');

        // Logic
        const tone = optionElement.getAttribute('data-tone');
        chrome.storage.local.set({ rezone_tone: tone });
    }

    function updateToneUI(tone) {
        toneOptions.forEach(opt => {
            if (opt.getAttribute('data-tone') === tone) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    function clearData() {
        if (confirm("Are you sure you want to clear your focus history?")) {
            chrome.storage.local.remove(['rezone_drifts', 'last_insight_shown']);
            location.reload();
        }
    }

    async function toggleDetailedInsights() {
        const btn = document.getElementById('showInsightsBtn');
        const container = document.getElementById('insightsContainer');

        if (btn.textContent.includes("Hide")) {
            // Hide
            btn.textContent = "View Detailed Insights";
            loadInsights(true); // reload simple view
        } else {
            // Show
            btn.textContent = "Hide Detailed Insights";
            const data = await chrome.storage.local.get('rezone_drifts');
            const drifts = data.rezone_drifts || [];

            if (drifts.length === 0) {
                container.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-tertiary);">No data yet. Start studying!</div>';
                return;
            }

            // Calculate stats
            let totalDuration = 0;
            let nightDrifts = 0;
            drifts.forEach(d => {
                totalDuration += d.duration;
                const h = new Date(d.timestamp).getHours();
                if (h >= 20 || h < 4) nightDrifts++;
            });

            const avgDuration = Math.round(totalDuration / drifts.length / 1000);

            let html = `
                <div style="margin-top:10px; border-top:1px solid var(--border-subtle); padding-top:10px;">
                    <div class="info-item"><span class="label">Total Drifts:</span> <span class="value">${drifts.length}</span></div>
                    <div class="info-item"><span class="label">Avg Distraction:</span> <span class="value">${avgDuration}s</span></div>
                    <div class="info-item"><span class="label">Night Drifts:</span> <span class="value">${nightDrifts}</span></div>
                    <div style="margin-top:8px; font-size:12px; color:var(--rz-accent); font-weight:600;">
                        Recent:
                    </div>
            `;

            // Show last 3
            drifts.slice(-3).reverse().forEach(d => {
                const date = new Date(d.timestamp);
                html += `
                    <div style="font-size:11px; color:var(--text-tertiary); margin-top:4px; border-left:2px solid var(--border-strong); padding-left:6px;">
                        ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${Math.round(d.duration / 1000)}s away <br>
                        <span style="color:var(--text-secondary);">${d.url ? (new URL(d.url)).hostname : 'unknown'}</span>
                    </div>
                `;
            });

            html += `</div>`;
            container.innerHTML += html;
        }
    }

    async function loadInsights(simple = true) {
        if (!simple) return; // handled by toggle
        // Reset to simple view
        const data = await chrome.storage.local.get('rezone_drifts');
        const drifts = data.rezone_drifts || [];
        const container = document.getElementById('insightsContainer');
        container.innerHTML = `
            <div class="insight-item">
              <div class="insight-icon">📊</div>
              <div class="insight-text">Tracked ${drifts.length} drifts this week.</div>
            </div>
        `;
    }
});
