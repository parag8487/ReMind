// Set PDF Worker Path (Moved from inline script to fix CSP)
pdfjsLib.GlobalWorkerOptions.workerSrc = '../lib/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const backBtn = document.getElementById('backBtn');
    backBtn.addEventListener('click', () => {
        window.location.href = '../../../popup/popup.html';
    });

    // Tab Switching
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = {
        'text': document.getElementById('textSection'),
        'image': document.getElementById('imageSection'),
        'pdf': document.getElementById('pdfSection')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            Object.values(sections).forEach(s => s.classList.add('hidden'));
            const target = tab.dataset.tab;
            sections[target].classList.remove('hidden');
        });
    });

    // --- Toast & UI Helpers ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';

        const icon = type === 'success'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

        toast.innerHTML = `${icon}<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function setLoading(btn, isLoading, originalText = 'Convert & Download', customText = 'Processing...') {
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = `<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> ${customText}`;
            const spinner = btn.querySelector('.spinner');
            if (spinner) {
                spinner.style.animation = "spin 1s linear infinite";
                if (!document.getElementById('spinner-style')) {
                    const style = document.createElement('style');
                    style.id = 'spinner-style';
                    style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
                    document.head.appendChild(style);
                }
            }
        } else {
            btn.disabled = false;
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> ${originalText}`;
        }
    }

    // --- AI Integration ---
    // --- AI Integration (HTML-First Engine) ---
    // --- AI Integration (Separated Logic) ---

    // 1. PDF AI Engine (FROZEN - DO NOT MODIFY WITHOUT PERMISSION)
    async function restructurePdfWithAI(text) {
        try {
            let result = '';
            // System Prompt: Frontend Developer (Speed + Code Optimized)
            const systemInstructions =
                "You are an expert Frontend Developer. Convert raw text into **Semantic HTML**.\n\n" +
                "**RULES**:\n" +
                "1. **HTML BODY ONLY**: Output tags like <section>, <h2>, <p>, <table>. NO <html>/<body> tags.\n" +
                "2. **CODE & COMMANDS (CRITICAL)**: Detect any code, terminal commands, file paths, or scripts. **Wrap them in <div class='code-block'>**. Do NOT use standard <pre> unless it's a massive block.\n" +
                "3. **NOISE REDUCTION**: Ignore header/footer garbage, page numbers, or random OCR artifacts.\n" +
                "4. **STRUCTURE**:\n" +
                "   - Use <h2> for main section titles.\n" +
                "   - Use <div class='highlight-box'> for summaries/notes.\n" +
                "   - Use <table class='data-table'> for structured data.\n" +
                "5. **LISTS**: Ensure <ul>/<ol> are valid. Fix broken numbering.\n";

            const userPrompt = `
            Context: Raw text extracted from a PDF Document.
            Task: Create a beautiful, professional HTML document from this.
            
            Raw Text:
            ${text}
            `;

            if (typeof window.LanguageModel !== 'undefined') {
                console.log('Using window.LanguageModel');
                const session = await window.LanguageModel.create({ systemPrompt: systemInstructions });
                const fullPrompt = `${systemInstructions}\n\n${userPrompt}`;
                const stream = await session.promptStreaming(fullPrompt);
                for await (const chunk of stream) { result += chunk; }
                if (session.destroy) session.destroy();
            } else if (window.ai && window.ai.languageModel) {
                console.log('Using window.ai.languageModel');
                const model = await window.ai.languageModel.create({ systemPrompt: systemInstructions });
                const stream = model.promptStreaming(userPrompt);
                for await (const chunk of stream) { result = chunk; }
            } else {
                return `<div class="alert alert-error">AI not capable.</div><pre>${escapeHtml(text)}</pre>`;
            }

            result = result.trim().replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
            return result;
        } catch (error) {
            console.error("PDF AI Error:", error);
            showToast("PDF AI failed, using raw text", 'error');
            return `<div class="raw-text">${escapeHtml(text)}</div>`;
        }
    }

    // 2. IMAGE AI Engine (Optimized for OCR & Layouts)
    async function restructureImageWithAI(text) {
        try {
            let result = '';
            // System Prompt: Frontend Developer (OCR Optimized)
            const systemInstructions =
                "You are an expert Frontend Developer. Convert raw OCR text into **Semantic HTML**.\n\n" +
                "**RULES**:\n" +
                "1. **HTML BODY ONLY**: Output tags like <section>, <h2>, <p>, <table>. NO <html>/<body> tags.\n" +
                "2. **OCR CLEANUP**: Fix broken words/lines. **Ignore garbage text** (random symbols).\n" +
                "3. **CODE & COMMANDS**: Detect code/paths -> **Wrap in <div class='code-block'>**.\n" +
                "4. **STRUCTURE**:\n" +
                "   - Use <h2> for headings.\n" +
                "   - Detect tables and use <table class='data-table'>.\n" +
                "5. **LISTS**: Fix numbered lists (e.g., '1. A 1. B' -> '1. A 2. B').\n";

            const userPrompt = `
            Context: Raw text extracted from an Image (OCR).
            Task: Create a beautiful, professional HTML document. Fix OCR errors.
            
            Raw Text:
            ${text}
            `;

            if (typeof window.LanguageModel !== 'undefined') {
                const session = await window.LanguageModel.create({ systemPrompt: systemInstructions });
                const fullPrompt = `${systemInstructions}\n\n${userPrompt}`;
                const stream = await session.promptStreaming(fullPrompt);
                for await (const chunk of stream) { result += chunk; }
                if (session.destroy) session.destroy();
            } else if (window.ai && window.ai.languageModel) {
                const model = await window.ai.languageModel.create({ systemPrompt: systemInstructions });
                const stream = model.promptStreaming(userPrompt);
                for await (const chunk of stream) { result = chunk; }
            } else {
                return `<div class="alert alert-error">AI not capable.</div><pre>${escapeHtml(text)}</pre>`;
            }

            result = result.trim().replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
            return result;
        } catch (error) {
            console.error("Image AI Error:", error);
            showToast("Image AI failed", 'error');
            return `<div class="raw-text">${escapeHtml(text)}</div>`;
        }
    }

    // 3. TEXT AI Engine (Simple)
    // 3. TEXT AI Engine (Optimized - Parity with PDF Engine)
    async function restructureTextWithAI(text) {
        try {
            let result = '';
            // System Prompt: Shared "Frontend Developer" persona (Copied from PDF Engine for consistency)
            const systemInstructions =
                "You are an expert Frontend Developer. Convert raw text into **Semantic HTML**.\n\n" +
                "**RULES**:\n" +
                "1. **HTML BODY ONLY**: Output tags like <section>, <h2>, <p>, <table>. NO <html>/<body> tags.\n" +
                "2. **CODE & COMMANDS (CRITICAL)**: You MUST detect code, terminal commands, file paths, or scripts. **Wrap them in <div class='code-block'>**.\n" +
                "   - Example: 'Run npm install' -> 'Run <div class='code-block'>npm install</div>'\n" +
                "   - Example: 'Check /etc/hosts' -> 'Check <div class='code-block'>/etc/hosts</div>'\n" +
                "   - Example: 'C:\\Windows\\System32' -> '<div class='code-block'>C:\\Windows\\System32</div>'\n" +
                "3. **STRUCTURE**:\n" +
                "   - Use <h2> for main section titles.\n" +
                "   - Use <div class='highlight-box'> for summaries/important notes.\n" +
                "   - Use <table class='data-table'> for structured data.\n" +
                "4. **LISTS**: Ensure <ul>/<ol> are valid. Fix broken numbering.\n";

            const userPrompt = `
            Context: User Text Note / Raw Input.
            Task: Create a beautiful, professional HTML document from this. Ensure ALL commands and paths are wrapped in code blocks.
            
            Raw Text:
            ${text}
            `;

            if (typeof window.LanguageModel !== 'undefined') {
                const session = await window.LanguageModel.create({ systemPrompt: systemInstructions });
                const fullPrompt = `${systemInstructions}\n\n${userPrompt}`;
                const stream = await session.promptStreaming(fullPrompt);
                for await (const chunk of stream) { result += chunk; }
                if (session.destroy) session.destroy();
            } else if (window.ai && window.ai.languageModel) {
                const model = await window.ai.languageModel.create({ systemPrompt: systemInstructions });
                const stream = model.promptStreaming(userPrompt);
                for await (const chunk of stream) { result = chunk; }
            } else {
                return `<div class="alert alert-error">AI not capable.</div><pre>${escapeHtml(text)}</pre>`;
            }

            result = result.trim().replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
            return result;
        } catch (error) {
            console.error("Text AI Error:", error);
            return `<div class="raw-text">${escapeHtml(text)}</div>`;
        }
    }

    // --- Markdown Parser ---
    // --- Markdown Parser REMOVED (Replaced by Direct HTML Generation) ---

    // --- Text to HTML ---
    const textInput = document.getElementById('textInput');
    const textConvertBtn = document.getElementById('textConvertBtn');

    textInput.addEventListener('input', () => {
        textConvertBtn.disabled = !textInput.value.trim();
    });

    textConvertBtn.addEventListener('click', async () => {
        const content = textInput.value;
        if (!content) return;

        const useAi = document.querySelector('input[name="textMode"][value="ai"]').checked;
        const btnText = useAi ? 'Structuring with AI...' : 'Generating HTML...';

        setLoading(textConvertBtn, true, 'Convert & Download', btnText);

        try {
            let htmlBody = '';

            if (useAi) {
                // AI Mode
                const structuredHtml = await restructureTextWithAI(content);
                htmlBody = `
                    <div class="document-content">
                        ${structuredHtml}
                    </div>
                `;
            } else {
                // Direct Mode
                const cleanText = escapeHtml(content);
                htmlBody = `
                    <div class="raw-document" style="white-space: pre-wrap; font-family: 'Inter', sans-serif; font-size: 1rem; color: #374151; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        ${cleanText}
                    </div>
                `;
            }

            const htmlContent = createHtmlTemplate('Text Note', htmlBody);
            downloadFile(htmlContent, 'note.html', 'text/html');
            showToast('Note created successfully');

        } catch (err) {
            console.error(err);
            showToast('Failed to create note', 'error');
        } finally {
            setLoading(textConvertBtn, false);
        }
    });

    // --- Screen Capture (Direct - No Crop) ---
    const screenCaptureBtn = document.getElementById('screenCaptureBtn');

    if (screenCaptureBtn) {
        screenCaptureBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                // 1. Capture Visible Tab immediately (with Timeout Race)
                const capturePromise = chrome.tabs.captureVisibleTab(null, { format: "png" });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Capture timed out. Page might be restricted.")), 2000)
                );

                const dataUrl = await Promise.race([capturePromise, timeoutPromise]);

                if (chrome.runtime.lastError) {
                    throw new Error(chrome.runtime.lastError.message);
                }
                if (!dataUrl) {
                    throw new Error("Captured image is empty.");
                }
                console.log("Screen captured successfully.");

                // 2. Convert DataURL to File/Blob for processing
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], "screenshot.png", { type: "image/png" });

                // 3. Pass directly to Image Handler
                handleImageFile(file);
                showToast("Captured", "success");

            } catch (err) {
                console.error("Capture failed:", err);
                showToast('Capture failed: ' + err.message, 'error');
            }
        });
    }

    // --- End Screen Capture ---

    // --- Image to HTML (OCR + AI) ---
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imageConvertBtn = document.getElementById('imageConvertBtn');
    let currentImageBase64 = null;
    let currentImageFile = null;
    let currentImageName = 'image';

    document.getElementById('imageDropZone').addEventListener('change', (e) => handleImageFile(e.target.files[0]));
    setupDragDrop('imageDropZone', handleImageFile);

    function handleImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Please upload an image file', 'error');
            return;
        }
        currentImageFile = file;
        currentImageName = file.name.split('.')[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageBase64 = e.target.result;
            imagePreview.src = currentImageBase64;
            imagePreviewContainer.classList.remove('hidden');
            imageConvertBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    imageConvertBtn.addEventListener('click', async () => {
        if (!currentImageFile) return;

        const useAi = document.querySelector('input[name="imageMode"][value="ai"]').checked;
        const btnText = useAi ? 'Analyzing with AI...' : 'Formatting...';

        setLoading(imageConvertBtn, true, 'Convert & Download', 'Extracting Text (OCR)...');

        try {
            // 1. OCR (Always needed)
            // Fix: Disable Blob URL (CSP issue) and force standard Worker with explicit Core path
            const worker = await Tesseract.createWorker('eng', 1, {
                workerBlobURL: false,
                workerPath: chrome.runtime.getURL('features/htmlcon/lib/worker.min.js'),
                corePath: chrome.runtime.getURL('features/htmlcon/lib/tesseract-core.wasm.js'),
                langPath: chrome.runtime.getURL('features/htmlcon/lib/'),
                langPath: chrome.runtime.getURL('features/htmlcon/lib/'),
                gzip: false,
                logger: m => console.log(m),
                errorHandler: e => console.error('Tesseract Error:', e)
            });
            console.log("Worker created. Starting recognition...");
            const ret = await worker.recognize(currentImageFile);
            console.log("Recognition complete.");
            const ocrText = ret.data.text;
            await worker.terminate();

            if (!ocrText.trim()) {
                showToast('No text found in image', 'error');
                setLoading(imageConvertBtn, false);
                return;
            }

            let htmlBody = '';

            if (useAi) {
                // 2A. AI Mode (HTML-First)
                setLoading(imageConvertBtn, true, 'Convert & Download', btnText);
                const structuredHtml = await restructureImageWithAI(ocrText);

                // --- NEW LAYOUT: Document (Left) + Source (Right) + Lightbox ---
                htmlBody = `
                    <div class="layout-wrapper">
                        <!-- Main Document Card -->
                        <div class="document-card">
                            <h1>${currentImageName}</h1>
                            ${structuredHtml}
                        </div>

                        <!-- Side Panel (Source Image) -->
                        <div class="side-panel">
                            <div class="sticky-wrapper">
                                <p class="panel-label">SOURCE IMAGE</p>
                                <div class="image-preview-card" onclick="openModal()">
                                    <div class="img-wrapper">
                                        <img src="${currentImageBase64}" alt="Source" class="preview-img">
                                    </div>
                                    <div class="overlay">
                                        <button class="view-btn">
                                            <span class="icon">🔍</span> View Original
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Lightbox Modal -->
                    <div id="imageModal" class="modal" onclick="if(event.target === this) closeModal()">
                        <span class="close" onclick="closeModal()">&times;</span>
                        <img class="modal-content" id="fullImage" src="${currentImageBase64}">
                        <div id="caption">${currentImageName}</div>
                    </div>

                    <script>
                        function openModal() {
                            document.getElementById('imageModal').style.display = "block";
                            document.body.style.overflow = "hidden"; // Prevent scrolling
                        }
                        function closeModal() {
                            document.getElementById('imageModal').style.display = "none";
                            document.body.style.overflow = "auto";
                        }
                        // Close on Escape key
                        document.addEventListener('keydown', function(event) {
                            if (event.key === "Escape") closeModal();
                        });
                    </script>
                `;
            } else {
                // 2B. Direct Mode (Legacy but wrapped in new layout for consistency)
                setLoading(imageConvertBtn, true, 'Convert & Download', 'Generating HTML...');
                const cleanText = escapeHtml(ocrText);
                htmlBody = `
                    <div class="layout-wrapper">
                        <div class="document-card">
                            <h1>${currentImageName}</h1>
                            <div class="raw-document" style="white-space: pre-wrap;">${cleanText}</div>
                        </div>
                        <div class="side-panel">
                             <div class="sticky-wrapper">
                                <p class="panel-label">Source Image</p>
                                <div class="image-preview-card" onclick="openModal()">
                                    <img src="${currentImageBase64}" class="preview-img">
                                </div>
                             </div>
                        </div>
                    </div>
                     <!-- Lightbox Modal (Same as above) -->
                     <div id="imageModal" class="modal" onclick="if(event.target === this) closeModal()">
                        <span class="close" onclick="closeModal()">&times;</span>
                        <img class="modal-content" id="fullImage" src="${currentImageBase64}">
                     </div>
                     <script>
                        function openModal() { document.getElementById('imageModal').style.display = "block"; }
                        function closeModal() { document.getElementById('imageModal').style.display = "none"; }
                     </script>
                `;
            }

            // 3. Generate HTML with Custom CSS
            const extraCss = `
                /* Layout Grid */
                .layout-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 40px;
                    width: 100%;
                    max-width: 1400px; /* Wider canvas */
                    margin: 0 auto;
                }
                
                /* Left: Document Card */
                .document-card {
                    flex: 2;
                    background: white;
                    padding: 50px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    min-height: 80vh;
                }

                /* Right: Side Panel */
                .side-panel {
                    flex: 1;
                    min-width: 300px;
                }
                .sticky-wrapper {
                    position: sticky;
                    top: 40px;
                }
                .panel-label {
                    font-weight: 700;
                    color: #6fbcf0; /* Light Blue Text */
                    margin-bottom: 20px;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
                .image-preview-card {
                    background: #f8fafc;
                    padding: 8px;
                    border-radius: 16px; /* Larger radius */
                    box-shadow: 0 10px 30px -5px rgba(0,0,0,0.15);
                    cursor: pointer;
                    position: relative;
                    transition: all 0.3s ease;
                    border: 1px solid #fff;
                    overflow: hidden;
                }
                .image-preview-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -5px rgba(0,0,0,0.2); }
                .img-wrapper {
                    border-radius: 12px;
                    overflow: hidden;
                    position: relative;
                }
                .preview-img { width: 100%; display: block; filter: brightness(0.95); transition: 0.3s; }
                .image-preview-card:hover .preview-img { filter: brightness(0.6) blur(2px); transform: scale(1.05); }

                /* Glassmorphism Overlay Button */
                .overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .image-preview-card:hover .overlay { opacity: 1; }
                
                .view-btn {
                    background: rgba(255, 255, 255, 0.25);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    color: white;
                    font-weight: 600;
                    padding: 10px 24px;
                    border-radius: 50px;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    cursor: pointer;
                }
                .view-btn .icon { font-size: 1.1em; }

                /* Desktop Split */
                @media (min-width: 1024px) {
                    .layout-wrapper { flex-direction: row; align-items: flex-start; }
                }

                /* Lightbox Modal (Google Drive Style) */
                .modal {
                    display: none;
                    position: fixed;
                    z-index: 1000;
                    left: 0; top: 0;
                    width: 100%; height: 100%;
                    overflow: auto;
                    background-color: rgba(0,0,0,0.9);
                    backdrop-filter: blur(5px);
                    animation: fadeIn 0.2s;
                }
                @keyframes fadeIn { from {opacity: 0} to {opacity: 1} }
                
                .modal-content {
                    margin: auto;
                    display: block;
                    max-width: 90%;
                    max-height: 90vh;
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 50px rgba(0,0,0,0.5);
                    border-radius: 4px;
                }
                .close {
                    position: absolute;
                    top: 20px;
                    right: 35px;
                    color: #f1f1f1;
                    font-size: 40px;
                    font-weight: bold;
                    transition: 0.3s;
                    cursor: pointer;
                    z-index: 1001;
                }
                .close:hover, .close:focus { color: #bbb; text-decoration: none; cursor: pointer; }
                #caption {
                    margin: auto;
                    display: block;
                    width: 80%;
                    text-align: center;
                    color: #ccc;
                    padding: 10px 0;
                    position: absolute;
                    bottom: 20px; left: 50%;
                    transform: translateX(-50%);
                }
            `;

            // Call with strict FALSE to disable default container wrapping
            const htmlContent = createHtmlTemplate(currentImageName, htmlBody, extraCss, false);
            downloadFile(htmlContent, `${currentImageName}.html`, 'text/html');
            showToast('Image processed successfully');

        } catch (err) {
            console.error(err);
            const msg = (err && err.message) ? err.message : String(err);
            showToast('Failed to process image: ' + msg, 'error');
        } finally {
            setLoading(imageConvertBtn, false);
        }
    });


    // --- PDF to HTML (Extraction + AI) ---
    const pdfInput = document.getElementById('pdfInput');
    const pdfFileName = document.getElementById('pdfFileName');
    const pdfConvertBtn = document.getElementById('pdfConvertBtn');
    let currentPdfData = null; // ArrayBuffer for PDF.js
    let currentPdfName = 'document';

    document.getElementById('pdfDropZone').addEventListener('change', (e) => handlePdfFile(e.target.files[0]));
    setupDragDrop('pdfDropZone', handlePdfFile);

    function handlePdfFile(file) {
        if (!file || file.type !== 'application/pdf') {
            showToast('Please upload a PDF file', 'error');
            return;
        }
        currentPdfName = file.name.split('.')[0];
        pdfFileName.textContent = `${file.name} (${formatBytes(file.size)})`;

        const reader = new FileReader();
        reader.onload = (e) => {
            currentPdfData = e.target.result; // ArrayBuffer
            pdfConvertBtn.disabled = false;
        };
        reader.readAsArrayBuffer(file);
    }

    pdfConvertBtn.addEventListener('click', async () => {
        if (!currentPdfData) return;

        const useAi = document.querySelector('input[name="pdfMode"][value="ai"]').checked;
        const btnText = useAi ? 'Organizing with AI...' : 'Formatting...';

        setLoading(pdfConvertBtn, true, 'Convert & Download', 'Extracting Text...');

        try {
            // 1. Extract Text using PDF.js
            const pdf = await pdfjsLib.getDocument({ data: currentPdfData }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                setLoading(pdfConvertBtn, true, 'Convert & Download', `Reading Page ${i}/${pdf.numPages}...`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                // Join with newline to preserve loose visual structure for AI
                const pageText = textContent.items.map(item => item.str).join('\n');
                fullText += `\n--- Page ${i} ---\n${pageText}`;
            }

            let htmlBody = '';

            if (useAi) {
                // 2A. AI Restructuring (Smart Mode)
                setLoading(pdfConvertBtn, true, 'Convert & Download', btnText);

                // Truncate if too long for simple prompt (basic safety)
                const truncatedText = fullText.length > 20000 ? fullText.substring(0, 20000) + '...[Truncated]' : fullText;

                const structuredHtml = await restructurePdfWithAI(truncatedText);

                htmlBody = `
                    <div class="document-content">
                        ${structuredHtml}
                    </div>
                `;
            } else {
                // 2B. Direct Conversion (Fast Mode)
                setLoading(pdfConvertBtn, true, 'Convert & Download', 'Generating HTML...');

                // Simple formatting: wrap lines in pre-wrap or paragraphs
                const cleanText = escapeHtml(fullText);
                htmlBody = `
                    <div class="raw-document" style="white-space: pre-wrap; font-family: 'Inter', sans-serif; font-size: 1rem; color: #374151; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        ${cleanText}
                    </div>
                `;
            }

            // 3. Generate HTML
            const htmlContent = createHtmlTemplate(currentPdfName, htmlBody);

            downloadFile(htmlContent, `${currentPdfName}.html`, 'text/html');
            showToast('PDF processed successfully');

        } catch (err) {
            console.error(err);
            showToast('Failed to process PDF', 'error');
        } finally {
            setLoading(pdfConvertBtn, false);
        }
    });


    // --- Utilities ---
    // (Kept same as before)
    function setupDragDrop(elementId, callback) {
        const dropZone = document.getElementById(elementId);
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });
        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            callback(dt.files[0]);
        }, false);
    }

    function createHtmlTemplate(title, bodyContent, extraCss = '', wrapInContainer = true) {
        // ... (Styles same as before)

        // Conditional Body Layout
        const bodyInner = wrapInContainer
            ? `<div class="container"><h1>${title}</h1>${bodyContent}</div>`
            : bodyContent; // Render raw content if custom layout is requested

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ReMind</title>
    <style>
        :root {
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            --color-bg: #f9fafb;
            --color-card: #ffffff;
            --color-text-main: #1f2937;
            --color-text-muted: #6b7280;
            --color-primary: #2563eb;
            --color-border: #e5e7eb;
        }
        body { 
            font-family: var(--font-sans); 
            padding: 40px 20px; 
            background-color: var(--color-bg); 
            color: var(--color-text-main);
            margin: 0; 
            min-height: 100vh; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            line-height: 1.6;
        }
        .container { 
            background: var(--color-card); 
            padding: 40px 60px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); 
            max-width: 900px; /* Wider for tables/split view */
            width: 100%; 
            box-sizing: border-box; 
            margin-bottom: 20px;
        }
        
        /* Typography & Semantics */
        h1 { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 1.5rem; border-bottom: 2px solid var(--color-border); padding-bottom: 1rem; color: #111827; }
        
        /* Auto-Styled H2 (Matches previous prompt's inline style) */
        h2 { 
            font-size: 1.5rem; 
            font-weight: 700; 
            color: #111827; 
            margin-top: 2rem; 
            margin-bottom: 1rem;
            border-bottom: 2px solid var(--color-border); 
            padding-bottom: 0.5rem;
        }
        
        h3 { font-size: 1.25rem; font-weight: 600; color: #374151; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        p { margin-bottom: 1.25rem; }
        
        /* Professional Tables */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 0.95em;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
            border-radius: 8px;
        }
        .data-table thead tr {
            background-color: var(--color-primary);
            color: #ffffff;
            text-align: left;
            font-weight: bold;
        }
        .data-table th, .data-table td {
            padding: 12px 15px;
            border-bottom: 1px solid var(--color-border);
        }
        .data-table tbody tr:nth-of-type(even) {
            background-color: #f3f4f6;
        }
        .data-table tbody tr:last-of-type {
            border-bottom: 2px solid var(--color-primary);
        }

        /* Highlight Boxes */
        .highlight-box {
            background-color: #eff6ff;
            border-left: 4px solid var(--color-primary);
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
            color: #1e40af;
        }

        /* Split View (for Images) */
        .split-view { display: flex; flex-direction: column; gap: 40px; }
        .text-container { flex: 1; }
        .image-container { flex: 0 0 300px; text-align: center; }
        .embedded-image { max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        
        @media (min-width: 768px) {
            .split-view { flex-direction: row; align-items: flex-start; }
            .image-container { position: sticky; top: 20px; order: 2; }
            .text-container { order: 1; }
        }

        /* Lists */
        ul, ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
        li { margin-bottom: 0.5rem; }

        /* Code & Terminal Blocks - Matched to User Screenshot */
        .code-block {
            background-color: #0f172a; /* Slate 900 - Terminal Dark */
            color: #f8fafc; /* Slate 50 */
            padding: 1.25rem 1.5rem;
            border-radius: 8px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
            margin: 1.5rem 0;
            overflow-x: auto;
            border: 1px solid #1e293b;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4); /* Stronger shadow */
            white-space: pre-wrap;
            line-height: 1.5;
        }
        pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; font-family: var(--font-mono); font-size: 0.9em; margin: 1.5rem 0; }
        code { font-family: var(--font-mono); background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; color: #db2777; }
        .code-block code { background: transparent; color: inherit; padding: 0; }
        pre code { background: transparent; color: inherit; padding: 0; }

        /* Blockquotes */
        blockquote { border-left: 4px solid var(--color-primary); padding-left: 1rem; margin: 1.5rem 0; font-style: italic; color: var(--color-text-muted); background: #eff6ff; padding: 1rem; border-radius: 4px; }

        /* Horizontal Rule */
        hr { border: 0; border-top: 1px solid var(--color-border); margin: 2rem 0; }
        
        ${extraCss}
    </style>
</head>
<body>
    ${bodyInner}
    <footer>
        Generated with ReMind • Local & Private
    </footer>
</body>
</html>`;
    }

    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals < 0 ? 0 : decimals))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
    }

    function downloadFile(content, filename, type) {
        const file = new Blob([content], { type: type });
        const a = document.createElement("a");
        const url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 0);
    }
});

