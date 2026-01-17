// ZenPet Background Logic

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    // Toggle Pet Overlay
    if (msg?.type === 'TOGGLE_PET_OVERLAY') {
        chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
            if (!tab?.id) return sendResponse({ ok: false, error: 'No active tab' });
            try {
                // Determine the correct path - it must be in web_accessible_resources
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: false },
                    files: ['features/zenpet/content/overlay.js']
                });
                console.log('[ZenPet:BG] Injected overlay into tab', tab.id);
                sendResponse({ ok: true });
            } catch (e) {
                console.error('[ZenPet:BG] Inject failed', e);
                sendResponse({ ok: false, error: String(e) });
            }
        });
        return true; // async response
    }

    // AI Relay
    if (msg?.type === 'AI_ACTION') {
        chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
            if (!tab?.id) {
                sendResponse({ ok: false });
                return;
            }

            let actionType;
            switch (msg.mode) {
                case 'rewrite': actionType = 'AI_REWRITE'; break;
                case 'summarize': actionType = 'AI_SUMMARIZE'; break;
                default: actionType = 'AI_PROOFREAD';
            }
            console.log('[ZenPet:BG] Relaying', actionType, 'to tab', tab.id);

            try {
                // Try sending to main frame first, or all frames
                // Using standard tabs.sendMessage which goes to content scripts
                await chrome.tabs.sendMessage(tab.id, { type: actionType });
                sendResponse({ ok: true });
            } catch (e) {
                console.error('[ZenPet:BG] Relay failed', e);
                sendResponse({ ok: false, error: String(e) });
            }
        });
        return true;
    }

    // Award Coins
    if (msg?.type === 'AWARD_COINS') {
        chrome.storage.local.get(['zenpet_user'], (data) => {
            const user = data.zenpet_user || { coins: 0, ownedRooms: ['room'] };
            user.coins = (user.coins || 0) + (msg.amount || 0);
            chrome.storage.local.set({ zenpet_user: user }, () => {
                sendResponse({ ok: true });
            });
        });
        return true;
    }
});



