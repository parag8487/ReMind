// AI Sandbox Worker
// Runs in a sandboxed iframe to allow remote CDN scripts (Transformers.js)

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Configuration
env.allowLocalModels = false;
env.useBrowserCache = true;

// Global State
let extractor = null;
let isModelLoading = false;

// --- INITIALIZATION ---

async function loadModel() {
    if (extractor) return;
    if (isModelLoading) {
        while (isModelLoading) await new Promise(r => setTimeout(r, 100));
        return;
    }

    try {
        isModelLoading = true;
        // console.log('Sandbox: Loading Feature Extraction Pipeline...');
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        // console.log('Sandbox: Model Loaded');
    } catch (e) {
        console.error('Sandbox: Model Load Failed', e);
    } finally {
        isModelLoading = false;
    }
}

// --- CORE FUNCTIONS ---

async function generateEmbedding(text) {
    if (!text || !text.trim()) return null;
    await loadModel();
    if (!extractor) return null;

    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

// --- MESSAGE LISTENER ---

window.addEventListener('message', async (event) => {
    // Verify origin if possible, but sandbox is unique origin
    const request = event.data;

    if (!request || !request.action) return;

    try {
        if (request.action === 'ping') {
            event.source.postMessage({ action: 'pong', reqId: request.reqId }, event.origin);
            return;
        }

        if (request.action === 'embed_query') {
            const { text } = request.payload;
            const vector = await generateEmbedding(text);
            event.source.postMessage({
                action: 'result',
                reqId: request.reqId,
                result: { vector }
            }, event.origin);
        }

        if (request.action === 'analyze_capture') {
            const { text, id } = request.payload;
            const result = { id };

            if (text) {
                try {
                    const vec = await generateEmbedding(text);
                    result.embedding = vec;
                } catch (e) {
                    console.error('Embedding error', e);
                }
            }

            event.source.postMessage({
                action: 'analysis_complete',
                reqId: request.reqId,
                result: result
            }, event.origin);
        }

    } catch (error) {
        console.error('Sandbox Error:', error);
        event.source.postMessage({
            action: 'error',
            reqId: request.reqId,
            error: error.message
        }, event.origin);
    }
});

// Preload
loadModel();
