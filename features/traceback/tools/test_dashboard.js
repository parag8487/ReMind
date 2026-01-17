const logDiv = document.getElementById('log');
let extensionId = null;

function log(msg, type = 'normal') {
    const line = document.createElement('div');
    line.className = 'log-entry ' + type;
    const time = new Date().toLocaleTimeString();
    line.textContent = `[${time}] ${msg}`;
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;
}

// --- Helper: Get Extension ID ---
function detectExtensionId() {
    if (chrome && chrome.runtime && chrome.runtime.id) {
        extensionId = chrome.runtime.id;
        const display = document.getElementById('extIdDisplay');
        if (display) {
            display.textContent = extensionId;
            display.className = 'success';
        }
        return extensionId;
    }
    // Check URL
    if (window.location.protocol === 'chrome-extension:') {
        extensionId = window.location.hostname;
        const display = document.getElementById('extIdDisplay');
        if (display) {
            display.textContent = extensionId;
            display.className = 'success';
        }
        return extensionId;
    }

    const display = document.getElementById('extIdDisplay');
    if (display) {
        display.textContent = 'Unknown (Running as file?)';
        display.className = 'error';
    }
    log('⚠️ ERROR: Could not detect Extension ID. Please run verification from chrome-extension:// URL.', 'error');
    return null;
}

// --- 1. Offscreen Tests ---

async function handlePing() {
    const id = extensionId || detectExtensionId();
    if (!id) return;

    log('--> Pinging Offscreen Worker...', 'info');
    try {
        // Use proxy to ensure offscreen is created
        const start = performance.now();
        const res = await chrome.runtime.sendMessage(id, {
            action: 'proxy_ai_request',
            originalAction: 'embed_query', // Using embed as ping
            payload: { text: "ping" }
        });
        const end = performance.now();

        if (res && res.vector) {
            log(`✅ SUCCESS: Worker responded in ${(end - start).toFixed(0)}ms`, 'success');
        } else {
            log('❌ FAILED: No response or invalid response.', 'error');
        }
    } catch (e) {
        log('❌ ERROR: ' + e.message, 'error');
    }
}

async function handleEmbedTest() {
    const id = extensionId || detectExtensionId();
    if (!id) return;

    log('--> Testing Vector Embeddings...', 'info');
    try {
        const words = ["King", "Queen", "Apple"];
        const vectors = [];

        for (const word of words) {
            log(`Generated embedding for "${word}"...`);
            const res = await chrome.runtime.sendMessage(id, {
                action: 'proxy_ai_request',
                originalAction: 'embed_query',
                payload: { text: word }
            });
            if (res && res.vector) vectors.push(res.vector);
        }

        if (vectors.length === 3) {
            // Simple cosine similarity check
            const sim = (a, b) => {
                let dot = 0, nA = 0, nB = 0;
                for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; nA += a[i] * a[i]; nB += b[i] * b[i]; }
                return dot / (Math.sqrt(nA) * Math.sqrt(nB));
            };

            const s1 = sim(vectors[0], vectors[1]); // King - Queen
            const s2 = sim(vectors[0], vectors[2]); // King - Apple

            log(`Similarity(King, Queen) = ${s1.toFixed(4)}`);
            log(`Similarity(King, Apple) = ${s2.toFixed(4)}`);

            if (s1 > s2) {
                log('✅ PASS: Semantic relationship preserved (King is closer to Queen than Apple).', 'success');
            } else {
                log('⚠️ WARNING: Semantic relationship weak/unexpected.', 'warn');
            }
        }

    } catch (e) {
        log('❌ ERROR: ' + e.message, 'error');
    }
}

// --- 3. Search Tests ---

async function handleSearchTest() {
    const id = extensionId || detectExtensionId();
    if (!id) return;

    const query = document.getElementById('searchInput').value;
    log(`--> Running Semantic Search for "${query}"...`, 'info');

    try {
        chrome.runtime.sendMessage(id, {
            action: 'search',
            query: query,
            semantic: true
        }, (response) => {
            if (chrome.runtime.lastError) {
                log('❌ ERROR: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            if (response && response.results) {
                log(`✅ Found ${response.results.length} results.`, 'success');
                response.results.slice(0, 3).forEach((r, i) => {
                    log(`[${i + 1}] Score: ${r.searchScore.toFixed(0)} | ${r.title || 'No Title'}`);
                });
            } else {
                log('⚠️ No results found (or invalid response).', 'warn');
            }
        });

    } catch (e) {
        log('❌ ERROR: ' + e.message, 'error');
    }
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnDetect').addEventListener('click', detectExtensionId);
    document.getElementById('btnPing').addEventListener('click', handlePing);
    document.getElementById('btnEmbed').addEventListener('click', handleEmbedTest);
    document.getElementById('btnSearch').addEventListener('click', handleSearchTest);

    // Initial detection
    detectExtensionId();
});

