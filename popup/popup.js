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
  downloadSection.style.display = 'none';
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
    } else if (availability === 'after-download' || availability === 'downloadable' || availability === 'downloading') {
      statusText.innerHTML = (availability === 'downloading')
        ? "Resuming download...<br><span style='font-size:11px; opacity:0.8'>Monitor in TraceBack or chrome://components</span>"
        : "Auto-starting...<br><span style='font-size:11px; opacity:0.8'>Monitor in TraceBack or chrome://components</span>";

      statusText.style.color = "#d39e00";
      statusIcon.textContent = "⏬";
      statusText.style.lineHeight = "1.2"; // Adjust line height for multiline

      // Auto-Start Download & Tracking (User Request)
      downloadSection.style.display = 'block';
      startDownload(tab.id);

    } else if (availability === 'no' || availability === 'unavailable') {
      statusText.textContent = "AI Unavailable. Check Setup Guide & Flags."; // Error
      statusText.style.color = "#dc3545";
      statusIcon.textContent = "❌";
    } else if (typeof availability === 'string' && availability.startsWith('error::')) {
      statusText.textContent = "Check Failed: " + availability.split('::')[1];
      statusText.style.color = "#dc3545";
      statusIcon.textContent = "⚠️";
    } else if (availability === 'not-found') {
      statusText.textContent = "AI APIs not found. Check Setup Guide.";
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

async function startDownload(tabId) {
  const downloadBtn = document.getElementById('btn-ai-download');
  const progressBar = document.getElementById('ai-progress-bar');
  const progressContainer = document.querySelector('.progress-container');
  const progressText = document.getElementById('ai-progress-text');

  downloadBtn.style.display = 'none';
  progressContainer.style.display = 'block';
  progressText.textContent = "Initializing download...";

  // 1. Initialize tracking variable FIRST to ensure it exists
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    world: 'MAIN',
    func: () => { window.__reMindDownloadProgress = 0; }
  });

  // 2. Trigger Download (Async Fire-and-Forget)
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    world: 'MAIN',
    func: () => {
      console.log("[ReMind] Triggering download...");

      const monitorCallback = (m) => {
        m.addEventListener("downloadprogress", (e) => {
          console.log(`[ReMind] Progress: ${e.loaded}/${e.total}`);
          const loaded = e.loaded;
          const total = e.total;
          if (total > 0) {
            window.__reMindDownloadProgress = Math.round((loaded / total) * 100);
          }
        });
      };

      (async () => {
        try {
          // Check APIs again inside the main world context
          const useAi = window.ai && window.ai.languageModel;
          const useLegacy = window.LanguageModel;

          if (!useAi && !useLegacy) {
            throw new Error("AI APIs disappeared.");
          }

          console.log("[ReMind] Creating session with monitor...");

          let session;
          if (useAi) {
            // Modern API: capabilities() check suggested we are downloadable
            session = await window.ai.languageModel.create({ monitor: monitorCallback });
          } else {
            // Legacy API
            session = await window.LanguageModel.create({ monitor: monitorCallback });
          }

          console.log("[ReMind] Download logic finished (session created).");
          // If we reach here instantly without error, it might be started or done.
          // Wait a bit to see if progress updates, otherwise set to 100 if purely synchronous (unlikely for download)
          // But actually, 'create' waits for download to finish in some versions! 
          // If it waits, this line won't run until done. That's why we need to be async wrapper.
          // And we need the monitor to fire. 

          // Safety: If no progress event fired but create finished, assume 100%
          if (window.__reMindDownloadProgress === 0) {
            window.__reMindDownloadProgress = 100;
          }

        } catch (e) {
          console.error("[ReMind] Download FAILED inside page:", e);
          // Write error string to progress variable to notify popup
          window.__reMindDownloadProgress = 'ERROR::' + e.message;
        }
      })();
    }
  }).catch(err => {
    console.error("Failed to inject download script:", err);
    progressText.textContent = "Injection Failed. Reload page.";
  });

  // 3. Poll for updates
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: () => window.__reMindDownloadProgress
      });

      const progress = results[0]?.result;
      console.log("[ReMind] Polling:", progress);

      // Handle explicit errors from the page
      if (typeof progress === 'string' && progress.startsWith('ERROR::')) {
        clearInterval(interval);
        progressText.textContent = "Error: " + progress.split('::')[1];
        progressText.style.color = "#dc3545";
        return;
      }

      if (progress === undefined || progress === null) {
        if (attempts > 10) {
          progressText.textContent = "Waiting for start... (Is API enabled?)";
        }
        return;
      }

      if (progress === -1) {
        clearInterval(interval);
        progressText.textContent = "Download Failed. Check console.";
        progressText.style.color = "red";
      } else if (progress >= 100) {
        clearInterval(interval);
        progressBar.style.width = "100%";
        progressText.textContent = "Download Complete!";
        progressBar.style.backgroundColor = "#28a745";

        // Re-run check to update status to green
        setTimeout(() => document.getElementById('btn-ai-check').click(), 1500);
      } else {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Downloading... ${progress}%`;
      }
    } catch (e) {
      console.error("Polling error", e);
      // Don't clear immediately, network hiccups happen
    }
  }, 1000);
}
