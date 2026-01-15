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

  // Show the result box immediately
  resultBox.style.display = 'flex';
  statusText.textContent = "Checking capabilities...";
  statusIcon.textContent = "⏳";
  statusText.style.color = "#586069";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let availability = 'no';
    let source = 'main-world';

    try {
      // 1. Try INJECT CHECK into Main World
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: async () => {
          try {
            // Attempt 1: Modern `window.ai`
            if (window.ai && window.ai.languageModel) {
              const capabilities = await window.ai.languageModel.capabilities();
              return capabilities.available;
            }
            // Attempt 2: Legacy `window.LanguageModel`
            if (window.LanguageModel) {
              return await window.LanguageModel.availability();
            }
            return 'not-found';
          } catch (e) {
            return 'error::' + e.message;
          }
        }
      });
      availability = results[0]?.result;

    } catch (injectionError) {
      console.warn("[ReMind] Script injection failed, checking popup context.", injectionError);
      source = 'popup-context';

      // 2. Fallback: Check LOCALLY in Popup
      try {
        if (window.ai && window.ai.languageModel) {
          const capabilities = await window.ai.languageModel.capabilities();
          availability = capabilities.available;
        } else if (window.LanguageModel) {
          availability = await window.LanguageModel.availability();
        } else {
          availability = 'not-found';
        }
      } catch (localError) {
        availability = 'error::' + localError.message;
      }
    }

    // 3. PROCESS RESULTS
    console.log(`[ReMind] Availability (${source}):`, availability);

    if (availability === 'readily' || availability === 'available') {
      statusText.textContent = "AI is active and ready!"; // Success
      statusText.style.color = "#28a745";
      statusIcon.textContent = "✅";
    } else if (availability === 'after-download') {
      statusText.textContent = "Model downloading... Please wait."; // Warning
      statusText.style.color = "#d39e00";
      statusIcon.textContent = "⬇️";
    } else if (availability === 'no') {
      statusText.textContent = "AI not enabled."; // Error
      statusText.style.color = "#dc3545";
      statusIcon.textContent = "❌";
    } else if (typeof availability === 'string' && availability.startsWith('error::')) {
      statusText.textContent = "Check Failed: " + availability.split('::')[1];
      statusText.style.color = "#dc3545";
      statusIcon.textContent = "⚠️";
    } else if (availability === 'not-found') {
      statusText.textContent = "AI APIs not found.";
      statusText.style.color = "#dc3545";
      statusIcon.textContent = "❌";
    } else {
      statusText.textContent = `Status: "${availability}"`;
      statusText.style.color = "#d39e00";
      statusIcon.textContent = "❓";
    }

  } catch (criticalError) {
    console.error("AI Check Critical Failure:", criticalError);
    statusText.textContent = "Check failed completely.";
    statusText.style.color = "#dc3545";
    statusIcon.textContent = "🚫";
  }
});
