// Offscreen Worker (Bridge)
// Relays messages between Background (Extension Context) and Sandbox (AI Context)

const sandboxFrame = document.getElementById('sandboxFrame');
let pendingRequests = new Map();

// --- LISTENER: From Background ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('Offscreen received message:', request);
    if (request.target !== 'offscreen') return;

    if (request.action === 'ping') {
        sendResponse({ status: 'alive' });
        return;
    }

    if (request.action === 'embed_query') {
        const reqId = Math.random().toString(36).substring(7);
        // console.log(`Offscreen: Bridging embed_query (${reqId})`);
        pendingRequests.set(reqId, sendResponse);

        if (!sandboxFrame.contentWindow) {
            console.error('Offscreen: Sandbox frame not ready');
            sendResponse({ error: 'Sandbox not ready' });
            return;
        }

        sandboxFrame.contentWindow.postMessage({
            action: request.action,
            payload: request.payload,
            reqId: reqId
        }, '*');

        return true; // Keep channel open
    }

    if (request.action === 'analyze_capture') {
        const reqId = request.payload.id || Math.random().toString(36).substring(7);
        // console.log(`Offscreen: Bridging analyze_capture (${reqId})`);

        // Note: analyze_capture is fire-and-forget for the caller (usually),
        // but we should technically acknowledge receipt if the caller awaits?
        // Current implementation in background awaits, so we must sendResponse OR return true.
        // background.js: await sendMessage(...)
        // If we don't return true and don't call sendResponse, background gets undefined immediately.
        // Let's return "Processing started" so background promise resolves.
        // The actual result comes back via 'analysis_complete' message later.

        sendResponse({ status: 'processing_started', id: reqId });

        sandboxFrame.contentWindow.postMessage({
            action: request.action,
            payload: request.payload,
            reqId: reqId
        }, '*');

        // We do NOT return true here because we already sent response.
        return false;
    }
});

// --- LISTENER: From Sandbox ---
window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.reqId) return;

    // console.log('Offscreen received from Sandbox:', data.action);

    if (data.action === 'result') {
        // Handle pending response (e.g. for embed_query)
        const sendResponse = pendingRequests.get(data.reqId);
        if (sendResponse) {
            sendResponse(data.result);
            pendingRequests.delete(data.reqId);
        } else {
            console.warn('Offscreen: No pending request found for ID:', data.reqId);
        }
    }

    if (data.action === 'analysis_complete') {
        // Relay back to background
        chrome.runtime.sendMessage({
            action: 'analysis_complete',
            result: data.result
        });
    }

    if (data.action === 'error') {
        console.error('Sandbox Error:', data.error);
        const sendResponse = pendingRequests.get(data.reqId);
        if (sendResponse) {
            sendResponse({ error: data.error });
            pendingRequests.delete(data.reqId);
        }
    }

    if (data.action === 'log_error') {
        console.error('Offscreen received log_error:', data.error);
        chrome.runtime.sendMessage({
            action: 'log_error',
            source: 'offscreen_sandbox',
            error: data.error
        });
    }
});
