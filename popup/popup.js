document.addEventListener('DOMContentLoaded', async () => {
  // Check ReZone status
  await updateReZoneStatus();
});

async function updateReZoneStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if MindLoop is active on current tab and get session info
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Check if ReZone content script is loaded and get session info
        const isLoaded = window.reZoneLoaded === true;
        const sessionStart = sessionStorage.getItem('rezone_drift_start') ? parseInt(sessionStorage.getItem('rezone_drift_start')) : (window.sessionStartTime || Date.now());

        const sessionMinutes = Math.floor((Date.now() - sessionStart) / 60000);

        return {
          isActive: isLoaded,
          sessionMinutes: sessionMinutes
        };
      }
    });

    const result = results[0]?.result;
    const statusBadge = document.getElementById('rezoneStatus');
    const sessionPreview = document.getElementById('sessionPreview');
    const sessionInfo = document.getElementById('sessionInfo');

    if (statusBadge && result) {
      if (result.isActive) {
        statusBadge.classList.add('active');
        statusBadge.style.color = '#28a745';
        statusBadge.title = 'ReZone is active on this page';

        if (sessionPreview && sessionInfo) {
          sessionPreview.style.display = 'block';
          sessionInfo.textContent = `📚 Active session • ${result.sessionMinutes} mins`;
        }
      } else {
        statusBadge.classList.remove('active');
        statusBadge.style.color = '#6c757d';
        statusBadge.title = 'ReZone is ready but not active on this page';

        if (sessionPreview) {
          sessionPreview.style.display = 'none';
        }
      }
    }
  } catch (error) {
    console.log('Could not check ReZone status:', error);
    const statusBadge = document.getElementById('rezoneStatus');
    const sessionPreview = document.getElementById('sessionPreview');

    if (statusBadge) {
      statusBadge.classList.remove('active');
      statusBadge.style.color = '#dc3545';
      statusBadge.title = 'ReZone status unknown';
    }

    if (sessionPreview) {
      sessionPreview.style.display = 'none';
    }
  }
}

document.getElementById('btn-adaptive').addEventListener('click', () => {
  // Navigate to Adaptive Focus popup
  window.location.href = '../features/adaptivefocus/popup/popup.html';
});

document.getElementById('btn-rezone').addEventListener('click', () => {
  // Navigate to ReZone popup
  window.location.href = '../features/rezone/popup.html';
});

document.getElementById('btn-traceback').addEventListener('click', async () => {
  // Open TraceBack Side Panel
  const windowId = (await chrome.windows.getCurrent()).id;

  // Side panel requires a user action, which this click is.
  // We use open() to show it.
  try {
    await chrome.sidePanel.open({ windowId });
    window.close(); // Close the popup since side panel is opening
  } catch (err) {
    console.error("Failed to open side panel", err);
  }
});

document.getElementById('btn-htmlcon').addEventListener('click', () => {
  // Navigate to HTML Converter popup
  window.location.href = '../features/htmlcon/popup/popup.html';
});

document.getElementById('btn-ai-check').addEventListener('click', async () => {
  const resultBox = document.getElementById('ai-result-box');
  const statusText = document.getElementById('ai-status-text');
  const statusIcon = document.getElementById('ai-status-icon');
  const downloadSection = document.getElementById('ai-download-section');

  // Reset UI
  resultBox.style.display = 'flex';
  if (downloadSection) downloadSection.style.display = 'none';
  statusText.textContent = "Checking capabilities...";
  statusIcon.textContent = "⏳";
  statusText.style.color = "#586069";

  try {
    let availability = 'no';

    // Check LOCALLY in Popup first (more reliable for extension APIs)
    try {
      if (window.ai && window.ai.languageModel) {
        const capabilities = await window.ai.languageModel.capabilities();
        availability = capabilities.available;
      } else if (window.LanguageModel) {
        availability = await window.LanguageModel.availability();
      } else {
        availability = 'no';
      }
    } catch (e) {
      console.warn("Local check failed:", e);
      availability = 'error';
    }

    // PROCESS RESULTS
    console.log(`[ReMind] Availability:`, availability);

    if (availability === 'readily' || availability === 'available') {
      statusText.textContent = "AI is active and ready!"; // Success
      statusText.style.color = "#28a745";
      statusIcon.textContent = "✅";
    } else if (availability === 'after-download' || availability === 'downloadable') {
      statusText.innerHTML = "Model Downloadable.<br><span style='font-size:11px; opacity:0.8'>Go to TraceBack to download.</span>";
      statusText.style.color = "#d39e00";
      statusIcon.textContent = "⬇️";
      statusText.style.lineHeight = "1.2";
    } else if (availability === 'downloading') {
      statusText.innerHTML = "Downloading...<br><span style='font-size:11px; opacity:0.8'>Check TraceBack or chrome://components</span>";
      statusText.style.color = "#17a2b8";
      statusIcon.textContent = "⏳";
    } else {
      // Unavailable or 'no'
      statusIcon.textContent = "❌";
      statusText.style.color = "#dc3545";
      statusText.innerHTML = `
        AI Unavailable.<br>
        <div style="margin-top:8px; text-align:left; font-size:11px; color:#586069;">
          Enable these flags:
          <a href="#" class="flag-link" data-url="chrome://flags/#optimization-guide-on-device-model">1. Optimization Guide</a>
          <a href="#" class="flag-link" data-url="chrome://flags/#prompt-api-for-gemini-nano">2. Prompt API</a>
          <a href="#" class="flag-link" data-url="chrome://flags/#prompt-api-for-gemini-nano-multimodal-input">3. Prompt API (Multimodal)</a>
          <span style="display:block; margin-top:4px; font-style:italic;">Click to open. Set all to "Enabled".</span>
        </div>
      `;

      // Add event listeners for the links
      setTimeout(() => {
        document.querySelectorAll('.flag-link').forEach(link => {
          link.style.display = 'block';
          link.style.color = '#0366d6';
          link.style.marginBottom = '4px';
          link.style.textDecoration = 'none';
          link.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: link.dataset.url });
          });
        });
      }, 100);
    }

  } catch (criticalError) {
    console.error("AI Check Critical Failure:", criticalError);
    statusText.textContent = "Check failed completely.";
    statusText.style.color = "#dc3545";
    statusIcon.textContent = "🚫";
  }
});


