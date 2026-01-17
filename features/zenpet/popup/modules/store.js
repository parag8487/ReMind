export const Store = {
    user: {
        coins: 300,
        ownedRooms: ['room']
    },
    pet: {
        state: 'neutral',
        name: 'ZenPet',
        hungerLevel: 100,
        happinessLevel: 100,
        lastFed: new Date().toISOString(),
        lastPetted: new Date().toISOString(),
        experience: 0,
        room: 'room',
        lastUpdated: new Date().toISOString()
    },
    pomodoro: {
        state: 'idle',
        focusDuration: 25,
        breakDuration: 5,
        timeRemaining: 25 * 60,
        isRunning: false
    },
    tasks: [],

    listeners: [],

    // Constants
    HAPPINESS_DECAY_RATE: 10,
    HUNGER_DECAY_RATE: 15,

    async init() {
        const data = await chrome.storage.local.get(['zenpet_user', 'zenpet_pet', 'zenpet_pomodoro', 'zenpet_tasks']);
        console.log('[ZenPet Store] Loading Data:', data);

        if (data.zenpet_user) this.user = data.zenpet_user;
        if (data.zenpet_pet) this.pet = { ...this.pet, ...data.zenpet_pet };
        if (data.zenpet_pomodoro) this.pomodoro = { ...this.pomodoro, ...data.zenpet_pomodoro };
        if (data.zenpet_tasks) this.tasks = data.zenpet_tasks;

        // Ensure defaults are persisted if this was a fresh install/first run
        if (!data.zenpet_user) {
            console.log('[ZenPet Store] New user detected. Initializing defaults.');
            this.persist();
        }

        // Apply Pet Decay logic
        this.applyPetDecay();

        // Start Pet Decay Interval
        setInterval(() => {
            this.applyPetDecay();
            this.notify();
        }, 60000);

        this.notify();
    },

    subscribe(callback) {
        this.listeners.push(callback);
        // Call immediately with current state
        callback(this);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    },

    notify() {
        this.listeners.forEach(cb => cb(this));
        this.persist();
    },

    persist() {
        // Debounce persistence slightly? No, direct write is safer for now.
        chrome.storage.local.set({
            zenpet_user: this.user,
            zenpet_pet: this.pet,
            zenpet_pomodoro: this.pomodoro,
            zenpet_tasks: this.tasks
        });
    },

    // --- Pet Logic ---
    applyPetDecay() {
        const now = Date.now();
        const last = this.pet.lastUpdated ? new Date(this.pet.lastUpdated).getTime() : now;
        const deltaHours = (now - last) / (1000 * 60 * 60);

        // If delta is very small (less than a second), skip to avoid jitter
        if (deltaHours < 0.0001) return;

        let happinessLevel = Math.max(0, this.pet.happinessLevel - this.HAPPINESS_DECAY_RATE * deltaHours);
        let hungerLevel = Math.max(0, this.pet.hungerLevel - this.HUNGER_DECAY_RATE * deltaHours);

        this.pet.happinessLevel = happinessLevel;
        this.pet.hungerLevel = hungerLevel;
        this.pet.lastUpdated = new Date().toISOString();

        if ((happinessLevel < 30 || hungerLevel < 30) && this.pet.state === 'neutral') {
            this.pet.state = 'sad';
        }
    },

    calculateLevel(exp) {
        if (exp < 50) return 1;
        if (exp < 150) return 2;
        if (exp < 300) return 3;
        if (exp < 450) return 4;
        return Math.floor((exp - 450) / 150) + 5;
    },

    getExpForLevel(lvl) {
        if (lvl <= 1) return 0;
        if (lvl === 2) return 50;
        if (lvl === 3) return 150;
        if (lvl === 4) return 300;
        return 450 + (lvl - 5) * 150;
    },

    updatePet(updates) {
        this.pet = { ...this.pet, ...updates };
        this.notify();
    },

    // --- User Logic ---
    addCoins(amount) {
        this.user.coins += amount;
        this.notify();
    },

    spendCoins(amount) {
        if (this.user.coins >= amount) {
            this.user.coins -= amount;
            this.notify();
            return true;
        }
        return false;
    },

    purchaseRoom(roomId, cost) {
        if (this.user.ownedRooms.includes(roomId)) return false;
        if (this.spendCoins(cost)) {
            this.user.ownedRooms.push(roomId);
            this.notify();
            return true;
        }
        return false;
    },

    equipRoom(roomId) {
        if (this.user.ownedRooms.includes(roomId)) {
            this.pet.room = roomId;
            this.notify();
            return true;
        }
        return false;
    },

    hasRoom(roomId) {
        return this.user.ownedRooms.includes(roomId);
    },

    // --- Pomodoro Logic ---
    updatePomodoro(updates) {
        this.pomodoro = { ...this.pomodoro, ...updates };
        this.notify();
    },

    // --- Task Logic ---
    addTask(title) {
        const newTask = {
            id: Date.now().toString(),
            title: title.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };
        this.tasks.push(newTask);
        this.notify();
    },

    toggleTask(id) {
        this.tasks = this.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        this.notify();
    },

    removeTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.notify();
    },

    clearAllTasks() {
        this.tasks = [];
        this.notify();
    }
};



