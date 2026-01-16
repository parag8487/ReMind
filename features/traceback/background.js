/**
 * Background Service Worker for TraceBack
 * Handles automatic tab capture and storage
 */

import StorageManager from './lib/storage.js';
import CaptureManager from './lib/capture.js';
import SemanticSearch from './lib/semantic-search.js';

// Handle extension icon click - open sidebar
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Global instances
let storageManager = null;
let captureManager = null;
let semanticSearch = null;
let captureInterval = null;
let isIndexBuilt = false;
let initPromise = null;
let creatingOffscreenDocument = null; // Promise for offscreen creation

// Configuration
const CAPTURE_INTERVAL_MS = 15000; // 15 seconds (Chrome has rate limits)
const RETENTION_DAYS = 7; // Keep data for 7 days
const OFFSCREEN_PATH = 'offscreen/offscreen.html';

/**
 * Initialize the extension
 */
async function initialize() {
  console.log('TraceBack: Initializing...');

  // Initialize storage
  storageManager = new StorageManager();
  await storageManager.init();

  // Initialize capture manager
  captureManager = new CaptureManager();

  // Initialize semantic search
  semanticSearch = new SemanticSearch();
  // Pass storage manager to semantic search so it can load vectors if needed
  semanticSearch.setStorageManager(storageManager);

  // Load settings from Chrome storage
  const settings = await loadSettings();

  // Setup Offscreen Document for AI
  await setupOffscreenDocument(OFFSCREEN_PATH);

  // Build semantic index from existing captures
  await buildSemanticIndex();

  // Start automatic capture
  startAutomaticCapture(settings.captureInterval || CAPTURE_INTERVAL_MS);

  // Set up cleanup schedule
  scheduleCleanup(settings.retentionDays || RETENTION_DAYS);

  console.log('TraceBack: Initialized successfully');
}

/**
 * Create and manage the offscreen document
 */
async function setupOffscreenDocument(path) {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(path)]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Create offscreen document
  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument;
  } else {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: path,
      reasons: ['WORKERS'], // 'WORKERS' is a valid reason for background processing
      justification: 'AI processing for semantic search and OCR'
    });
    await creatingOffscreenDocument;
    creatingOffscreenDocument = null;
  }
}

/**
 * Load user settings from Chrome storage
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['captureInterval', 'retentionDays', 'enabled'], (result) => {
      resolve({
        captureInterval: result.captureInterval || CAPTURE_INTERVAL_MS,
        retentionDays: result.retentionDays || RETENTION_DAYS,
        enabled: result.enabled !== false // Enabled by default
      });
    });
  });
}

/**
 * Start automatic tab capture
 */
function startAutomaticCapture(interval) {
  // Clear existing interval
  if (captureInterval) {
    clearInterval(captureInterval);
  }

  // Set up new interval
  captureInterval = setInterval(async () => {
    await captureCurrentTab();
  }, interval);

  console.log(`TraceBack: Auto-capture started (every ${interval / 1000}s)`);
}

/**
 * Capture the current active tab
 * @param {boolean} force - Force capture (bypass content check)
 */
async function captureCurrentTab(force = false) {
  try {
    // Get active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab) {
      return;
    }

    // Check if we should capture this URL
    if (!captureManager.shouldCapture(activeTab.url)) {
      return;
    }

    // Get tab info
    const tabInfo = await captureManager.getTabInfo(activeTab.id);

    // Capture screenshot (pass windowId for proper permissions)
    const screenshot = await captureManager.captureTab(activeTab.id, activeTab.windowId);

    // Skip if capture failed (e.g., tab was being dragged)
    if (!screenshot) {
      console.debug('TraceBack: Skipping capture - screenshot unavailable');
      return;
    }

    // Check if content has changed (skip duplicate screenshots)
    // Strict Base64 comparison against the LATEST stored capture (persistent check)
    // Check if content has changed (skip duplicate screenshots)
    // Strict Base64 comparison against the LATEST stored capture (persistent check)
    // User requested this check even for manual 'Capture Now' clicks
    const lastCapture = await storageManager.getLastCapture();
    if (lastCapture && lastCapture.screenshot === screenshot) {
      console.log('TraceBack: the capture is identical to the previous, skipping capture');
      return;
    }

    // Get DOM text from content script
    const domText = await extractDOMText(activeTab.id);

    // Create capture object
    const capture = {
      timestamp: Date.now(),
      url: tabInfo.url,
      title: tabInfo.title,
      screenshot: screenshot,
      domText: domText,
      extractedText: domText, // Will be enhanced by AI
      favIconUrl: tabInfo.favIconUrl,
      processed: false // Flag to track if AI processing is done
    };

    // Save to storage (initial save without vector/OCR)
    const captureId = await storageManager.saveCapture(capture);
    capture.id = captureId;

    // Notify any open popups/sidebars that a new capture was saved
    try {
      chrome.runtime.sendMessage({
        action: 'captureAdded',
        captureId: captureId,
        timestamp: capture.timestamp
      }).catch(() => { });
    } catch (e) { }

    // Process with AI in offscreen document (async, non-blocking)
    processWithAI(capture);

    console.log(`TraceBack: Captured ${tabInfo.title} (ID: ${captureId})`);
  } catch (error) {
    console.error('TraceBack: Error capturing tab:', error);
  }
}

/**
 * Extract text content from DOM via content script
 */
async function extractDOMText(tabId) {
  try {
    // First, try to inject the content script if it's not already there
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['features/traceback/content.js']
    }).catch(() => {
      // Ignore error if already injected
    });

    // Small delay to ensure script is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now try to send message
    const response = await chrome.tabs.sendMessage(tabId, { action: 'extractText' });
    return response?.text || '';
  } catch (error) {
    // Silently fail - content script might not be compatible with this page
    return '';
  }
}

/**
 * Build semantic search index from all captures
 */
async function buildSemanticIndex() {
  try {
    console.log('TraceBack: Building semantic search index...');
    const allCaptures = await storageManager.getAll();

    if (allCaptures.length === 0) {
      console.log('TraceBack: No captures yet, skipping index build');
      return;
    }

    // Check for captures that need processing (backfill)
    const unprocessedCaptures = allCaptures.filter(c => !c.processed && !c.embedding);
    if (unprocessedCaptures.length > 0) {
      console.log(`TraceBack: Found ${unprocessedCaptures.length} unprocessed captures. Starting backfill...`);
      // Process in batches to avoid overwhelming the offscreen document
      for (const capture of unprocessedCaptures) {
        await processWithAI(capture);
        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));
      }
    }

    await semanticSearch.buildIndex(allCaptures);
    isIndexBuilt = true;
    console.log(`TraceBack: Semantic index built with ${allCaptures.length} documents`);
  } catch (error) {
    console.error('TraceBack: Error building semantic index:', error);
  }
}

/**
 * Process capture with AI (Offscreen Document)
 */
async function processWithAI(capture) {
  console.log(`TraceBack: Sending Capture ${capture.id} to AI Worker...`);

  // Ensure offscreen document exists
  await setupOffscreenDocument(OFFSCREEN_PATH);

  // Send message to offscreen document
  chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'analyze_capture',
    payload: {
      id: capture.id,
      text: `${capture.title} ${capture.url} ${capture.domText}`.substring(0, 1000) // Limit text for speed
      // screenshotUrl removed for text-only processing
    }
  });
}

/**
 * Listen for results from Offscreen Worker
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analysis_complete') {
    (async () => {
      const { id, embedding } = request.result;
      console.log(`TraceBack: AI Analysis Complete for ID ${id}`);

      if (!embedding || embedding.length === 0) {
        console.error(`TraceBack: ERROR - No embedding received for ID ${id}!`);
      } else {
        console.log(`TraceBack: Received embedding for ID ${id}, Vector Length: ${embedding.length}`);
      }

      try {
        const capture = await storageManager.getById(id);
        if (capture) {
          // Update capture with AI results
          const updates = {
            processed: true,
            embedding: embedding // Dense vector for semantic search
          };

          await storageManager.updateCapture(id, updates);

          // Add to running index
          const updatedCapture = { ...capture, ...updates };
          semanticSearch.addToIndex(updatedCapture);

          console.log(`TraceBack: Updated capture ${id} with AI data`);
        }
      } catch (e) {
        console.error('Error updating capture with AI results:', e);
      }
    })();
  }
});


/**
 * Schedule cleanup of old captures
 */
function scheduleCleanup(retentionDays) {
  // Run cleanup daily at 3 AM
  const now = new Date();
  const nextCleanup = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    3, 0, 0, 0
  );

  const msUntilCleanup = nextCleanup.getTime() - now.getTime();

  setTimeout(() => {
    performCleanup(retentionDays);
    // Schedule next cleanup (24 hours)
    setInterval(() => performCleanup(retentionDays), 24 * 60 * 60 * 1000);
  }, msUntilCleanup);

  console.log(`TraceBack: Cleanup scheduled for ${nextCleanup.toLocaleString()}`);
}

/**
 * Perform cleanup of old captures
 */
async function performCleanup(retentionDays) {
  try {
    const deletedCount = await storageManager.deleteOlderThan(retentionDays);
    console.log(`TraceBack: Cleanup completed, deleted ${deletedCount} old captures`);
  } catch (error) {
    console.error('TraceBack: Error during cleanup:', error);
  }
}

/**
 * Handle messages from popup/content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handledActions = [
    'search',
    'getStats',
    'deleteAll',
    'startTabCapture',
    'captureNow',
    'getCapture',
    'proxy_ai_request'
  ];

  if (!handledActions.includes(request.action)) {
    return false; // Let other listeners handle it
  }

  // Execute all logic after initialization ensures storage/index are ready
  (async () => {
    try {
      if (initPromise) await initPromise;

      if (request.action === 'search') {
        const useSemanticSearch = request.semantic || false;

        if (useSemanticSearch && isIndexBuilt) {
          try {
            // 1. Get query embedding from offscreen
            const vectorResponse = await chrome.runtime.sendMessage({
              target: 'offscreen',
              action: 'embed_query',
              payload: { text: request.query }
            });

            const queryVector = vectorResponse?.vector;

            // 2. Perform search
            const allCaptures = await storageManager.getAll();
            const results = await semanticSearch.search(request.query, allCaptures, queryVector);

            sendResponse({ results, semantic: true });
          } catch (error) {
            console.error('Semantic search failed, falling back to keyword:', error);
            // Fallback
            const results = await storageManager.search(request.query);
            sendResponse({ results, semantic: false });
          }
        } else {
          // Use keyword search
          storageManager.search(request.query).then(results => {
            sendResponse({ results, semantic: false });
          }).catch(error => {
            sendResponse({ error: error.message });
          });
        }
        return;
      }

      if (request.action === 'getStats') {
        storageManager.getStats().then(stats => {
          sendResponse({ stats });
        }).catch(error => {
          sendResponse({ error: error.message });
        });
        return;
      }

      if (request.action === 'deleteAll') {
        storageManager.deleteAll().then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          sendResponse({ error: error.message });
        });
        return;
      }

      if (request.action === 'startTabCapture') {
        // Handle tab audio capture for transcription
        sendResponse({ success: true });
        return;
      }

      if (request.action === 'captureNow') {
        captureCurrentTab(true).then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          sendResponse({ error: error.message });
        });
        return;
      }

      if (request.action === 'getCapture') {
        storageManager.getById(request.id).then(capture => {
          sendResponse({ capture });
        }).catch(error => {
          sendResponse({ error: error.message });
        });
        return;
      }
      if (request.action === 'proxy_ai_request') {
        // Ensure offscreen exists
        await setupOffscreenDocument(OFFSCREEN_PATH);

        // Forward to offscreen
        try {
          const response = await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: request.originalAction,
            payload: request.payload
          });
          sendResponse(response);
        } catch (e) {
          sendResponse({ error: e.message });
        }
        return;
      }

      if (request.action === 'log_error') {
        console.error(`[${request.source}] ERROR:`, request.error);
        return;
      }
    } catch (err) {
      console.error('Error handling message:', err);
      sendResponse({ error: 'Background initialization failed' });
    }
  })();

  return true; // Keep message channel open for handled actions
});

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('TraceBack: First time installation');

    // Set default settings
    await chrome.storage.sync.set({
      // captureInterval removed: user must set it in TraceBack app
      retentionDays: RETENTION_DAYS,
      enabled: true
    });

    // Open welcome page
    chrome.tabs.create({ url: 'popup/popup.html' });
  }
});

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Capture when page finishes loading
  if (changeInfo.status === 'complete' && tab.active) {
    setTimeout(() => captureCurrentTab(), 2000); // Wait 2s for page to settle
  }
});

/**
 * Handle tab activation
 */
chrome.tabs.onActivated.addListener(() => {
  // Capture when switching tabs
  setTimeout(() => captureCurrentTab(), 1000);
});

// Initialize on startup
initPromise = initialize();
