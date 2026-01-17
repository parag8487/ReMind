import { Store } from './store.js';

export const Chat = {
    messages: [
        { id: 'init', text: 'Loading...', sender: 'bot' }
    ],
    isLoading: false,
    systemPrompt: `You are ZenPet, a friendly virtual companion. Keep your responses natural, brief, and straightforward. 
    Guidelines:
    - Answer questions directly.
    - Use 1-2 sentences maximum for simple questions.
    - Be warm but not excessive.
    `,

    init(container) {
        this.container = container;
        this.renderInitialStructure();
        this.attachEvents();
        this.initAI();

        // Subscribe to store updates if needed (e.g. coins)
        this.unsubscribe = Store.subscribe(() => {
            const $ = (id) => this.container.querySelector(id);
            if ($('#chat-coin-amount')) $('#chat-coin-amount').textContent = Store.user.coins;
        });
    },

    destroy() {
        if (this.unsubscribe) this.unsubscribe();
        this.container.innerHTML = '';
        if (this.availabilityInterval) clearInterval(this.availabilityInterval);
    },

    renderInitialStructure() {
        this.container.innerHTML = `
            <div class="chat-container">
                <div class="chat-header-bar">
                    <span class="chat-header-title">ZenPet Chat</span>
                    <div class="coin-pill">
                        <span id="chat-coin-amount">${Store.user.coins}</span>
                        <img src="../assets/token.png" alt="coin">
                    </div>
                </div>

                <div class="chat-messages" id="chat-messages">
                    <!-- Messages -->
                </div>

                <div class="input-footer">
                    <div class="input-group">
                        <input type="text" class="chat-input" id="chat-input" placeholder="Ask ZenPet..." autocomplete="off">
                        <button class="send-button" id="send-button" disabled>
                            <svg viewBox="0 0 24 24" fill="currentColor" class="send-icon">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        this.renderMessages();
    },

    attachEvents() {
        const $ = (id) => this.container.querySelector(id);
        const input = $('#chat-input');
        const sendBtn = $('#send-button');

        input.oninput = () => {
            sendBtn.disabled = !input.value.trim() || this.isLoading;
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        };

        sendBtn.onclick = () => this.handleSend();
    },

    renderMessages() {
        const list = this.container.querySelector('#chat-messages');
        if (!list) return;

        list.innerHTML = this.messages.map(m => `
            <div class="message-wrapper ${m.sender}-message-wrapper">
                ${m.sender === 'bot' ? `
                <div class="avatar">
                    <img src="../assets/zenpet_neutral.png" alt="Pet">
                </div>` : ''}
                <div class="message ${m.sender}-message">${m.text}</div>
            </div>
        `).join('');

        if (this.isLoading) {
            list.innerHTML += `
            <div class="message-wrapper bot-message-wrapper">
                <div class="avatar"><img src="../assets/zenpet_neutral.png"></div>
                <div class="message bot-message">
                    <div class="typing-indicator">
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                    </div>
                </div>
            </div>`;
        }

        list.scrollTop = list.scrollHeight;
    },

    async initAI() {
        const status = await this.resolveAvailability();
        if (status === 'available') {
            this.replaceInitMessage("Hey! I'm ZenPet. How can I help?");
        } else {
            this.replaceInitMessage("This is the first time you’re talking to me! Please say hello to get started.");

            // Poll for download completion
            this.availabilityInterval = setInterval(async () => {
                const s = await this.resolveAvailability();
                if (s === 'available') {
                    this.replaceInitMessage("Hey! I'm ZenPet. How can I help?");
                    clearInterval(this.availabilityInterval);
                }
            }, 2500);
        }
    },

    replaceInitMessage(text) {
        this.messages = this.messages.map(m => m.id === 'init' ? { ...m, text } : m);
        this.renderMessages();
    },

    async resolveAvailability() {
        try {
            if (window.LanguageModel?.availability) {
                const a = await window.LanguageModel.availability();
                if (a === 'available' || a === 'readily') return 'available';
                if (a === 'downloadable' || a === 'after-download') return 'downloadable';
            }
            if (window.ai?.canCreateTextSession) {
                const a = await window.ai.canCreateTextSession();
                if (a === 'available' || a === 'readily') return 'available';
            }
        } catch (e) {
            console.error(e);
        }
        return 'unknown';
    },

    async createSession() {
        if (window.LanguageModel) {
            const capabilities = await window.LanguageModel.availability();
            if (capabilities !== 'no') {
                // Try-catch block for session creation
                try {
                    return await window.LanguageModel.create({
                        initialPrompts: [{ role: 'system', content: this.systemPrompt }]
                    });
                } catch (e) {
                    // Fallback or retry
                    return await window.LanguageModel.create();
                }
            }
        }
        if (window.ai) {
            return await window.ai.createTextSession({
                systemPrompt: this.systemPrompt
            });
        }
        throw new Error("No AI available");
    },

    async handleSend() {
        const input = this.container.querySelector('#chat-input');
        const text = input.value.trim();
        if (!text || this.isLoading) return;

        // User Msg
        this.messages.push({ id: Date.now(), text, sender: 'user' });
        input.value = '';
        this.isLoading = true;
        this.renderMessages();

        Store.addCoins(1); // Reward

        try {
            const session = await this.createSession();
            const result = await session.prompt(text);

            this.messages.push({ id: Date.now() + 1, text: result, sender: 'bot' });

            if (session.destroy) session.destroy();
        } catch (e) {
            const msg = "I'm having trouble connecting to my brain right now. " + e.message;
            this.messages.push({ id: Date.now() + 1, text: msg, sender: 'bot' });
        } finally {
            this.isLoading = false;
            this.renderMessages();
        }
    }
};



