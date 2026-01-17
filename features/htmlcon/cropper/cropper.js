
// features/htmlcon/cropper/cropper.js
(function () {
    if (window.hasRunCropper) return;
    window.hasRunCropper = true;

    // Create Overlay
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0', left: '0', width: '100%', height: '100%',
        zIndex: '999999',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        cursor: 'crosshair'
    });
    document.body.appendChild(overlay);

    // Selection Box
    const box = document.createElement('div');
    Object.assign(box.style, {
        position: 'absolute',
        border: '2px solid #2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        display: 'none',
        pointerEvents: 'none' // Let events pass to overlay
    });
    overlay.appendChild(box);

    // Tip
    const tip = document.createElement('div');
    tip.textContent = "Click & Drag to Select area. Release to Capture. Esc to Cancel.";
    Object.assign(tip.style, {
        position: 'fixed',
        top: '20px', left: '50%', transform: 'translateX(-50%)',
        padding: '10px 20px', background: 'rgba(0,0,0,0.8)', color: 'white',
        borderRadius: '20px', fontFamily: 'sans-serif', fontSize: '14px',
        pointerEvents: 'none'
    });
    overlay.appendChild(tip);

    let startX, startY;
    let isDragging = false;
    let rect = {};

    overlay.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        box.style.display = 'block';
        box.style.left = startX + 'px';
        box.style.top = startY + 'px';
        box.style.width = '0px';
        box.style.height = '0px';
    });

    overlay.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const currentX = e.clientX;
        const currentY = e.clientY;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(currentX, startX);
        const top = Math.min(currentY, startY);

        Object.assign(box.style, {
            left: left + 'px',
            top: top + 'px',
            width: width + 'px',
            height: height + 'px'
        });

        rect = { left, top, width, height };
    });

    overlay.addEventListener('mouseup', async () => {
        isDragging = false;

        if (rect.width > 5 && rect.height > 5) {
            // 1. Feedback
            tip.textContent = "✅ Captured! Open ReMind Extension.";
            tip.style.background = "#22c55e"; // Green
            box.style.display = 'none'; // Hide the selection box immediately

            // 2. Prepare Coordinates
            const dpr = window.devicePixelRatio || 1;
            const captureRect = {
                x: rect.left * dpr,
                y: rect.top * dpr,
                width: rect.width * dpr,
                height: rect.height * dpr
            };

            // 3. Send Capture message
            // We send the message immediately, but delay cleanup to show the "Captured!" tip.
            try {
                await chrome.runtime.sendMessage({
                    action: "CAPTURE_VISIBLE_TAB",
                    rect: captureRect
                });
            } catch (err) {
                console.error("Capture request failed:", err);
            }

            // 4. Wait 500ms before cleanup to show confirmation
            setTimeout(() => {
                cleanup();
            }, 500);

        } else {
            cleanup();
        }
    });

    // Cancel on Esc
    document.addEventListener('keydown', function escListener(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
    });

    function cleanup() {
        document.body.removeChild(overlay);
        window.hasRunCropper = false;
        // Notify popup (if open) or background
    }
})();

