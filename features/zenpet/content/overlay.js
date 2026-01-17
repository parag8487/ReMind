"use strict";
(() => {
  const TAG = '[ZenPetOverlay]';
  const HOST_ID = 'zenpet-overlay';
  const POS_KEY = 'zenpet-overlay-pos';

  const existing = document.getElementById(HOST_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = `position:fixed;right:20px;bottom:20px;width:120px;height:120px;z-index:2147483647;pointer-events:auto;background:transparent;`;

  try {
    const saved = localStorage.getItem(POS_KEY);
    if (saved) {
      const { x, y } = JSON.parse(saved);
      host.style.left = `${x}px`;
      host.style.top = `${y}px`;
      host.style.right = 'auto';
      host.style.bottom = 'auto';
    }
  } catch (e) { }

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial}*{box-sizing:border-box}
    .wrap{position:relative;width:100%;height:100%}
    .pet{position:absolute;inset:auto 0 0 0;margin:auto;width:100%;height:auto;cursor:grab;user-select:none;-webkit-user-drag:none;filter:drop-shadow(0 8px 18px rgba(0,0,0,0.25));transition:transform .12s ease;touch-action:none;transform-origin:bottom center;animation:rock 3s ease-in-out infinite}
    .pet:active{transform:translateY(1px) scale(0.99);cursor:grabbing}
    @keyframes rock{0%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}100%{transform:rotate(-2deg)}}
    .bubble{position:absolute;bottom:110%;left:50%;transform:translateX(-50%) scale(0.95);min-width:320px;max-width:420px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;box-shadow:0 20px 60px rgba(102,126,234,0.4),0 0 0 1px rgba(255,255,255,0.1) inset;padding:0;display:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;opacity:0;transition:opacity .2s,transform .2s}
    .bubble[data-open="true"]{display:block;opacity:1;transform:translateX(-50%) scale(1)}
    .bubble::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:10px solid transparent;border-top-color:#764ba2}
    .bubble-header{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:space-between}
    .title{font-weight:600;font-size:15px;margin:0;display:flex;align-items:center;gap:8px}
    .title::before{content:'✨';font-size:18px}
    .close{border:none;background:rgba(255,255,255,0.15);width:28px;height:28px;border-radius:50%;font-size:18px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:all .2s;padding:0}
    .close:hover{background:rgba(255,255,255,0.25);transform:rotate(90deg)}
    .bubble-body{padding:20px;position:relative}
    .hint{font-size:12px;opacity:0.85;line-height:1.4;background:rgba(255,255,255,0.1);padding:10px 12px;border-radius:8px;text-align:center;margin-bottom:16px}
    .summarize-btn{width:100%;padding:12px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);color:#667eea;cursor:pointer;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;box-shadow:0 4px 12px rgba(0,0,0,0.1);margin-bottom:12px}
    .summarize-btn:hover:not(:disabled){background:#fff;transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.15)}
    .summarize-btn:active:not(:disabled){transform:translateY(0)}
    .summarize-btn:disabled{pointer-events:none;opacity:0.6}
    .summarize-icon{font-size:18px}
    .action-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
    .action-btn{padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);color:#667eea;cursor:pointer;font-size:14px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all .2s;box-shadow:0 4px 12px rgba(0,0,0,0.1)}
    .action-btn:hover:not(:disabled){background:#fff;transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.15)}
    .action-btn:active:not(:disabled){transform:translateY(0)}
    .action-btn:disabled{pointer-events:none;opacity:0.6}
    .action-icon{font-size:20px}
    .result-container{display:none;margin-top:16px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)}
    .result-container.show{display:block}
    .result-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(102,126,234,0.1);border-bottom:1px solid rgba(102,126,234,0.1)}
    .result-title{font-size:13px;font-weight:600;color:#667eea;margin:0}
    .copy-btn{border:none;background:rgba(102,126,234,0.1);color:#667eea;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .2s}
    .copy-btn:hover{background:rgba(102,126,234,0.2)}
    .copy-btn:active{transform:scale(0.95)}
    .result-content{padding:16px;max-height:200px;overflow-y:auto;font-size:13px;line-height:1.8;color:#333;white-space:pre-wrap;word-wrap:break-word}
    .result-content::-webkit-scrollbar{width:6px}
    .result-content::-webkit-scrollbar-track{background:rgba(0,0,0,0.05);border-radius:3px}
    .result-content::-webkit-scrollbar-thumb{background:rgba(102,126,234,0.3);border-radius:3px}
    .result-content::-webkit-scrollbar-thumb:hover{background:rgba(102,126,234,0.5)}
    .status{position:absolute;top:-40px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s;z-index:1000}
    .status.show{opacity:1}
    @keyframes spin{to{transform:rotate(360deg)}}
  `;
  shadow.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  shadow.appendChild(wrap);

  const img = document.createElement('img');
  img.className = 'pet';
  img.alt = 'ZenPet';
  img.src = chrome.runtime.getURL('features/zenpet/assets/zenpet_neutral.png');
  wrap.appendChild(img);

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = `
    <div class="bubble-header">
      <div class="title">AI Assistant</div>
      <button class="close" title="Close">×</button>
    </div>
    <div class="bubble-body">
      <div class="hint">Copy text or click Summarize for page summary</div>
      <button class="summarize-btn" data-mode="summarize">
        <span class="summarize-icon">📄</span>
        <span>Summarize Page</span>
      </button>
      <div class="action-grid">
        <button class="action-btn" data-mode="proofread">
          <span class="action-icon">📝</span>
          <span>Proofread</span>
        </button>
        <button class="action-btn" data-mode="rewrite">
          <span class="action-icon">✍️</span>
          <span>Rewrite</span>
        </button>
      </div>
      <div class="result-container">
        <div class="result-header">
          <div class="result-title">Result</div>
          <button class="copy-btn">
            <span>📋</span>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <div class="result-content"></div>
      </div>
    </div>
    <div class="status"></div>
  `;
  wrap.appendChild(bubble);

  const statusEl = bubble.querySelector('.status');
  const closeBtn = bubble.querySelector('.close');
  const resultContainer = bubble.querySelector('.result-container');
  const resultContent = bubble.querySelector('.result-content');
  const resultTitle = bubble.querySelector('.result-title');
  const copyBtn = bubble.querySelector('.copy-btn');
  const copyText = copyBtn.querySelector('.copy-text');
  const summarizeBtn = bubble.querySelector('.summarize-btn');
  const actionButtons = bubble.querySelectorAll('.action-btn');

  let currentResult = '';
  let isProcessing = false;

  function showStatus(msg, ms = 2000) {
    statusEl.textContent = msg;
    statusEl.classList.add('show');
    setTimeout(() => statusEl.classList.remove('show'), ms);
  }

  function setProcessing(processing) {
    isProcessing = processing;
    summarizeBtn.disabled = processing;
    actionButtons.forEach(btn => btn.disabled = processing);
  }

  function showResult(text, mode) {
    let rawText = text.trim();

    // Enhanced mini-markdown renderer with better formatting preservation
    function render(str) {
      // Split the text into paragraphs first
      const paragraphs = str.split(/\n\n+/);
      
      return paragraphs
        .map(paragraph => {
          let p = paragraph.replace(/\n/g, '<br>'); // Convert single newlines to <br>
          
          // Handle headings
          p = p.replace(/^#{1,6}\s+(.*)/, '<h4 style="margin:0 0 12px 0; color:#667eea; border-bottom:1px solid rgba(102,126,234,0.1); padding-bottom:6px; font-size:15px; font-weight:700;">$1</h4>');
          
          // Handle bold text
          p = p.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#000; font-weight:700;">$1</strong>');
          
          // Handle italic text
          p = p.replace(/\*(.*?)\*/g, '<em style="color:#555;">$1</em>');
          
          // Handle underline
          p = p.replace(/__(.*?)__/g, '<u style="color:#555;">$1</u>');
          
          // Handle bullet lists (enhanced for summary format)
          if (mode === 'summarize') {
            p = p.replace(/^[•\*-]\s+(.*)/gm, '<div style="margin-bottom:10px; display:flex; align-items:flex-start; gap:10px;"><span style="color:#667eea; font-weight:bold; flex-shrink:0; margin-top:4px;">•</span><span style="line-height:1.5;">$1</span></div>');
          } else {
            p = p.replace(/^[•\*-]\s+(.*)/gm, '<div style="margin-bottom:8px; display:flex; gap:8px; padding-left:4px;"><span style="color:#667eea; font-weight:bold;">•</span><span>$1</span></div>');
          }
          
          // Handle numbered lists
          p = p.replace(/^\d+\.\s+(.*)/gm, '<div style="margin-bottom:8px; display:flex; gap:8px; padding-left:4px;"><span style="color:#667eea; font-weight:bold;">$&</span><span>$1</span></div>');
          
          return `<div style="margin-bottom: 12px;">${p}</div>`;
        })
        .join('');
    }

    currentResult = text;
    resultContent.innerHTML = render(rawText);
    const titles = {
      proofread: 'Proofread Result',
      rewrite: 'Rewrite Result',
      summarize: 'Page Summary'
    };
    resultTitle.textContent = titles[mode] || 'Result';
    
    // Enhance summary display with special styling
    if (mode === 'summarize') {
      resultTitle.style.color = '#667eea';
      resultTitle.style.fontWeight = '700';
    } else {
      resultTitle.style.color = '';
      resultTitle.style.fontWeight = '';
    }
    
    resultContainer.classList.add('show');
    copyText.textContent = 'Copy';
  }

  function hideResult() {
    resultContainer.classList.remove('show');
    currentResult = '';
  }
  
  // Function to insert text into Google Docs
  function insertTextIntoGoogleDocs(text) {
    try {
      // Check if we're in Google Docs
      if (!window.location.hostname.includes('docs.google.com')) {
        console.warn('Not in Google Docs, cannot insert text');
        return false;
      }
      
      // Method 1: Try to insert using execCommand (may not work in newer browsers)
      try {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'IFRAME') {
          // If the active element is an iframe, try to insert into it
          const iframeDoc = activeElement.contentDocument || activeElement.contentWindow.document;
          if (iframeDoc && iframeDoc.getSelection) {
            const selection = iframeDoc.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(iframeDoc.createTextNode(text));
              return true;
            }
          }
        }
      } catch (e) {
        console.warn('Could not insert via iframe:', e);
      }
      
      // Method 2: Try to insert into contenteditable elements
      try {
        const editable = document.querySelector('[contenteditable="true"]');
        if (editable) {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            
            // Move cursor to end of inserted text
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
          } else {
            // If no selection, just set the text
            editable.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, text);
            return true;
          }
        }
      } catch (e) {
        console.warn('Could not insert via contenteditable:', e);
      }
      
      // Method 3: Try alternative Google Docs specific selectors
      try {
        const docContainer = document.querySelector('[role="document"]');
        if (docContainer) {
          docContainer.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
          return true;
        }
      } catch (e) {
        console.warn('Could not insert via document container:', e);
      }
      
      // If all methods fail, show a notification suggesting manual paste
      showStatus('⚠️ Could not insert directly. Please paste manually (Ctrl+V)', 5000);
      return false;
    } catch (error) {
      console.error('Error inserting text into Google Docs:', error);
      showStatus('❌ Error inserting text. Please paste manually.', 3000);
      return false;
    }
  }

  // Listen for ZENPET_RESULT/STATUS from assistant.js
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;

    if (e.data?.type === 'ZENPET_STATUS') {
      const msg = e.data.message;
      if (msg.startsWith('⏳') || msg.startsWith('⚙️')) {
        setProcessing(true);
        showStatus(msg, 30000);
      } else if (msg.startsWith('⚠️') || msg.startsWith('❌')) {
        setProcessing(false);
        hideResult();
        showStatus(msg, 3000);
      } else if (msg.startsWith('✅')) {
        setProcessing(false);
        showStatus(msg, 2000);
      }
    }

    if (e.data?.type === 'ZENPET_RESULT') {
      setProcessing(false);
      const { text, mode, insertInGoogleDocs } = e.data;
      
      if (insertInGoogleDocs) {
        // Handle direct insertion in Google Docs
        insertTextIntoGoogleDocs(text);
        showStatus('✅ Text inserted into Google Docs!', 3000);
      } else {
        showResult(text, mode);
      }
    }
  });

  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!currentResult) return;
    try {
      await navigator.clipboard.writeText(currentResult);
      copyText.textContent = '✓ Copied!';
      showStatus('✅ Copied to clipboard!', 2000);
      setTimeout(() => { copyText.textContent = 'Copy'; }, 2000);
    } catch (err) {
      showStatus('❌ Copy failed', 2000);
    }
  });

  summarizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log(TAG, 'Summarize clicked', { isProcessing });
    if (isProcessing) return;
    awardCoins(5);
    hideResult();
    // Use runtime message relay for better reliability
    chrome.runtime.sendMessage({ type: 'AI_ACTION', mode: 'summarize' }, (resp) => {
      console.log(TAG, 'Summarize relay response:', resp);
    });
  });

  actionButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = btn.dataset.mode;
      console.log(TAG, mode + ' clicked', { isProcessing });
      if (isProcessing) return;
      if (mode === 'proofread' || mode === 'rewrite') {
        awardCoins(1);
      }
      hideResult();
      // Use runtime message relay
      chrome.runtime.sendMessage({ type: 'AI_ACTION', mode }, (resp) => {
        console.log(TAG, mode + ' relay response:', resp);
      });
    });
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    bubble.setAttribute('data-open', 'false');
    hideResult();
    setProcessing(false);
    statusEl.classList.remove('show');
  });

  // Dragging logic
  let down = false;
  let drag = false;
  let sx = 0;
  let sy = 0;
  let ox = 0;
  let oy = 0;
  const THRESH = 5;

  const clamp = (x, y) => {
    const mx = Math.max(0, window.innerWidth - host.offsetWidth);
    const my = Math.max(0, window.innerHeight - host.offsetHeight);
    return { x: Math.min(Math.max(0, x), mx), y: Math.min(Math.max(0, y), my) };
  };

  img.addEventListener('pointerdown', (e) => {
    down = true;
    drag = false;
    sx = e.clientX;
    sy = e.clientY;
    img.setPointerCapture?.(e.pointerId);
    const r = host.getBoundingClientRect();
    ox = sx - r.left;
    oy = sy - r.top;
  });

  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (!drag && Math.hypot(dx, dy) > THRESH) drag = true;
    if (!drag) return;
    const next = clamp(e.clientX - ox, e.clientY - oy);
    host.style.left = `${next.x}px`;
    host.style.top = `${next.y}px`;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
  });

  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    if (drag) {
      drag = false;
      try {
        const r = host.getBoundingClientRect();
        localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top }));
      } catch (e) { }
    } else {
      const open = bubble.getAttribute('data-open') === 'true';
      bubble.setAttribute('data-open', open ? 'false' : 'true');
    }
  });

  document.documentElement.appendChild(host);

  function awardCoins(amount) {
    chrome.runtime.sendMessage({ type: 'AWARD_COINS', amount });
  }

})();



