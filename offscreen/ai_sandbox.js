// AI Sandbox Worker
// Runs in a sandboxed iframe to allow remote CDN scripts (Transformers.js)

import { pipeline, env } from '../features/traceback/lib/transformers.js';

// Configuration
env.allowLocalModels = false;
env.useBrowserCache = true;
// Point to local WASM file (Non-SIMD version) using absolute path
try {
    env.backends.onnx.wasm.wasmPaths = {
        'ort-wasm.wasm': chrome.runtime.getURL('features/traceback/lib/ort-wasm.wasm'),
        'ort-wasm-threaded.wasm': chrome.runtime.getURL('features/traceback/lib/ort-wasm.wasm'), // FORCE single-threaded
        'ort-wasm-simd.wasm': chrome.runtime.getURL('features/traceback/lib/ort-wasm.wasm'), // FORCE non-SIMD
        'ort-wasm-simd-threaded.wasm': chrome.runtime.getURL('features/traceback/lib/ort-wasm.wasm'), // FORCE single-threaded non-SIMD
    };
    env.backends.onnx.wasm.simd = false; // Using non-SIMD file
    env.backends.onnx.wasm.numThreads = 1; // Force single thread to avoid SharedArrayBuffer issues
    env.useBrowserCache = false; // Disable cache to work without allow-same-origin
} catch (e) {
    console.warn('Sandbox: Failed to configure WASM paths, may fallback to other backends:', e.message);
}

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
        console.log('Sandbox: Loading Feature Extraction Pipeline...');

        // Configure the pipeline with local model files if available
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            // Use local files if available, otherwise fallback to CDN
            cacheDir: 'models',
            // Force local inference
            local_files_only: false,
        });

        console.log('Sandbox: Model Loaded Successfully');
    } catch (e) {
        const errorMsg = `Sandbox: Model Load Failed. ${e.message || e}`;
        console.error(errorMsg, e);
        console.warn('Sandbox: Falling back to alternative embedding method...');
        
        // Create a fallback function that uses a simple text-based approach
        extractor = createFallbackExtractor();
        
        // Post warning back to offscreen/background
        try {
            window.parent.postMessage({
                action: 'log_error',
                error: errorMsg
            }, '*');
        } catch (err) { console.error('Failed to post error', err); }
    } finally {
        isModelLoading = false;
    }
}

// Fallback function for when transformer model fails
function createFallbackExtractor() {
    console.log('Sandbox: Using fallback embedding generator');
    
    // Simple embedding generator based on text characteristics
    return {
        async call(text, options = {}) {
            // Create a simple embedding based on text features
            return generateSimpleEmbedding(text);
        }
    };
}

// Generate simple embedding based on text features
function generateSimpleEmbedding(text) {
    // Create a deterministic vector based on text content
    const vector = new Array(384).fill(0);
    
    if (!text || typeof text !== 'string') {
        return { data: new Float32Array(vector) };
    }
    
    // Generate pseudo-random but deterministic values based on text content
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const idx = i % 384;
        
        // Mix character codes with position to create varied values
        vector[idx] = (vector[idx] + (charCode * 131 + i * 7919)) % 2 - 1; // Normalize to [-1, 1]
    }
    
    // Apply some normalization
    let magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
        for (let i = 0; i < vector.length; i++) {
            vector[i] /= magnitude;
        }
    }
    
    return { data: new Float32Array(vector) };
}

// --- CORE FUNCTIONS ---

async function generateEmbedding(text) {
    if (!text || !text.trim()) {
        console.warn('Sandbox: Empty text provided for embedding');
        return null;
    }

    await loadModel();
    if (!extractor) {
        console.error('Sandbox: Extractor not available for embedding');
        return null;
    }

    try {
        // Check if extractor is the fallback (has 'call' method) or the transformer pipeline
        let output;
        if (typeof extractor.call === 'function') {
            // This is our fallback extractor
            output = await extractor.call(text, { pooling: 'mean', normalize: true });
        } else {
            // This is the transformer pipeline
            output = await extractor(text, { pooling: 'mean', normalize: true });
        }
        
        const embedding = Array.from(output.data);

        // Verify the embedding is the expected size (should be 384 for all-MiniLM-L6-v2)
        if (embedding && embedding.length !== 384) {
            console.warn(`Sandbox: Unexpected embedding length: ${embedding.length}, expected 384`);
        }

        console.log(`Sandbox: Generated embedding with ${embedding ? embedding.length : 0} dimensions`);
        return embedding;
    } catch (error) {
        console.error('Sandbox: Error generating embedding:', error);
        console.error('Sandbox: Error details - Message:', error.message, 'Stack:', error.stack);
        return null;
    }
}

// --- MESSAGE LISTENER ---

window.addEventListener('message', async (event) => {
    // Security: Verify the message is from our extension (parent frame)
    // Since this runs in an iframe from the same extension, origins should match
    // Enhanced security check for messages
    // Verify the message is from our extension
    if (event.source !== window.parent) {
        console.warn('Security Warning: Message received from unexpected source:', event.source);
        return;
    }

    // Additional validation: check that the message is from our extension origin
    const extensionOrigin = chrome.runtime.id ? `chrome-extension://${chrome.runtime.id}` : null;
    if (extensionOrigin && !event.origin.startsWith(extensionOrigin)) {
        console.warn('Security Warning: Message origin mismatch:', event.origin, extensionOrigin);
        return;
    }

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

