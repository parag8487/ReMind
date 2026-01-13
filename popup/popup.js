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
