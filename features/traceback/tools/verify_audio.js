document.getElementById('rerunBtn').addEventListener('click', checkAudio);

async function checkAudio() {
    const el = document.getElementById('results');
    el.innerHTML = 'Checking...';

    try {
        // 1. Check API existence
        if (typeof window.LanguageModel === 'undefined') {
            if (typeof window.ai !== 'undefined' && window.ai.languageModel) {
                el.innerHTML = '<div class="warning">⚠️ window.LanguageModel is missing, but window.ai.languageModel exists. You might need to update your code to use the new standard.</div>';
                window.LanguageModel = window.ai.languageModel; // Polyfill for test
            } else {
                el.innerHTML = '<div class="error">❌ Prompt API not found (window.LanguageModel is undefined).</div>';
                return;
            }
        }

        // 2. Check Text availability
        const textAvail = await window.LanguageModel.availability({
            expectedInputs: [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }]
        });

        // 3. Check Audio availability
        let audioAvail = "error";
        try {
            audioAvail = await window.LanguageModel.availability({
                expectedInputs: [{ type: 'audio' }],
                expectedOutputs: [{ type: 'text', languages: ['en'] }]
            });
        } catch (e) {
            audioAvail = "Exception: " + e.message;
        }

        let html = `
            <div class="status ${textAvail === 'available' ? 'success' : 'warning'}">
                <strong>Text Capability:</strong> ${textAvail}
            </div>
            <div class="status ${audioAvail === 'available' ? 'success' : 'error'}">
                <strong>Audio Capability:</strong> ${audioAvail}
            </div>
        `;

        if (audioAvail !== 'available') {
            html += `
                <h3>Debug Info:</h3>
                <ul>
                    <li><strong>User Agent:</strong> ${navigator.userAgent}</li>
                    <li><strong>Epoch:</strong> ${Date.now()}</li>
                </ul>
                <h3>Troubleshooting:</h3>
                <ol>
                    <li>Ensure Token in manifest matches Extension ID in chrome://extensions</li>
                    <li>Ensure "Optimization Guide On Device Model" is installed in chrome://components</li>
                    <li><strong>Restart Chrome completely</strong> (Close all windows)</li>
                </ol>
            `;
        } else {
            html += '<div class="success">✅ Audio Model is READY! Transcription should work.</div>';
        }

        el.innerHTML = html;

    } catch (err) {
        el.innerHTML = `<div class="error">❌ Unexpected Error: ${err.message}</div>`;
    }
}

// Auto-run on load
checkAudio();
