// ZenPet Page Bridge
(() => {
    'use strict';

    const hasWindowAI = typeof window.ai !== 'undefined';
    const hasSelfAI = typeof self.ai !== 'undefined';

    const ai = hasWindowAI ? window.ai : (hasSelfAI ? self.ai : null);
    let promptSession = null;
    let proofreaderSession = null;

    // Check if Proofreader API is available
    function isProofreaderAvailable() {
        return typeof window.Proofreader !== 'undefined';
    }

    // Initialize Proofreader session
    async function initializeProofreader() {
        try {
            if (!isProofreaderAvailable()) {
                console.log('📝 Proofreader API not available');
                return null;
            }

            const availability = await window.Proofreader.availability();
            console.log('📝 Proofreader availability:', availability);

            if (availability === 'no') {
                console.log('📝 Proofreader not available on this device');
                return null;
            }

            // Create proofreader session
            const session = await window.Proofreader.create({
                expectedInputLanguages: ['en'],
                outputLanguage: 'en'
            });

            console.log('📝 Proofreader session created successfully');
            return session;
        } catch (error) {
            console.warn('📝 Failed to initialize Proofreader:', error);
            return null;
        }
    }

    async function createSession(systemPrompt) {
        // 1. Try Legacy/Origin Trial API (User Requested) -> Returns { session, type: 'legacy' }
        if (typeof window.LanguageModel !== 'undefined') {
            // Prioritize simple creation with systemPrompt as initialPrompts is causing DOMException on some versions
            try {
                const session = await window.LanguageModel.create({ systemPrompt });
                return { session, type: 'legacy' };
            } catch (e) {
                console.log('Simple LanguageModel creation failed, trying initialPrompts', e);
                try {
                    const session = await window.LanguageModel.create({
                        initialPrompts: [{ role: 'system', content: systemPrompt }]
                    });
                    return { session, type: 'legacy' };
                } catch (e2) {
                    console.warn('LanguageModel creation failed completely', e2);
                    // Try fallback to basic prompt API
                    try {
                        const session = await window.ai.languageModel.create({ systemPrompt });
                        return { session, type: 'fallback' };
                    } catch (e3) {
                        console.warn('All AI session creation methods failed', e3);
                    }
                }
            }
        }

        // 2. Try Standard Window.AI API -> Returns { session, type: 'standard' }
        if (window.ai?.languageModel) {
            try {
                const caps = await window.ai.languageModel.capabilities();
                if (caps.available === 'no') return null;
                const session = await window.ai.languageModel.create({ systemPrompt });
                return { session, type: 'standard' };
            } catch (e) {
                console.warn('window.ai creation failed, trying basic create', e);
                try {
                    // Try without system prompt first
                    const session = await window.ai.languageModel.create();
                    // Set system prompt separately if possible
                    if (session.setSystemPrompt) {
                        await session.setSystemPrompt(systemPrompt);
                    }
                    return { session, type: 'standard' };
                } catch (e2) {
                    console.warn('window.ai basic creation also failed', e2);
                }
            }
        }
        return null;
    }

    async function runPrompt(sessionWrapper, text) {
        const { session, type } = sessionWrapper;

        // Handle Streaming vs Non-Streaming
        if (session.promptStreaming) {
            const stream = session.promptStreaming(text);
            let result = '';

            if (type === 'legacy') {
                // Legacy LanguageModel usually sends DELTAS
                for await (const chunk of stream) { result += chunk; }
            } else {
                // Standard window.ai usually sends ACCUMULATED
                for await (const chunk of stream) { result = chunk; }
            }
            return result;
        } else if (session.prompt) {
            return await session.prompt(text);
        }
        throw new Error('No prompt method found on session');
    }

    async function usePromptAPI(text, mode) {
        // Handle proofread mode with dedicated Proofreader API if available
        if (mode === 'proofread') {
            // Try to use the dedicated Proofreader API first
            if (!proofreaderSession) {
                proofreaderSession = await initializeProofreader();
            }

            if (proofreaderSession) {
                try {
                    const result = await proofreaderSession.proofread(text);
                    // According to Chrome AI Proofreader API docs, the corrected text is in result.correctedInput
                    return result.correctedInput || result.text || result.correctedText || result.corrected || text;
                } catch (error) {
                    console.warn('Proofreader API failed, falling back to Language Model:', error);
                    // Reset proofreader session on error to try again next time
                    proofreaderSession = null;
                }
            }

            // If Proofreader API isn't available or fails, fall back to Language Model
            if (!promptSession) {
                const systemPrompt = 'You are ZenPet, a helpful cognitive assistant. You excel at summarizing complex information, proofreading text for clarity, and creative rewriting. Always be concise and professional.';
                promptSession = await createSession(systemPrompt);
            }

            if (!promptSession) {
                throw new Error('AI Unavailable (LanguageModel/window.ai not found)');
            }

            const prompt = `Task: Correct all spelling, grammar, and punctuation errors in the given text. Return ONLY the corrected text without any additional commentary.

Example:
Input: Helo world. Im here.
Output: Hello world. I'm here.

Input: ${text}
Output:`;
            return await runPrompt(promptSession, prompt);
        }

        // Handle other modes (rewrite, summarize, prompt)
        if (!promptSession) {
            const systemPrompt = 'You are ZenPet, a helpful cognitive assistant. You excel at summarizing complex information, proofreading text for clarity, and creative rewriting. Always be concise and professional.';
            promptSession = await createSession(systemPrompt);
        }

        if (!promptSession) {
            throw new Error('AI Unavailable (LanguageModel/window.ai not found)');
        }

        let prompt;
        // If mode is 'prompt' (default from assistant.js), use text directly as the prompt
        if (mode === 'prompt') {
            prompt = text;
        } else if (mode === 'rewrite') {
            prompt = 'Rewrite the following text to be clearer and more concise while preserving the original meaning and voice. Return only the rewritten text.\n\n' + text;
        } else {
            prompt = 'Create a summary of the following text. Return only the summary.\n\n' + text;
        }

        return await runPrompt(promptSession, prompt);
    }

    async function handleRequest(text, mode) {
        return await usePromptAPI(text, mode);
    }

    console.log('[ZenPetBridge] Initializing listener...');
    window.addEventListener('message', async (event) => {
        // Robust check for same-origin messages
        const data = event.data;
        if (!data || data.type !== 'PBRIDGE_REQUEST') return;

        const requestId = data.requestId;
        const payload = data.payload;

        try {
            const text = payload.userText || '';
            const mode = payload.mode || 'prompt';

            const result = await handleRequest(text, mode);

            window.postMessage({
                type: 'PBRIDGE_RESPONSE',
                requestId: requestId,
                text: result
            }, '*');

        } catch (error) {
            window.postMessage({
                type: 'PBRIDGE_RESPONSE',
                requestId: requestId,
                error: String(error)
            }, '*');
        }
    });

    // SIGNAL READY
    console.log('[ZenPetBridge] Injected and Ready');
    window.postMessage({ type: 'PBRIDGE_READY' }, '*');
})();



