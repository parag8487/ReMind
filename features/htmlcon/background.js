
// features/htmlcon/background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'CAPTURE_VISIBLE_TAB') {
        handleCapture(message.rect);
        return true; // async
    }
});

async function handleCapture(rect) {
    try {
        // 1. Capture the Visible Tab
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

        // 2. Load into Bitmap for cropping (Service Worker compatible)
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        // 3. Crop using OffscreenCanvas
        const { x, y, width, height } = rect;
        // Ensure valid dimensions
        if (width <= 0 || height <= 0) return;

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
        ctx.drawImage(bitmap, x, y, width, height, 0, 0, width, height);

        // 4. Convert back to Blob/Base64
        const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
        const reader = new FileReader();
        reader.readAsDataURL(croppedBlob);
        reader.onloadend = () => {
            const base64data = reader.result;

            // 5. Save to Storage for Popup
            chrome.storage.local.set({
                pendingScreenshot: {
                    data: base64data,
                    timestamp: Date.now()
                }
            }, () => {
                // Notify User
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'assets/icon128.png',
                    title: 'Screenshot Captured',
                    message: 'Open the ReMind extension to edit & convert.'
                });
            });
        };

    } catch (err) {
        console.error('Capture failed:', err);
    }
}
