"use strict";
(() => {
    // ZenPet Assistant Script

    const TAG = "[ZenPetContent]";

    let bridgeReady = false;
    let aiPreloaded = false;
    let preloadStartTime = null;

    async function ensureBridgeInjected() {
        if (bridgeReady) return true;
        if (window.__zenpetBridgeInjected) {
            // Wait for it
            for (let i = 0; i < 30; i++) {
                if (bridgeReady) return true;
                await new Promise(r => setTimeout(r, 100));
            }
            return bridgeReady;
        }

        return new Promise((resolve) => {
            const s = document.createElement("script");
            s.src = chrome.runtime.getURL("features/zenpet/injected/pageBridge.js");
            s.onload = () => s.remove();
            window.__zenpetBridgeInjected = true;

            const readyHandler = (e) => {
                if (e.data?.type === 'PBRIDGE_READY') {
                    bridgeReady = true;
                    window.removeEventListener('message', readyHandler);
                    // Start preloading AI after bridge is ready
                    if (!aiPreloaded) {
                        preloadAI();
                    }
                    resolve(true);
                }
            };
            window.addEventListener('message', readyHandler);
            document.documentElement.appendChild(s);

            setTimeout(() => {
                window.removeEventListener('message', readyHandler);
                resolve(bridgeReady);
            }, 5000);
        });
    }

    // Preload AI models to reduce first-time latency
    async function preloadAI() {
        if (aiPreloaded) return;
        preloadStartTime = Date.now();

        try {
            // Attempt to create a basic session to trigger AI model loading
            const requestId = `preload_${Date.now()}`;
            window.postMessage(
                { type: "PBRIDGE_REQUEST", requestId, payload: { userText: "", mode: "preload" } },
                "*"
            );
            console.log(TAG, "AI preload initiated");
            aiPreloaded = true;
        } catch (e) {
            console.warn(TAG, "AI preload failed:", e);
        }
    }

    // Proactively inject bridge
    ensureBridgeInjected();

    const pending = new Map();

    // Listen for UI Actions (from Overlay)
    window.addEventListener("message", async (event) => {
        // Robust check: accept messages from self (same world)
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // Handle Bridge Responses (Existing)
        if (data.type === "PBRIDGE_RESPONSE" || data.type === "PBRIDGE_PONG") {
            console.log(TAG, "Bridge response received:", data.requestId);
            const resolver = pending.get(data.requestId);
            if (resolver) {
                resolver({ text: data.text, error: data.error, info: data.info });
                pending.delete(data.requestId);
            }
        }

        // Handle Overlay Actions (New)
        if (data.type === "ZENPET_ACTION") {
            const { mode } = data;
            console.log(TAG, "Overlay action requested:", mode);
            handle(mode);
        }
    });

    // Cache for storing recent AI responses - now with per-call disabling
    const responseCache = new Map();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    async function bridgePrompt(userText, mode = 'prompt', useCache = true) {
        // Create cache key based on userText and mode
        const cacheKey = `${mode}:${userText.substring(0, 100)}`;

        // Only use cache if explicitly enabled
        if (useCache) {
            const cached = responseCache.get(cacheKey);

            if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
                console.log(TAG, "Returning cached response");
                return cached.response;
            }
        }

        const ready = await ensureBridgeInjected();
        if (!ready && !bridgeReady) {
            throw new Error("AI Bridge failed to initialize.");
        }

        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                pending.delete(requestId);
                reject(new Error("Timed out - AI model is taking too long to respond."));
            }, 60000); // Reduced timeout to 60 seconds for better UX

            pending.set(requestId, (resp) => {
                clearTimeout(timeout);
                if (resp?.error) {
                    reject(new Error(resp.error));
                } else {
                    const response = String(resp?.text ?? "");
                    // Only cache if enabled
                    if (useCache) {
                        // Cache the response
                        responseCache.set(cacheKey, {
                            response: response,
                            timestamp: Date.now()
                        });
                    }
                    resolve(response);
                }
            });

            window.postMessage(
                { type: "PBRIDGE_REQUEST", requestId, payload: { userText, mode } },
                "*"
            );
        });
    }


    function getRefText(mode) {
        // Check if we're in Google Docs
        if (window.location.hostname.includes('docs.google.com')) {
            return getGoogleDocsText(mode);
        }

        // Check if we're in Gmail
        if (window.location.hostname.includes('mail.google.com')) {
            return getGmailText(mode);
        }

        // For all modes, first check if text is selected
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : '';
        
        if (selectedText) {
            console.log('Found selected text:', selectedText.substring(0, 50) + '...');
            return selectedText;
        }

        // If no selection, fall back to page content for summarize
        if (mode === 'summarize') {
            return document.body.innerText; // Simple page text extraction
        }
        
        // For proofread/rewrite with no selection, return empty string
        return '';
    }

    function getGoogleDocsText(mode) {
        // Google Docs specific text extraction
        try {
            // First, try to get the current selection which is the most reliable method
            const selection = window.getSelection();
            if (selection && selection.toString().trim() !== '') {
                const selectedText = selection.toString().trim();

                // For proofread/rewrite, return selected text if available
                if ((mode === 'proofread' || mode === 'rewrite') && selectedText) {
                    console.log('GDocs: Found selected text:', selectedText.substring(0, 50) + '...');
                    return selectedText;
                }

                // For summarize, if there's a selection, we might want the whole document instead
                if (mode === 'summarize') {
                    // Check if the selection covers a significant portion of the document
                    // If it's a small selection, user might want just that part summarized
                    if (selectedText.length < 200) { // Less than 200 chars, summarize selection
                        return selectedText;
                    }
                    // Otherwise, proceed to get all document text
                }
            }

            // Check if any specific element contains the selection
            // This is important for Google Docs' complex structure
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const selectedElement = range.commonAncestorContainer;

                // If the selected element or its parent is a content element, extract from there
                let targetElement = selectedElement;
                if (selectedElement.nodeType === Node.TEXT_NODE) {
                    targetElement = selectedElement.parentElement;
                }

                // Look for Google Docs specific elements that might contain the selection
                const possibleParents = [
                    targetElement,
                    targetElement.parentElement,
                    targetElement.closest('[role="document"]'),
                    targetElement.closest('.kix-document'),
                    targetElement.closest('.docs-text-layer'),
                    targetElement.closest('.kix-page'),
                    targetElement.closest('.kix-pagewrapper')
                ];

                for (const element of possibleParents) {
                    if (element) {
                        const elementText = element.innerText || element.textContent || '';
                        if (elementText.trim()) {
                            // Extract only the selected portion if we're in proofread/rewrite mode
                            if (mode === 'proofread' || mode === 'rewrite') {
                                const rangeText = range.toString().trim();
                                if (rangeText) {
                                    console.log('GDocs: Extracted range text:', rangeText.substring(0, 50) + '...');
                                    return rangeText;
                                }
                            }

                            if (mode === 'summarize') {
                                return elementText.trim();
                            }
                        }
                    }
                }
            }

            // Google Docs uses iframes and Shadow DOM, try to access the main document iframe
            try {
                // Look for the main content iframe
                const iframes = document.querySelectorAll('iframe');
                for (const iframe of iframes) {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (iframeDoc) {
                            // Look for Google Docs specific content elements inside iframe
                            const docContent = iframeDoc.querySelector('[role="document"]') ||
                                iframeDoc.querySelector('.kix-document') ||
                                iframeDoc.querySelector('.docs-text-layer');

                            if (docContent) {
                                let iframeText = docContent.innerText || docContent.textContent || '';
                                if (iframeText.trim()) {
                                    if (mode === 'summarize') {
                                        return iframeText.trim();
                                    }

                                    // For proofread/rewrite, prefer selection, fallback to iframe content
                                    const selectionText = selection.toString().trim();
                                    if ((mode === 'proofread' || mode === 'rewrite') && selectionText) {
                                        console.log('GDocs: Returning selected text for processing:', selectionText.substring(0, 50) + '...');
                                        return selectionText;
                                    }

                                    return iframeText.trim();
                                }
                            }
                        }
                    } catch (e) {
                        // Cross-origin restrictions may prevent accessing iframe content
                        // Continue to other methods
                    }
                }
            } catch (e) {
                console.debug('Could not access iframes:', e);
            }

            // Look for Google Docs content elements in the main document
            const docElements = [
                '[role="document"]',
                '.kix-document',
                '.docs-text-layer',
                '.kix-page',
                '.kix-pagewrapper',
                '.kix-lineview',
                '.kix-paragraphrenderer',
                '.kix-wordhtmlgenerator-word-node',
                '[data-is-interactable="true"]'
            ];

            // For Google Docs, we need to be more aggressive in finding content
            // since content might be dynamically updated
            let allDocText = '';
            for (const selector of docElements) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(el => {
                        // Extract text content using multiple methods
                        let text = el.innerText || el.textContent || '';
                        if (!text.trim()) {
                            // If innerText and textContent are empty, try child elements
                            const textSpans = el.querySelectorAll('span, div, p');
                            textSpans.forEach(span => {
                                if (span.innerText) {
                                    allDocText += span.innerText + ' ';
                                }
                            });
                        } else {
                            allDocText += text + '\n';
                        }
                    });
                }
            }

            if (allDocText.trim()) {
                if (mode === 'summarize') {
                    return allDocText.trim();
                }

                // For proofread/rewrite, prefer selection, fallback to document content
                const selectionText = selection.toString().trim();
                if ((mode === 'proofread' || mode === 'rewrite') && selectionText) {
                    console.log('GDocs: Returning selected text from doc elements:', selectionText.substring(0, 50) + '...');
                    return selectionText;
                }

                // If no selection but we have document text, return the document text
                return allDocText.trim();
            }

            // Alternative approach: look for content-editable areas
            const editableAreas = document.querySelectorAll('[contenteditable="true"]:not([contenteditable="false"])');
            if (editableAreas.length > 0) {
                // Find the active editable area (usually where the cursor is)
                const activeEditable = Array.from(editableAreas).find(area => area.contains(document.activeElement)) ||
                    editableAreas[0];

                if (mode === 'summarize') {
                    return activeEditable.innerText || activeEditable.textContent || '';
                }

                // For proofread/rewrite, try to get selected text
                const selection = window.getSelection();
                if (selection && selection.toString().trim() !== '') {
                    const selText = selection.toString().trim();
                    console.log('GDocs: Returning fallback selected text:', selText.substring(0, 50) + '...');
                    return selText;
                }

                // For Google Docs, even if no selection, return the content from the editable area
                // as it might contain typed/pasted content
                const editableContent = activeEditable.innerText || activeEditable.textContent || '';
                if (editableContent.trim()) {
                    console.log('GDocs: Found content in editable area:', editableContent.substring(0, 50) + '...');
                    // For proofread/rewrite, we can process the entire content if no selection
                    if (mode === 'proofread' || mode === 'rewrite') {
                        return editableContent.trim();
                    }
                    return editableContent.trim();
                }

                return editableContent;
            }

            // Try to access Google Docs specific containers
            const docContainer = document.querySelector('#docs-editor, #kix-appview-editor, .docs-text-layer');
            if (docContainer) {
                const containerText = docContainer.innerText || docContainer.textContent || '';
                if (containerText.trim() && mode !== 'proofread' && mode !== 'rewrite') {
                    return containerText.trim();
                }
                // For proofread/rewrite, only return if there's a selection
                if ((mode === 'proofread' || mode === 'rewrite') && selection.toString().trim()) {
                    return selection.toString().trim();
                }
                return containerText;
            }

            // Ultimate fallback to document body
            return document.body.innerText || document.body.textContent || '';
        } catch (e) {
            console.warn('Error getting Google Docs text:', e);
            // Fallback to regular selection if Google Docs specific method fails
            const sel = window.getSelection();
            const selText = sel ? sel.toString() : '';
            if (selText.trim()) {
                console.log('GDocs: Returning ultimate fallback selected text:', selText.substring(0, 50) + '...');
                return selText;
            }
            return '';
        }
    }

    function getGmailText(mode) {
        // Gmail specific text extraction
        try {
            // First, try to get the current selection which is the most reliable method
            const selection = window.getSelection();
            if (selection && selection.toString().trim() !== '') {
                const selectedText = selection.toString().trim();

                // For proofread/rewrite, return selected text if available
                if ((mode === 'proofread' || mode === 'rewrite') && selectedText) {
                    console.log('Gmail: Found selected text:', selectedText.substring(0, 50) + '...');
                    return selectedText;
                }

                // For summarize, if there's a selection, use it
                if (mode === 'summarize') {
                    return selectedText;
                }
            }

            // Try to find the active compose window or email content
            // Compose window selectors
            const composeDivs = document.querySelectorAll('div[aria-label="Rich Text Area"], div[role="textbox"], div[contenteditable="true"].aXjCH');

            // If we're in compose mode, get the compose content
            for (const composeDiv of composeDivs) {
                if (composeDiv.offsetParent !== null) { // Check if element is visible
                    const composeText = composeDiv.innerText || composeDiv.textContent || '';
                    if (composeText.trim()) {
                        if (mode === 'summarize') {
                            return composeText.trim();
                        }
                        // For proofread/rewrite, prefer the selection, fallback to compose content if no selection
                        if ((mode === 'proofread' || mode === 'rewrite') && !selection.toString().trim()) {
                            return composeText.trim();
                        }
                    }
                }
            }

            // Try to find selected content in email threads
            // Sometimes the selection might be in hidden or dynamically loaded content
            const allContentDivs = document.querySelectorAll('div[role="listitem"], .a3s, .adn, .gs, .ii');
            for (const contentDiv of allContentDivs) {
                // Check if any part of this element is selected
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    if (contentDiv.contains(range.startContainer) || contentDiv.contains(range.endContainer)) {
                        const selectedInElement = range.toString().trim();
                        if (selectedInElement) {
                            console.log('Gmail: Found selected text in content element:', selectedInElement.substring(0, 50) + '...');
                            return selectedInElement;
                        }
                    }
                }
            }

            // If we're reading an email, try to find the email content
            const emailContentSelectors = [
                '.adn',  // Email body containers
                '.gs',   // Quoted text
                '.a3s',  // Main email content
                '.ii',   // Inner content
                '.adM',  // Signature
                '[role="listitem"]' // Email thread items
            ];

            for (const selector of emailContentSelectors) {
                const emailElements = document.querySelectorAll(selector);
                if (emailElements.length > 0) {
                    let emailText = '';
                    emailElements.forEach(el => {
                        // Skip quoted text if we're only looking for the main content
                        if (!el.closest('.gmail_quote') || mode !== 'proofread') {
                            const text = el.innerText || el.textContent || '';
                            if (text.trim()) {
                                emailText += text.trim() + '\n';
                            }
                        }
                    });

                    if (emailText.trim()) {
                        if (mode === 'summarize') {
                            return emailText.trim();
                        }

                        // For proofread/rewrite, use selection if available, otherwise use email content
                        const selectionText = selection.toString().trim();
                        if ((mode === 'proofread' || mode === 'rewrite') && selectionText) {
                            console.log('Gmail: Returning selected text for processing:', selectionText.substring(0, 50) + '...');
                            return selectionText;
                        }

                        return emailText.trim();
                    }
                }
            }

            // Try to find any visible content editable areas
            const contentEditables = document.querySelectorAll('[contenteditable="true"]:not(.kix-*)');
            for (const editable of contentEditables) {
                if (editable.offsetParent !== null) { // Check if visible
                    const text = editable.innerText || editable.textContent || '';
                    if (text.trim()) {
                        return text.trim();
                    }
                }
            }

            // Ultimate fallback to document body
            return document.body.innerText;
        } catch (e) {
            console.warn('Error getting Gmail text:', e);
            // Fallback to regular selection if Gmail specific method fails
            const sel = window.getSelection();
            const selText = sel ? sel.toString() : '';
            if (selText.trim()) {
                console.log('Gmail: Returning fallback selected text:', selText.substring(0, 50) + '...');
                return selText;
            }
            return '';
        }
    }

    function buildPrompt(mode, src) {
        if (mode === 'summarize') {
            return `Summarize this in 3-5 bullet points with a title. Use **bold** for key terms:

${src.slice(0, 2000)}`;
        }

        if (mode === "proofread") {
            return `

${src}`;
        }

        // For rewrite mode
        return `Rewrite this text for clarity and impact:

${src}`;
    }

    async function handle(mode) {
        try {
            // Notify UI we are working
            window.postMessage({ type: 'ZENPET_STATUS', message: '⏳ AI Working...' }, '*');

            const startTime = Date.now();

            console.log(TAG, 'Getting reference text for mode:', mode);
            const text = getRefText(mode);

            console.log(TAG, 'Retrieved text length:', text.length, 'chars');

            // Additional check for Google Docs to ensure we detect text properly
            let processedText = text;
            if (!processedText.trim() && window.location.hostname.includes('docs.google.com')) {
                console.log(TAG, 'No text retrieved, checking Google Docs specific elements...');
                // In Google Docs, there might be content even if selection is empty
                // Try to get content from various possible sources
                const possibleSources = [
                    document.querySelector('[role="document"]'),
                    document.querySelector('[contenteditable="true"]'),
                    document.querySelector('#docs-editor'),
                    document.querySelector('.kix-document'),
                    document.querySelector('.docs-text-layer'),
                    document.querySelector('.kix-page'),
                    document.querySelector('.kix-pagewrapper')
                ];

                let foundContent = false;
                for (const source of possibleSources) {
                    if (source) {
                        const contentText = source.innerText || source.textContent || '';
                        if (contentText.trim()) {
                            console.log(TAG, 'Found Google Docs content length:', contentText.length);
                            foundContent = true;

                            // For proofread/rewrite, if there's content but no selection, try to get all content
                            if (mode === 'proofread' || mode === 'rewrite') {
                                // Try to get the content from the document directly
                                const newText = getGoogleDocsText(mode);
                                if (newText.trim()) {
                                    console.log(TAG, 'Successfully retrieved Google Docs content for proofread/rewrite');
                                    // Update processedText with the newly retrieved content
                                    processedText = newText;
                                    break;
                                } else {
                                    window.postMessage({ type: 'ZENPET_STATUS', message: '⚠️ Please select text to proofread/rewrite in Google Docs' }, '*');
                                    return;
                                }
                            } else {
                                // For summarize, use the document content
                                // We already got it through getRefText, so continue
                            }
                        }
                    }
                }

                // If we still didn't find content, check iframes
                if (!foundContent) {
                    try {
                        const iframes = document.querySelectorAll('iframe');
                        for (const iframe of iframes) {
                            try {
                                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                                if (iframeDoc) {
                                    const docContent = iframeDoc.querySelector('[role="document"]') ||
                                        iframeDoc.querySelector('.kix-document') ||
                                        iframeDoc.querySelector('.docs-text-layer');
                                    if (docContent) {
                                        const contentText = docContent.innerText || contentText || '';
                                        if (contentText.trim()) {
                                            console.log(TAG, 'Found Google Docs iframe content length:', contentText.length);
                                            foundContent = true;

                                            if (mode === 'proofread' || mode === 'rewrite') {
                                                const newText = getGoogleDocsText(mode);
                                                if (newText.trim()) {
                                                    processedText = newText;
                                                    break;
                                                } else {
                                                    window.postMessage({ type: 'ZENPET_STATUS', message: '⚠️ Please select text to proofread/rewrite in Google Docs' }, '*');
                                                    return;
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                // Cross-origin restrictions may prevent accessing iframe content
                                continue;
                            }
                        }
                    } catch (e) {
                        console.debug('Could not check iframes for content:', e);
                    }
                }

                if (!foundContent && (mode === 'proofread' || mode === 'rewrite')) {
                    // For proofread/rewrite, try one final attempt to get any content from the document
                    const finalText = getGoogleDocsText(mode);
                    if (finalText.trim()) {
                        processedText = finalText;
                    } else {
                        window.postMessage({ type: 'ZENPET_STATUS', message: '⚠️ No text available in Google Docs. Please make sure there is content in the document.' }, '*');
                        return;
                    }
                }
            }

            // Use the processed text (which may have been updated for Google Docs)
            processedText = processedText || text;

            // Additional check for Gmail to ensure we detect text properly
            if (!processedText.trim() && window.location.hostname.includes('mail.google.com')) {
                console.log(TAG, 'No text retrieved, checking Gmail specific elements...');
                // In Gmail, there might be content even if selection is empty
                const gmailContent = document.querySelector('div[aria-label="Rich Text Area"]') ||
                    document.querySelector('div[role="textbox"]') ||
                    document.querySelector('.a3s') ||
                    document.querySelector('[contenteditable="true"]:not(.kix-*)');

                if (gmailContent) {
                    const contentText = gmailContent.innerText || gmailContent.textContent || '';
                    console.log(TAG, 'Found Gmail content length:', contentText.length);
                    if (contentText.trim()) {
                        // If there's content in Gmail but no selection, inform user appropriately
                        if (mode === 'proofread' || mode === 'rewrite') {
                            window.postMessage({ type: 'ZENPET_STATUS', message: '⚠️ Please select text to proofread/rewrite in Gmail' }, '*');
                            return;
                        } else {
                            // For summarize, use the Gmail content
                            // We already got it through getRefText, so continue
                        }
                    }
                }
            }

            if (!processedText.trim()) {
                console.log(TAG, 'No text found after all checks');
                window.postMessage({ type: 'ZENPET_STATUS', message: '⚠️ No text found/selected' }, '*');
                return;
            }

            console.log(TAG, "Starting AI mode:", mode);
            const prompt = buildPrompt(mode, processedText);
            // Disable caching for proofread and rewrite to ensure fresh results for different selections
            const useCache = mode !== 'proofread' && mode !== 'rewrite';
            const answer = await bridgePrompt(prompt, mode, useCache);

            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(TAG, `AI processing completed in ${duration}ms`);

            // Check if we're in Google Docs and should insert the text back directly
            if (window.location.hostname.includes('docs.google.com')) {
                // Send the result back with instruction to insert in Google Docs
                window.postMessage({
                    type: 'ZENPET_RESULT',
                    mode: mode,
                    text: answer,
                    insertInGoogleDocs: true
                }, '*');
            } else {
                // For all other sites including Gmail, send result back for normal display
                window.postMessage({
                    type: 'ZENPET_RESULT',
                    mode: mode,
                    text: answer
                }, '*');
            }

            window.postMessage({ type: 'ZENPET_STATUS', message: `✅ Done! (${duration}ms)` }, '*');

        } catch (e) {
            console.error("[ZenPetAssistant]", e);

            // More specific error handling
            let errorMessage = '❌ Error: ' + e.message;
            if (e.message.includes('timeout')) {
                errorMessage = '❌ Timeout: AI took too long to respond. Please try again.';
            } else if (e.message.includes('AI Unavailable')) {
                errorMessage = '❌ AI Unavailable: Language model is not accessible. Check Chrome settings.';
            } else if (e.message.includes('Bridge failed')) {
                errorMessage = '❌ Connection Error: Failed to connect to AI service. Please refresh the page.';
            }

            window.postMessage({ type: 'ZENPET_STATUS', message: errorMessage }, '*');
        }
    }

    // Keep Background Listener for Context Menu or Shortcuts if needed
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type === "AI_PROOFREAD") handle("proofread");
        if (msg?.type === "AI_REWRITE") handle("rewrite");
        if (msg?.type === "AI_SUMMARIZE") handle("summarize");
        sendResponse({ received: true });
        return true;
    });

})();



