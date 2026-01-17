import { Store } from './store.js';
import { Pet } from './pet.js';
import { Chat } from './chat.js';
import { Pomodoro } from './pomodoro.js';

const modules = {
    pet: Pet,
    chat: Chat,
    pomodoro: Pomodoro
};

let currentModule = null;

async function switchTab(tabName) {
    if (currentModule && currentModule.destroy) {
        currentModule.destroy();
    }

    // Update Nav UI
    document.querySelectorAll('.nav-button[data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const container = document.getElementById('view-container');
    const module = modules[tabName];
    if (module) {
        currentModule = module;
        module.init(container);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await Store.init();

    // Navigation listeners
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.addEventListener('click', () => {
            // Handle Overlay Action specifically
            if (btn.dataset.action === 'overlay') {
                chrome.runtime.sendMessage({ type: 'TOGGLE_PET_OVERLAY' }, (resp) => {
                    if (chrome.runtime.lastError || !resp?.ok) {
                        console.warn('[Nav] Overlay toggle failed:', chrome.runtime.lastError || resp?.error);
                    } else {
                        // Close popup on successful inject so user sees overlay
                        window.close();
                    }
                });
                return;
            }

            // Handle Tab Switching
            if (btn.dataset.tab) {
                switchTab(btn.dataset.tab);
            }
        });
    });

    // Start with Pet
    switchTab('pet');
});



