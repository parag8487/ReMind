/**
 * ReZone Content Script
 * Handles drift detection, context re-entry, and Gemini Nano integration.
 */

class ReZone {
    constructor() {
        this.isActive = false;
        this.startTime = Date.now();
        // this.driftStartTime removed in favor of sessionStorage
        this.DRIFT_THRESHOLD = 2000; // 2 seconds for easier testing
        this.sessionData = {
            startTime: Date.now(),
            totalTime: 0,
            drifts: []
        };
        this.tone = 'standard'; // 'kid', 'standard', 'playful'
        this.lastParagraph = '';
        this.observer = null;
        this.isPaused = false;
        this.goal = '';
        this.topic = '';
        this.distractionTimer = null;

        // Tone Dictionaries with SVG Icons
        this.TONE_COPY = {
            kid: {
                welcome: "Welcome back! Let’s start again from where you stopped 😊",
                goal_prefix: "Your goal is learning things.",
                distraction_msg: "Hmm… this page looks like something else. Should we go back to learning?",
                btn_back: "⬅️ Back to Learning",
                btn_stay: "❌ Nope, I want this",
                icon: `<svg width="80" height="80" viewBox="0 0 24 24" fill="#a8e6cf" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
                        <path d="M21 9a3 3 0 0 0-3-3h-.78c-.28-3.3-3-6-6.22-6h-2c-3.23 0-5.92 2.7-6.22 6H2a3 3 0 0 0-3 3v2a3 3 0 0 0 .36 1.4A7.21 7.21 0 0 0 .74 18.25a6 6 0 0 0 7.6 3.75h7.32a6 6 0 0 0 4.6-2.75 7.21 7.21 0 0 0 1.38-6.85A3 3 0 0 0 22 11V9ZM5 8h.22A5.93 5.93 0 0 0 7 12.72V14a1 1 0 0 0 2 0v-.29a6 6 0 0 0 5.84 0V14a1 1 0 0 0 2 0v-1.28A5.93 5.93 0 0 0 18.78 8H19a1 1 0 0 1 1 1v2a1 1 0 0 1-.58.91 5.25 5.25 0 0 1-1 .28 1 1 0 0 0-.79 1.17 1 1 0 0 0 1.17.79 7.4 7.4 0 0 0 1.22-.38A5.25 5.25 0 0 1 18.66 18a4 4 0 0 1-3 1H8.34a4 4 0 0 1-3-1 5.25 5.25 0 0 1-1.38-4.18 7.4 7.4 0 0 0 1.22.38 1 1 0 0 0 1.17-.79 1 1 0 0 0-.79-1.17 5.25 5.25 0 0 1-1-.28A1 1 0 0 1 4 11V9a1 1 0 0 1 1-1z"/>
                        <circle cx="9" cy="11" r="1.5" fill="#333" />
                        <circle cx="15" cy="11" r="1.5" fill="#333" />
                        <path d="M12 14c-1 0-2 .5-2 1.5S10 17 12 17s2-.5 2-1.5S13 14 12 14z" fill="#333"/>
                       </svg>`
            },
            standard: {
                welcome: "Welcome back! Let’s continue where you left off.",
                goal_prefix: "Your goal is research.",
                distraction_msg: "This page seems unrelated. Do you want to return to focus?",
                btn_back: "⬅️ Back to Work",
                btn_stay: "No, I need this",
                icon: `<svg width="80" height="80" viewBox="0 0 24 24" fill="#3b82f6" style="filter: drop-shadow(0 4px 6px rgba(59, 130, 246, 0.3));">
                        <path d="M21.66 4.53a2 2 0 0 0-1.29-.68l-8-1.34a2 2 0 0 0-1.89.67l-8-1.33A2 2 0 0 0 0 4v14a2 2 0 0 0 2.34 1.94l8 1.33a2 2 0 0 0 3.32 0l8-1.33A2 2 0 0 0 24 18V4.66a2 2 0 0 0-2.34-.13zM11 19.23 2.6 17.83A.14.14 0 0 1 2.51 17.7V4.3l8.49 1.41v13.52zm10.49-1.4L13 19.23V5.71l8.49-1.41L21.49 17.7a.14.14 0 0 1-.09.13z"/>
                       </svg>`
            },
            playful: {
                welcome: "Aww, welcome back! Ready to pick up where you left off? 😌",
                goal_prefix: "Your goal is research… remember? Hehehe 👀",
                distraction_msg: "Ooo 👀 this page is very not work… you sneaky little multitasker 😏 Back to work or keep misbehaving?",
                btn_back: "⬅️ Yes yes, back to work 🧠",
                btn_stay: "🙈 Nope, I need this",
                icon: `<svg width="80" height="80" viewBox="0 0 24 24" fill="#8e54e9" style="filter: drop-shadow(0 4px 6px rgba(142, 84, 233, 0.3));">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zM7 9a1 1 0 0 1 1-1h.5a1.5 1.5 0 0 1 3 0 1 1 0 0 1-2 0H9a1 1 0 0 1-2 0zm8.5 0a1 1 0 0 1-1-1H14a1.5 1.5 0 0 1-3 0 1 1 0 0 1 2 0h.5a1 1 0 0 1 1 0zm-8.34 4.6a1 1 0 0 1 1.36.37 5.23 5.23 0 0 0 6.96 0 1 1 0 1 1 1.56 1.25 7.24 7.24 0 0 1-10.08 0 1 1 0 0 1 .2-1.62zM4.55 6.13a1 1 0 0 1 1.32-.38l2 1a1 1 0 1 1-.89 1.78l-2-1a1 1 0 0 1-.43-1.4zm14.58.38a1 1 0 0 1 1.32.38.93.93 0 0 1-.13 1.37l-2 1a1 1 0 0 1-1.34-.48 1 1 0 0 1 .48-1.34z"/>
                       </svg>`
            }
        };

        this.init();
    }

    getToneContent() {
        return this.TONE_COPY[this.tone] || this.TONE_COPY.standard;
    }

    async init() {
        // CLEAN SLATE: Clear any lingering drift state from previous sessions/restarts
        sessionStorage.removeItem('rezone_drift_start');
        sessionStorage.removeItem('rezone_drift_url');

        // Load saved settings
        const stored = await chrome.storage.local.get(['rezone_tone', 'rezone_sessions', 'rezone_paused', 'rezone_goal', 'rezone_topic']);
        if (stored.rezone_tone) {
            this.tone = stored.rezone_tone;
        }
        if (stored.rezone_goal) this.goal = stored.rezone_goal;
        if (stored.rezone_topic) this.topic = stored.rezone_topic;

        if (stored.rezone_paused) {
            this.isPaused = true;
            console.log('ReZone is paused ⏸️');
        }

        // Listen for storage changes (Pause/Resume from popup)
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.rezone_paused) {
                    this.isPaused = changes.rezone_paused.newValue;
                    if (this.isPaused) {
                        console.log('ReZone paused by user');
                        this.clearDistractionTimer();
                        sessionStorage.removeItem('rezone_drift_start'); // Clear persistent drift
                    } else {
                        console.log('ReZone resumed');
                        this.trackContent(); // Re-verify content
                        if (!document.hidden) this.startDistractionTimer();
                    }
                }
                if (changes.rezone_tone) this.tone = changes.rezone_tone.newValue;
                if (changes.rezone_goal) {
                    this.goal = changes.rezone_goal.newValue;
                    // If goal changes while we are looking at a page, re-check distraction
                    if (!document.hidden) this.startDistractionTimer();
                }
                if (changes.rezone_topic) this.topic = changes.rezone_topic.newValue;
            }
        });

        // Set up listeners
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        window.addEventListener('blur', () => this.handleBlur());
        window.addEventListener('focus', () => this.handleFocus());

        // Start tracking content
        this.trackContent();

        // Log history and start distraction timer
        this.logHistory();
        if (!document.hidden) {
            this.startDistractionTimer();
        }

        console.log('ReZone initialized 🧠 (Clean Slate)');
    }

    startDistractionTimer() {
        this.clearDistractionTimer();
        console.log(`%c[ReZone] Timer Started (10s) for: ${document.title.substring(0, 20)}...`, "color: #aaa");
        // Check after 10 seconds of continuous focus
        this.distractionTimer = setTimeout(() => {
            console.log("%c[ReZone] Timer Fired! Checking...", "color: orange");
            this.checkDistraction();
        }, 10000);
    }

    clearDistractionTimer() {
        if (this.distractionTimer) {
            clearTimeout(this.distractionTimer);
            this.distractionTimer = null;
        }
    }

    trackContent() {
        // ... (unchanged)
        // We assume the user is "studying" if the page contains text content.
        // We use an IntersectionObserver to find visible paragraphs.

        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5
        };

        this.observer = new IntersectionObserver((entries) => {
            if (this.isPaused) return;

            entries.forEach(entry => {
                // Lowered threshold to 20 chars for broader compatibility
                if (entry.isIntersecting && entry.target.tagName === 'P' && entry.target.textContent.length > 20) {
                    this.lastParagraph = entry.target.textContent.substring(0, 150) + '...';
                }
            });
        }, options);

        const paragraphs = document.querySelectorAll('p');
        if (paragraphs.length > 0) {
            paragraphs.forEach(p => this.observer.observe(p));
        } else {
            // Fallback for pages with no P tags (e.g. some apps)
            this.lastParagraph = document.title;
        }
    }

    handleVisibilityChange() {
        if (this.isPaused) return;

        if (document.hidden) {
            this.startDrift();
            this.clearDistractionTimer();
        } else {
            this.endDrift();
            this.startDistractionTimer();
        }
    }

    handleBlur() {
        if (this.isPaused) return;
        console.log("[ReZone] Window Blurred / Tab Switch");
        this.startDrift();
        this.clearDistractionTimer();
    }

    handleFocus() {
        if (this.isPaused) return;
        console.log("[ReZone] Window Focused");
        this.endDrift(); // Check if we should show Re-Entry
        this.startDistractionTimer(); // Start the 20s countdown for distraction alerts
    }

    startDrift() {
        // Use sessionStorage to survive tab discards
        const now = Date.now();
        sessionStorage.setItem('rezone_drift_start', now.toString());
        sessionStorage.setItem('rezone_drift_url', window.location.href);
        console.log(`[ReZone] Drift Started at ${now}`);
    }

    async endDrift() {
        const driftStartStr = sessionStorage.getItem('rezone_drift_start');
        const driftUrl = sessionStorage.getItem('rezone_drift_url');

        if (!driftStartStr) return; // No drift started

        // STRICT URL CHECK (Normalized)
        const currentUrl = window.location.href.replace(/\/$/, "");
        const savedUrl = (driftUrl || "").replace(/\/$/, "");

        if (savedUrl && savedUrl !== currentUrl) {
            console.log(`[ReZone] URL Mismatch. Saved: ${savedUrl}, Current: ${currentUrl}. Resetting.`);
            sessionStorage.removeItem('rezone_drift_start');
            sessionStorage.removeItem('rezone_drift_url');
            return;
        }

        const driftStart = parseInt(driftStartStr, 10);
        const driftDuration = Date.now() - driftStart;

        // Clear immediately so we don't trigger again until next blur
        sessionStorage.removeItem('rezone_drift_start');
        sessionStorage.removeItem('rezone_drift_url');

        console.log(`[ReZone] Drift Ended. Duration: ${driftDuration}ms (Threshold: ${this.DRIFT_THRESHOLD})`);

        if (driftDuration > this.DRIFT_THRESHOLD) {
            console.log(`[ReZone] Drift Valid (> ${this.DRIFT_THRESHOLD}ms). Processing Logic...`);

            // LOGIC BRANCH 1: NO GOAL SET
            if (!this.goal) {
                console.log("[ReZone] Logic: No Goal Set -> Always Show Generic Re-Entry");
                await this.showReEntryCard(driftDuration);
                this.logDrift(driftDuration);
                return;
            }

            // LOGIC BRANCH 2: GOAL IS SET
            console.log("[ReZone] Logic: Goal Set -> Checking Relevance...");
            const relevance = await this.analyzePageRelevance();
            console.log(`[ReZone] AI Verdict: ${relevance}`);

            if (relevance === "RELEVANT") {
                // Relevant Content -> Show Welcome Back
                await this.showReEntryCard(driftDuration);
            } else {
                console.log("[ReZone] Returned to DISTRACTION. Suppressing Re-Entry Card.");
            }

            this.logDrift(driftDuration); // Ensure this is logged
        }
    }

    isContextValid() {
        return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    }

    logDrift(duration) {
        if (!this.isContextValid()) return;

        // Save locally for Weeky Insight
        try {
            chrome.storage.local.get(['rezone_drifts'], (result) => {
                if (chrome.runtime.lastError) return; // Handle generic storage errors
                const drifts = result.rezone_drifts || [];
                drifts.push({
                    timestamp: Date.now(),
                    duration: duration,
                    url: window.location.href,
                    tone: this.tone
                });
                chrome.storage.local.set({ rezone_drifts: drifts });
                console.log("[ReZone] Drift Logged to History.");
            });
        } catch (e) {
            console.warn("[ReZone] Context invalid during logDrift, ignoring.");
        }
    }

    getPageContent() {
        // ... (unchanged)
        // Gather key signals
        const title = document.title;
        const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
        const h1 = document.querySelector('h1')?.innerText || '';

        let bodyText = "";

        // Strategy 1: Visible Paragraphs (Best for articles)
        const paragraphs = document.querySelectorAll('p');
        let pText = "";
        for (const p of paragraphs) {
            if (p.innerText.length > 50 && p.offsetParent !== null) {
                pText += p.innerText + " ";
                if (pText.length > 1000) break;
            }
        }

        if (pText.length > 200) {
            bodyText = pText;
        } else {
            // Strategy 2: Generic Body Text (Best for SPAs/YouTube)
            // Look for main content logic
            const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
            if (main) {
                // Get text but limit length to avoid massive processing
                bodyText = main.innerText.replace(/\s+/g, ' ').substring(0, 1500);
            }
        }

        const fullContext = `Title: ${title}\nDescription: ${metaDesc}\nHeader: ${h1}\nContent Snippet: ${bodyText.substring(0, 1000)}`;
        // Update lastParagraph for other features just in case
        if (!this.lastParagraph && bodyText) this.lastParagraph = bodyText.substring(0, 150) + "...";

        return fullContext;
    }

    async getAIWelcomeMessage() {
        // We prioritize the static welcome message from the Tone Dictionary first
        const content = this.getToneContent();
        const staticWelcome = content.welcome;

        // We return the static copy to be perfectly compliant with the user request.
        return staticWelcome;
    }

    async showReEntryCard(driftDuration) {
        if (!this.isContextValid()) return;

        // Double check pause state from storage to be absolutely sure
        // This handles cases where the in-memory 'isPaused' might be stale due to context issues
        try {
            const stored = await chrome.storage.local.get('rezone_paused');
            if (stored.rezone_paused) {
                this.isPaused = true;
                return;
            }
        } catch (e) { return; } // Abort if storage read fails

        // Remove existing if any
        const existing = document.getElementById('rezone-container');
        if (existing) existing.remove();

        // Create container
        const container = document.createElement('div');
        container.id = 'rezone-container';

        // Generate Message (Static from Tone)
        const message = await this.getAIWelcomeMessage();
        const timeSpent = Date.now() - this.startTime;
        const content = this.getToneContent();

        // Conditional Goal Row
        const goalRowHtml = this.goal ? `
          <div class="rz-stat-row">
            <span class="rz-icon">📌</span>
            <span>Goal: <strong>${this.goal}</strong></span>
          </div>` : '';

        // HTML Structure
        container.innerHTML = `
      <div class="rz-card">
        <div class="rz-card-header">
          <h2 class="rz-card-title">
             <span style="font-size:24px; display:inline-flex; align-items:center; width:24px; height:24px; overflow:hidden;">${content.icon.replace(/width="\d+"/, 'width="24"').replace(/height="\d+"/, 'height="24"')}</span> 
             &nbsp;ReZone Re-Entry
          </h2>
          <button class="rz-card-close" id="rz-close">✕</button>
        </div>
        
        <div class="rz-card-content">
          ${goalRowHtml}
          <div class="rz-stat-row">
            <span class="rz-icon">⏱</span>
            <span>Time spent: <strong>${this.formatTime(timeSpent)}</strong></span>
          </div>
          
          <div class="rz-preview-box">
            "${this.lastParagraph || '...'}"
          </div>

          <div class="rz-tone-message">
            ${message}
          </div>

          <div class="rz-tone-selector">
            <div class="rz-tone-option ${this.tone === 'kid' ? 'active' : ''}" data-tone="kid" title="Tiny Mode">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 9a3 3 0 0 0-3-3h-.78c-.28-3.3-3-6-6.22-6h-2c-3.23 0-5.92 2.7-6.22 6H2a3 3 0 0 0-3 3v2a3 3 0 0 0 .36 1.4A7.21 7.21 0 0 0 .74 18.25a6 6 0 0 0 7.6 3.75h7.32a6 6 0 0 0 4.6-2.75 7.21 7.21 0 0 0 1.38-6.85A3 3 0 0 0 22 11V9ZM5 8h.22A5.93 5.93 0 0 0 7 12.72V14a1 1 0 0 0 2 0v-.29a6 6 0 0 0 5.84 0V14a1 1 0 0 0 2 0v-1.28A5.93 5.93 0 0 0 18.78 8H19a1 1 0 0 1 1 1v2a1 1 0 0 1-.58.91 5.25 5.25 0 0 1-1 .28 1 1 0 0 0-.79 1.17 1 1 0 0 0 1.17.79 7.4 7.4 0 0 0 1.22-.38A5.25 5.25 0 0 1 18.66 18a4 4 0 0 1-3 1H8.34a4 4 0 0 1-3-1 5.25 5.25 0 0 1-1.38-4.18 7.4 7.4 0 0 0 1.22.38 1 1 0 0 0 1.17-.79 1 1 0 0 0-.79-1.17 5.25 5.25 0 0 1-1-.28A1 1 0 0 1 4 11V9a1 1 0 0 1 1-1z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M12 14c-1 0-2 .5-2 1.5S10 17 12 17s2-.5 2-1.5S13 14 12 14z"/></svg>
            </div>
            <div class="rz-tone-option ${this.tone === 'standard' ? 'active' : ''}" data-tone="standard" title="Standard">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.66 4.53a2 2 0 0 0-1.29-.68l-8-1.34a2 2 0 0 0-1.89.67l-8-1.33A2 2 0 0 0 0 4v14a2 2 0 0 0 2.34 1.94l8 1.33a2 2 0 0 0 3.32 0l8-1.33A2 2 0 0 0 24 18V4.66a2 2 0 0 0-2.34-.13zM11 19.23 2.6 17.83A.14.14 0 0 1 2.51 17.7V4.3l8.49 1.41v13.52zm10.49-1.4L13 19.23V5.71l8.49-1.41L21.49 17.7a.14.14 0 0 1-.09.13z"/></svg>
            </div>
            <div class="rz-tone-option ${this.tone === 'playful' ? 'active' : ''}" data-tone="playful" title="Playful">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zM7 9a1 1 0 0 1 1-1h.5a1.5 1.5 0 0 1 3 0 1 1 0 0 1-2 0H9a1 1 0 0 1-2 0zm8.5 0a1 1 0 0 1-1-1H14a1.5 1.5 0 0 1-3 0 1 1 0 0 1 2 0h.5a1 1 0 0 1 1 0zm-8.34 4.6a1 1 0 0 1 1.36.37 5.23 5.23 0 0 0 6.96 0 1 1 0 1 1 1.56 1.25 7.24 7.24 0 0 1-10.08 0 1 1 0 0 1 .2-1.62zM4.55 6.13a1 1 0 0 1 1.32-.38l2 1a1 1 0 1 1-.89 1.78l-2-1a1 1 0 0 1-.43-1.4zm14.58.38a1 1 0 0 1 1.32.38.93.93 0 0 1-.13 1.37l-2 1a1 1 0 0 1-1.34-.48 1 1 0 0 1 .48-1.34z"/></svg>
            </div>
          </div>

          <div class="rz-actions">
            <button class="rz-btn rz-btn-secondary" id="rz-dismiss">Later</button>
            <button class="rz-btn rz-btn-primary" id="rz-resume">🚀 Resume Focus</button>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(container);

        // Animation
        setTimeout(() => {
            container.classList.add('visible');
            container.querySelector('.rz-card').classList.add('rz-visible');
        }, 10);

        // Event Listeners
        document.getElementById('rz-close').addEventListener('click', () => this.removeCard());
        document.getElementById('rz-dismiss').addEventListener('click', () => this.removeCard());
        document.getElementById('rz-resume').addEventListener('click', () => {
            // Maybe scroll to last paragraph?
            this.scrollToLastParagraph();
            this.removeCard();
        });

        // Tone switching in Re-Entry Card
        const toneOptions = container.querySelectorAll('.rz-tone-option');
        toneOptions.forEach(opt => {
            opt.addEventListener('click', async (e) => {
                const newTone = e.target.getAttribute('data-tone');
                this.tone = newTone;
                if (this.isContextValid()) {
                    chrome.storage.local.set({ rezone_tone: newTone });
                }

                // Update UI classes
                toneOptions.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');

                // Regenerate message
                const msgEl = container.querySelector('.rz-tone-message');
                msgEl.textContent = "Updating tone...";
                const newMsg = await this.getAIWelcomeMessage();
                msgEl.textContent = newMsg;

                // Update Icon in Header too
                const newContent = this.getToneContent();
                const titleIcon = container.querySelector('.rz-card-title span');
                // Reuse the SVG but smaller if needed
                if (titleIcon) titleIcon.innerHTML = newContent.icon.replace(/width="\d+"/, 'width="24"').replace(/height="\d+"/, 'height="24"');
            });
        });
    }

    removeCard() {
        const container = document.getElementById('rezone-container');
        if (container) {
            container.classList.remove('visible');
            container.querySelector('.rz-card').classList.remove('rz-visible');
            setTimeout(() => container.remove(), 400);
        }
    }


    scrollToLastParagraph() {
        // Find the paragraph that matches lastParagraph content roughly
        if (!this.lastParagraph) return;

        // Simplistic scroll - refined approach would store the element reference if possible, 
        // but element references can be lost if DOM changes.
        // For now, we trust the user is already near where they left off or we just close the modal.
        // Actually, let's try to scroll just in case.
        const cleanText = this.lastParagraph.replace('...', '');
        const paragraphs = document.querySelectorAll('p');
        for (const p of paragraphs) {
            if (p.textContent.includes(cleanText)) {
                p.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight it briefly
                const originalTransition = p.style.transition;
                const originalBg = p.style.backgroundColor;
                p.style.transition = 'background-color 1s';
                p.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                setTimeout(() => {
                    p.style.backgroundColor = originalBg;
                    setTimeout(() => { p.style.transition = originalTransition; }, 1000);
                }, 1500);
                break;
            }
        }
    }

    logHistory() {
        if (!this.isContextValid()) return;
        chrome.storage.local.get('rezone_history', (result) => {
            const history = result.rezone_history || [];
            history.push({
                title: document.title,
                url: window.location.href,
                timestamp: Date.now()
            });
            // Keep last 50
            if (history.length > 50) history.shift();
            chrome.storage.local.set({ rezone_history: history });
        });
    }

    formatTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }

    async checkDistraction() {
        if (!this.goal || this.isPaused) return;

        // Final Double Check before alert
        if (!this.isContextValid()) return;
        try {
            const stored = await chrome.storage.local.get('rezone_paused');
            if (stored.rezone_paused) {
                this.isPaused = true;
                return;
            }
        } catch (e) { return; }

        // Check relevance
        const relevance = await this.analyzePageRelevance();
        console.log(`[ReZone] Distraction Check: ${relevance}`);

        if (relevance === "DISTRACTION") {
            this.showDistractionAlert();
        }
    }

    async analyzePageRelevance() {
        const fullContent = this.getPageContent();

        let prompt = `
            Task: Classify if the current webpage is RELEVANT or a DISTRACTION based on the user's goal.
            User Goal: "${this.goal}"
            User Topic: "${this.topic}"
            
            Webpage Context:
            ${fullContent}
            
            Rules:
            1. If the content directly helps the goal (e.g. tutorial, documentation, research), it is RELEVANT.
            2. If the content is entertainment, social media, or unrelated shopping, it is DISTRACTION.
            3. Answer ONLY with one word: "RELEVANT" or "DISTRACTION".
        `;

        try {
            if (window.ai && window.ai.languageModel) {
                const session = await window.ai.languageModel.create();
                const result = await session.prompt(prompt);
                session.destroy();
                const clean = result.trim().toUpperCase();

                // SAVE RELEVANT CONTEXT
                if (clean.includes("RELEVANT")) {
                    if (this.isContextValid()) chrome.storage.local.set({ rezone_last_relevant_url: window.location.href });
                    return "RELEVANT";
                }
                return "DISTRACTION";
            } else {
                // Fallback: check keywords
                const text = fullContent.toLowerCase();
                const topicWords = this.topic.toLowerCase().split(' ');
                const isrelevant = topicWords.some(w => text.includes(w));

                if (isrelevant) {
                    if (this.isContextValid()) chrome.storage.local.set({ rezone_last_relevant_url: window.location.href });
                    return "RELEVANT";
                }
                return "DISTRACTION";
            }
        } catch (e) {
            console.error("AI check failed", e);
            return "RELEVANT"; // Give benefit of doubt
        }
    }

    showDistractionAlert() {
        // Simple overlay
        if (document.getElementById('rz-distraction-overlay')) return;

        const content = this.getToneContent();
        const overlay = document.createElement('div');
        overlay.id = 'rz-distraction-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(255,255,255,0.95); z-index: 2147483647;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            backdrop-filter: blur(15px);
        `;

        overlay.innerHTML = `
            <div style="margin-bottom: 24px; animation: bounce 1s infinite;">
               ${content.icon}
            </div>
            <h1 style="font-size: 32px; margin-bottom: 16px; font-weight: 700; color: #111;">Hold on...</h1>
            <p style="font-size: 18px; max-width: 500px; text-align: center; line-height: 1.6; color: #444; margin-bottom: 40px;">
                ${content.goal_prefix} <br>
                <span style="font-weight:600; color:#8e54e9;">(${this.goal || 'Focusing'})</span> <br><br>
                ${content.distraction_msg}
            </p>
            <div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;">
                <button id="rz-leave" style="
                    padding: 16px 32px; font-size: 16px; cursor: pointer; 
                    background: linear-gradient(135deg, #8e54e9 0%, #7c3aed 100%); 
                    color: white; border: none; border-radius: 16px;
                    font-weight: 600; transition: transform 0.2s, box-shadow 0.2s; 
                    box-shadow: 0 8px 20px rgba(142, 84, 233, 0.3);
                ">
                    ${content.btn_back}
                </button>
                <button id="rz-stay" style="
                    padding: 16px 32px; font-size: 16px; cursor: pointer; 
                    background: white; border: 2px solid #e5e5e5; color: #666; border-radius: 16px;
                    font-weight: 600; transition: all 0.2s;
                ">
                    ${content.btn_stay}
                </button>
            </div>
            <style>
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                #rz-leave:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(142, 84, 233, 0.4); }
                #rz-stay:hover { border-color: #d4d4d4; background: #fafafa; color: #333; }
            </style>
        `;

        document.body.appendChild(overlay);

        document.getElementById('rz-leave').onclick = async () => {
            overlay.remove();
            // Redirect to last known relevant page
            if (this.isContextValid()) {
                const data = await chrome.storage.local.get('rezone_last_relevant_url');
                if (data.rezone_last_relevant_url) {
                    console.log(`[ReZone] Redirecting to RELEVANT url: ${data.rezone_last_relevant_url}`);
                    window.location.href = data.rezone_last_relevant_url;
                } else {
                    console.log(`[ReZone] No saved relevant URL. Using history.back()`);
                    history.back();
                }
            } else {
                history.back();
            }
        };

        document.getElementById('rz-stay').onclick = () => {
            overlay.remove();
            // Snooze checks for a while
            this.clearDistractionTimer();
        };
    }
}

// Initialize
const rz = new ReZone();
window.reZoneLoaded = true;

