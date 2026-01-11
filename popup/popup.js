

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
