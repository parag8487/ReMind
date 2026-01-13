// Import background logic from features
import './features/traceback/background.js';
import './features/adaptivefocus/background/service-worker.js';

console.log('ReMind: Unified background service worker initialized.');

// CLEANUP ON BROWSER RESTART
// User Request: "if i extited the whole chrome application then all the data should get deleted"
chrome.runtime.onStartup.addListener(() => {
    console.log("[ReMind] Browser Started. Clearing session data...");
    chrome.storage.local.remove([
        'rezone_drifts',
        'rezone_history',
        'rezone_goal',
        'rezone_topic',
        'rezone_last_relevant_url',
        'last_insight_shown',
        'rezone_paused' // Assuming pause state should reset too
    ], () => {
        console.log("[ReMind] Session data cleared.");
    });
});
