import { Store } from './store.js';

export const Pomodoro = {
    viewState: 'timer', // 'timer' or 'tasks'
    editingFocus: false,
    editingBreak: false,

    init(container) {
        this.container = container;
        this.renderInitialStructure();
        this.attachEvents();

        this.unsubscribe = Store.subscribe((store) => {
            this.update(store);
        });

        // Local tick for UI updates
        this.tickInterval = setInterval(() => {
            if (Store.pomodoro.isRunning) {
                // Decrement locally for smooth UI, Store handles actual state
                if (Store.pomodoro.timeRemaining > 0) {
                    Store.updatePomodoro({ timeRemaining: Store.pomodoro.timeRemaining - 1 });
                } else {
                    // Timer finished logic
                    this.handleTimerComplete();
                }
            }
        }, 1000);
    },

    destroy() {
        if (this.unsubscribe) this.unsubscribe();
        if (this.tickInterval) clearInterval(this.tickInterval);
        this.container.innerHTML = '';
    },

    handleTimerComplete() {
        const p = Store.pomodoro;
        if (p.state === 'focus') {
            Store.updatePomodoro({
                state: 'break',
                timeRemaining: p.breakDuration * 60,
                isRunning: false
            });
            Store.addCoins(10); // Reward
        } else if (p.state === 'break') {
            Store.updatePomodoro({
                state: 'idle',
                timeRemaining: p.focusDuration * 60,
                isRunning: false
            });
        }
    },

    renderInitialStructure() {
        this.container.innerHTML = `
            <div class="pomodoro-container">
                 <div class="chat-header-bar">
                    <span class="chat-header-title">Focus Mode</span>
                     <div class="pomodoro-view-toggle">
                        <button class="toggle-btn active" id="btn-timer">Timer</button>
                        <button class="toggle-btn" id="btn-tasks">Tasks</button>
                    </div>
                </div>

                <div id="pomo-content" class="view-content">
                    <!-- Timer or Tasks injected here -->
                </div>
            </div>
        `;
        this.renderView();
    },

    attachEvents() {
        const $ = (id) => this.container.querySelector(id);
        const btnTimer = $('#btn-timer');
        const btnTasks = $('#btn-tasks');

        if (btnTimer) btnTimer.onclick = () => this.setViewState('timer');
        if (btnTasks) btnTasks.onclick = () => this.setViewState('tasks');
    },

    setViewState(view) {
        this.viewState = view;
        const btnTimer = this.container.querySelector('#btn-timer');
        const btnTasks = this.container.querySelector('#btn-tasks');

        if (btnTimer) btnTimer.classList.toggle('active', view === 'timer');
        if (btnTasks) btnTasks.classList.toggle('active', view === 'tasks');

        this.renderView();
    },

    update(store) {
        // Efficient DOM update could go here, for now full re-render of active view
        // In production, granular updates are better.
        // Prevent re-rendering input focus loss if in tasks view
        if (this.viewState === 'timer') {
            this.renderView();
        } else if (this.viewState === 'tasks') {
            // Only re-render task list part, strictly needed to avoid input focus loss
            const taskListScroll = this.container.querySelector('.task-list-scroll');
            if (taskListScroll) {
                const newContent = this.getTaskListHTML(store.tasks);
                // Simple diff: strictly replace innerHTML for now logic simplicity
                // ideally compare
                if (taskListScroll.innerHTML !== newContent) {
                    taskListScroll.innerHTML = newContent;
                    this.attachTaskEvents(taskListScroll);
                }
                this.updateCompactTaskDisplay(store.tasks);
            }
        }
    },

    renderView() {
        const content = this.container.querySelector('#pomo-content');
        if (!content) return;

        if (this.viewState === 'timer') {
            this.renderTimerView(content);
        } else {
            this.renderTasksView(content);
        }
    },

    renderTimerView(content) {
        const p = Store.pomodoro;
        const tasks = Store.tasks;
        const mins = Math.floor(p.timeRemaining / 60).toString().padStart(2, '0');
        const secs = (p.timeRemaining % 60).toString().padStart(2, '0');

        // Check for active task
        const activeTask = tasks.find(t => !t.completed); // Just pick first open task or selected logic

        content.innerHTML = `
            <div class="timer-section">
                <div class="timer-label">${p.state === 'focus' ? 'Focus Session' : p.state === 'break' ? 'Chill Break' : 'Ready to Focus?'}</div>
                <div class="timer-display">${mins}:${secs}</div>
                
                <div class="timer-controls">
                     ${!p.isRunning ? `
                    <button class="timer-btn timer-btn--primary" id="btn-start" title="Start Focus">
                        <svg viewBox="0 0 512 512" style="width:24px;height:24px;fill:currentColor"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>
                    </button>
                    ` : `
                    <button class="timer-btn timer-btn--primary" id="btn-pause" title="Pause">
                         <svg viewBox="0 0 512 512" style="width:24px;height:24px;fill:currentColor"><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/></svg>
                    </button>
                    `}
                    
                    <button class="timer-btn" id="btn-reset" title="Reset Timer">
                         <svg viewBox="0 0 512 512" style="width:20px;height:20px;fill:currentColor"><path d="M463.5 224H472c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5z"/></svg>
                    </button>

                     <button class="timer-btn" id="btn-switch" title="Switch Mode">
                         <svg viewBox="0 0 512 512" style="width:20px;height:20px;fill:currentColor"><path d="M0 224c0 17.7 14.3 32 32 32s32-14.3 32-32c0-53 43-96 96-96h160v32c0 12.9 15.7 20 25.8 11.5l80-51.5c9.2-8 8.8-22.6-1.3-29.3l-80-60.8c-10.4-8-25.2-1.3-25.2 11.9v32H160C71.6 64 0 135.6 0 224zm512 64c0-17.7-14.3-32-32-32s-32 14.3-32 32c0 53-43 96-96 96H192v-32c0-12.9-15.7-20-25.8-11.5l-80 51.5c-9.2 8-8.8 22.6 1.3 29.3l80 60.8c10.4 8 25.2 1.3 25.2-11.9v-32h160c88.4 0 160-71.6 160-160z"/></svg>
                    </button>
                </div>

                <!-- Compact Task Display -->
                ${activeTask ? `
                <div class="compact-task-display">
                    <div class="compact-task-label">CURRENT TASK</div>
                    <div class="compact-task-title">${activeTask.title}</div>
                </div>
                ` : `
                 <div class="compact-task-display" style="opacity:0.5">
                    <div class="compact-task-label">NO ACTIVE TASK</div>
                    <div class="compact-task-title">Add tasks in 'Tasks' tab</div>
                </div>
                `}

                <div class="duration-settings">
                     <div class="duration-item">
                        <span class="duration-label">Focus</span>
                        <input type="number" class="duration-input" id="inp-focus" value="${p.focusDuration}">
                     </div>
                     <div class="duration-item">
                        <span class="duration-label">Break</span>
                        <input type="number" class="duration-input" id="inp-break" value="${p.breakDuration}">
                     </div>
                </div>
            </div>
        `;

        // Bind Controls
        const $ = (s) => content.querySelector(s);
        $('#btn-start')?.addEventListener('click', () => Store.updatePomodoro({ isRunning: true }));
        $('#btn-pause')?.addEventListener('click', () => Store.updatePomodoro({ isRunning: false }));
        $('#btn-reset')?.addEventListener('click', () => Store.updatePomodoro({
            isRunning: false,
            state: 'idle',
            timeRemaining: p.focusDuration * 60
        }));
        $('#btn-switch')?.addEventListener('click', () => {
            const newState = p.state === 'break' ? 'focus' : 'break';
            const dur = newState === 'focus' ? p.focusDuration : p.breakDuration;
            Store.updatePomodoro({
                state: newState,
                timeRemaining: dur * 60,
                isRunning: false
            });
        });

        // Inputs
        $('#inp-focus').onchange = (e) => Store.updatePomodoro({ focusDuration: parseInt(e.target.value) || 25 });
        $('#inp-break').onchange = (e) => Store.updatePomodoro({ breakDuration: parseInt(e.target.value) || 5 });
    },

    renderTasksView(content) {
        // Initialize HTML structure once
        content.innerHTML = `
            <div class="task-view-container">
                 <div class="task-list-scroll">
                      ${this.getTaskListHTML(Store.tasks)}
                 </div>

                 <div class="input-footer">
                     <div class="input-group">
                        <input type="text" class="chat-input" id="task-input" placeholder="Add a new task..." autocomplete="off">
                        <button class="send-button" id="btn-add-task">
                             <svg viewBox="0 0 512 512" style="width:16px;height:16px;fill:currentColor"><path d="M256 80c-148 0-256 108-256 256 0 148 108 256 256 256 148 0 256-108 256-256 0-148-108-256-256-256zM376 352c0 13.3-10.7 24-24 24h-72v72c0 13.3-10.7 24-24 24s-24-10.7-24-24v-72h-72c-13.3 0-24-10.7-24-24s10.7-24 24-24h72v-72c0-13.3 10.7-24 24-24s24 10.7 24 24v72h72c13.3 0 24 10.7 24 24z"/></svg>
                             <span style="font-size:24px; font-weight:bold; margin-top:-2px">+</span>
                        </button>
                    </div>
                 </div>
            </div>
        `;

        this.attachTaskEvents(content.querySelector('.task-list-scroll'));
        this.attachTaskInputEvents(content);
    },

    getTaskListHTML(tasks) {
        if (tasks.length === 0) {
            return `
                <div class="no-tasks-placeholder">
                    <div class="no-tasks-icon">📝</div>
                    <div>No tasks yet.</div>
                    <div style="font-size:12px; margin-top:5px;">Add one below to get started!</div>
                </div>
            `;
        }
        return tasks.map(t => `
            <div class="task-card ${t.completed ? 'completed' : ''}" data-id="${t.id}">
                <div class="task-checkbox-ring">
                     ${t.completed ? '<svg viewBox="0 0 512 512" style="width:14px;height:14px;fill:currentColor"><path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"/></svg>' : ''}
                </div>
                <div class="task-title">${t.title}</div>
                <button class="task-delete-btn" data-action="delete" title="Delete Task">
                    <svg viewBox="0 0 512 512" style="width:14px;height:14px;fill:currentColor"><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200zm101.8-262.2L295.6 256l62.2 62.2c4.7 4.7 4.7 12.3 0 17l-22.6 22.6c-4.7 4.7-12.3 4.7-17 0L256 295.6l-62.2 62.2c-4.7 4.7-12.3 4.7-17 0l-22.6-22.6c-4.7-4.7-4.7-12.3 0-17l62.2-62.2-62.2-62.2c-4.7-4.7-4.7-12.3 0-17l22.6-22.6c4.7-4.7 12.3-4.7 17 0l62.2 62.2 62.2-62.2c4.7-4.7 12.3-4.7 17 0l22.6 22.6c4.7 4.7 4.7 12.3 0 17z"/></svg>
                </button>
            </div>
        `).join('');
    },

    attachTaskEvents(container) {
        if (!container) return;
        container.querySelectorAll('.task-card').forEach(el => {
            el.onclick = (e) => {
                const id = el.dataset.id;
                // Check if delete button was clicked
                if (e.target.closest('[data-action="delete"]')) {
                    e.stopPropagation();
                    console.log("Deleting task", id);
                    Store.removeTask(id);
                } else {
                    Store.toggleTask(id);
                }
            };
        });
    },

    attachTaskInputEvents(content) {
        const input = content.querySelector('#task-input');
        const btn = content.querySelector('#btn-add-task');

        const addTask = () => {
            const title = input.value.trim();
            if (title) {
                Store.addTask(title);
                input.value = '';
            }
        };

        if (btn) btn.onclick = addTask;
        if (input) input.onkeypress = (e) => {
            if (e.key === 'Enter') addTask();
        };
    },

    updateCompactTaskDisplay(tasks) {
        // Find update logic for compact display if visible? 
        // Usually full re-render covers this but optimized updates are better.
        // Left as placeholder for now since we re-render Timer view often.
    }
};



