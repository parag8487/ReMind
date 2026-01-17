import { Store } from './store.js';

export const Pet = {
    viewState: 'stats', // 'stats' or 'room'

    init(container) {
        this.container = container;
        this.renderInitialStructure();

        // Bind events using event delegation or direct attachment
        this.attachEvents();

        // Subscribe to store
        this.unsubscribe = Store.subscribe((store) => {
            this.update(store);
        });
    },

    destroy() {
        if (this.unsubscribe) this.unsubscribe();
        this.container.innerHTML = '';
    },

    renderInitialStructure() {
        const p = Store.pet;
        const level = Store.calculateLevel(p.experience);
        const expForLevel = Store.getExpForLevel(level);
        const nextLevelExp = Store.getExpForLevel(level + 1);
        const expPercent = Math.max(0, Math.min(100, ((p.experience - expForLevel) / (nextLevelExp - expForLevel)) * 100));

        // Background Color logic
        const bgColors = {
            'blue-room': '#CDDBE6FF',
            'pink-room': '#FDDDC4FF', // Assuming pink room has similar default?
            'space-room': '#FDDDC4FF',
            'room': '#FDDDC4FF'
        };
        const bgColor = bgColors[p.room] || '#FDDDC4FF';

        this.container.innerHTML = `
            <div class="pet-container" id="pet-container" style="background-color: ${bgColor};">
                <!-- Coin Tracker (React component ported) -->
                <div class="coin-display" style="position: absolute; top: 16px; left: 16px; visibility: hidden; pointer-events:none;"></div> 
                <!-- wait, React had CoinTracker separate? It was rendered in Pet.tsx at top -->
                <!-- Let's put the Coin Tracker logic here matching HTML -->
                
                <!-- Error Overlay -->
                <div id="error-overlay" class="error-overlay" style="display: none;">
                    <div class="error-popup">
                        <button class="error-close" id="error-close">
                            <svg viewBox="0 0 512 512" width="20" height="20" fill="currentColor"><path d="M405 136.798L375.202 107 256 226.202 136.798 107 107 136.798 226.202 256 107 375.202 136.798 405 256 285.798 375.202 405 405 375.202 285.798 256z"/></svg>
                        </button>
                        <div class="error-icon"><img src="../assets/token.png" alt="coin"></div>
                        <p class="error-message" id="error-message"></p>
                    </div>
                </div>

                <div class="pet-header">
                    <div class="pet-name" id="pet-level">lvl.${level}</div>
                    <!-- Coin Display was here in screenshots? No, CoinTracker component usually top right or left. 
                         In styles.css .coin-display exists. let's put it in header top right -->
                    <div class="coin-display">
                        <span class="coin-amount" id="coin-amount">${Store.user.coins}</span>
                        <img src="../assets/token.png" class="coin-icon">
                    </div>
                </div>

                <!-- Overlay Toggle (Extension specific) -->
                <button class="overlay-toggle-btn" id="btn-overlay" title="Toggle Overlay">🖼️</button>

                <!-- Room Visual -->
                <div class="pet-room" id="pet-room-bg" style="background-image: url('../assets/${p.room === 'room' ? 'room.png' : p.room + '.png'}'); background-color: ${bgColor};">
                    <img id="pet-image" src="../assets/zenpet_${p.state}.png" alt="ZenPet" class="pet-image pet-image-${p.state}">
                    
                    <div class="action-container">
                        <div class="action-item" id="btn-feed">
                            <img src="../assets/food.png" alt="Food" class="action-icon">
                            <div class="token-cost">
                                <span>5</span>
                                <img src="../assets/token.png" class="token-icon">
                            </div>
                        </div>
                        <div class="action-item" id="btn-bath">
                            <img src="../assets/bath.png" alt="Bath" class="action-icon">
                            <div class="token-cost">
                                <span>5</span>
                                <img src="../assets/token.png" class="token-icon">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Panel -->
                <div class="bottom-panel">
                    <div class="view-toggle">
                        <button class="toggle-btn active" id="btn-view-stats">Stats</button>
                        <button class="toggle-btn" id="btn-view-room">Room</button>
                    </div>

                    <!-- Stats View -->
                    <div id="stats-view" class="progress-bars">
                        <div class="progress-container">
                            <div class="progress-icon happiness-icon" style="color:#ffb5d4">❤️</div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar happiness-bar" id="happiness-bar" style="width: ${p.happinessLevel}%;"></div>
                            </div>
                        </div>
                        <div class="progress-container">
                            <div class="progress-icon hunger-icon" style="color:#ffb385">🍽️</div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar hunger-bar" id="hunger-bar" style="width: ${p.hungerLevel}%;"></div>
                            </div>
                        </div>
                        <div class="progress-container">
                            <div class="progress-icon exp-icon" style="color:#80c2ff">⭐</div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar exp-bar" id="exp-bar" style="width: ${expPercent}%;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Room View -->
                    <div id="room-view" class="room-selector" style="display: none;">
                        <div class="room-grid" id="room-list">
                            <!-- Injected by update() -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        const $ = (id) => this.container.querySelector(id);

        $('#btn-feed').onclick = () => this.handleFeed();
        $('#btn-bath').onclick = () => this.handleBath();
        $('#btn-overlay').onclick = () => {
            chrome.runtime.sendMessage({ type: 'TOGGLE_PET_OVERLAY' }, (resp) => {
                if (resp?.error) this.showError('Could not toggle: ' + resp.error);
            });
        };

        $('#btn-view-stats').onclick = () => this.setViewState('stats');
        $('#btn-view-room').onclick = () => this.setViewState('room');

        $('#error-close').onclick = () => {
            $('#error-overlay').style.display = 'none';
        };
    },

    setViewState(view) {
        this.viewState = view;
        const $ = (id) => this.container.querySelector(id);

        $('#btn-view-stats').classList.toggle('active', view === 'stats');
        $('#btn-view-room').classList.toggle('active', view === 'room');

        $('#stats-view').style.display = view === 'stats' ? 'flex' : 'none';
        $('#room-view').style.display = view === 'room' ? 'block' : 'none';

        if (view === 'room') {
            this.update(Store); // Force render room list
        }
    },

    handleFeed() {
        if (!Store.spendCoins(5)) {
            this.showError('Not enough coins! Need 5 coins.');
            return;
        }

        Store.updatePet({
            state: 'eating',
            lastFed: new Date().toISOString(),
            lastPetted: new Date().toISOString(),
            hungerLevel: Math.min(100, Store.pet.hungerLevel + 20),
            experience: Store.pet.experience + 10,
            happinessLevel: Math.min(100, Store.pet.happinessLevel + 10)
        });

        setTimeout(() => {
            if (Store.pet.state === 'eating') {
                Store.updatePet({ state: 'neutral' });
            }
        }, 2000);
    },

    handleBath() {
        if (!Store.spendCoins(5)) {
            this.showError('Not enough coins! Need 5 coins.');
            return;
        }

        Store.updatePet({
            state: 'bathing',
            lastPetted: new Date().toISOString(),
            happinessLevel: Math.min(100, Store.pet.happinessLevel + 25),
            experience: Store.pet.experience + 10
        });

        setTimeout(() => {
            if (Store.pet.state === 'bathing') {
                Store.updatePet({ state: 'neutral' });
            }
        }, 2000);
    },

    showError(msg) {
        const overlay = this.container.querySelector('#error-overlay');
        const message = this.container.querySelector('#error-message');
        message.textContent = msg;
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 3000);
    },

    update(store) {
        const $ = (id) => this.container.querySelector(id);
        if (!$) return; // If destroyed

        // Coins
        const coinEl = $('#coin-amount');
        if (coinEl) coinEl.textContent = store.user.coins;

        // Level
        const level = Store.calculateLevel(store.pet.experience);
        $('#pet-level').textContent = `lvl.${level}`;

        // Pet Image & State
        const img = $('#pet-image');
        img.src = `../assets/zenpet_${store.pet.state}.png`;
        img.className = `pet-image pet-image-${store.pet.state}`;

        // Progress Bars
        const expForLevel = Store.getExpForLevel(level);
        const nextLevelExp = Store.getExpForLevel(level + 1);
        const currentLevelExp = store.pet.experience - expForLevel;
        const expToNextLevel = nextLevelExp - expForLevel;

        // Avoid division by zero if max level or weird state
        const expPercent = expToNextLevel > 0
            ? Math.max(0, Math.min(100, (currentLevelExp / expToNextLevel) * 100))
            : 100;

        $('#happiness-bar').style.width = `${Math.max(0, store.pet.happinessLevel)}%`;
        $('#hunger-bar').style.width = `${Math.max(0, store.pet.hungerLevel)}%`;
        $('#exp-bar').style.width = `${expPercent}%`;

        // Room BG Logic (React: const containerBgColor = selectedRoom === 'blue-room' ? '#CDDBE6FF' : '#FDDDC4FF')
        const bgColors = {
            'blue-room': '#CDDBE6FF',
            'pink-room': '#FDDDC4FF',
            'space-room': '#FDDDC4FF',
            'room': '#FDDDC4FF'
        };
        const activeBgColor = bgColors[store.pet.room] || '#FDDDC4FF';

        const petContainer = $('#pet-container');
        if (petContainer) petContainer.style.backgroundColor = activeBgColor;

        const roomBg = $('#pet-room-bg');
        if (roomBg) {
            roomBg.style.backgroundImage = `url('../assets/${store.pet.room === 'room' ? 'room.png' : store.pet.room + '.png'}')`;
            roomBg.style.backgroundColor = activeBgColor;
        }

        // Render Room List if visible
        if (this.viewState === 'room') {
            const list = $('#room-list');

            const rooms = [
                { id: 'room', name: 'Default', image: '../assets/room.png', cost: 0 },
                { id: 'blue-room', name: 'Blue', image: '../assets/blue-room.png', cost: 50 },
                { id: 'pink-room', name: 'Pink', image: '../assets/pink-room.png', cost: 100 },
                { id: 'space-room', name: 'Space', image: '../assets/space-room.png', cost: 150 }
            ];

            list.innerHTML = rooms.map(r => {
                const isOwned = Store.hasRoom(r.id);
                const isSelected = store.pet.room === r.id;
                return `
                    <div class="room-option ${isSelected ? 'selected' : ''} ${!isOwned ? 'locked' : ''}" data-id="${r.id}" data-cost="${r.cost}">
                        <div class="room-preview" style="background-image: url('${r.image}')">
                            ${!isOwned ? `<div class="room-lock-overlay"><svg class="lock-icon" viewBox="0 0 512 512" fill="currentColor"><path d="M336 208v-95a80 80 0 00-160 0v95a48 48 0 00-48 48v192a48 48 0 0048 48h160a48 48 0 0048-48V256a48 48 0 00-48-48zm-48 0H224v-95a32 32 0 0164 0v95z"/></svg></div>` : ''}
                        </div>
                        ${!isOwned ? `
                        <div class="room-cost">
                            <span>${r.cost}</span>
                            <img src="../assets/token.png" class="token-icon">
                        </div>` : `
                        <span class="room-name">${r.name}</span>
                        `}
                    </div>
                `;
            }).join('');

            // Attach clicks
            list.querySelectorAll('.room-option').forEach(el => {
                el.onclick = () => {
                    const id = el.dataset.id;
                    const cost = parseInt(el.dataset.cost);

                    if (Store.hasRoom(id)) {
                        Store.updatePet({ room: id });
                    } else {
                        if (Store.purchaseRoom(id, cost)) {
                            Store.updatePet({ room: id });
                        } else {
                            this.showError(`Not enough coins! Need ${cost} coins.`);
                        }
                    }
                };
            });
        }
    }
};



