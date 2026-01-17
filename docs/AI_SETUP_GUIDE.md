# 📦 AI Setup Guide - ReMind

This guide covers the specific steps to enable the Chrome Built-in AI features required for ReMind (Gemini Nano).

---

## ⚠️ Prerequisites

### 1. Chrome Version

You need **Chrome 128+** (Canary or Dev channel recommended):
- ✅ Chrome Canary
- ✅ Chrome Dev
- ✅ Chrome Stable (experimental)

**Check your version:**
```
chrome://settings/help
```

**Download if needed:**
- [Chrome Canary](https://www.google.com/chrome/canary/) (Recommended)
- [Chrome Dev](https://www.google.com/chrome/dev/)

### 2. System Requirements

- **OS**: Windows 10/11, macOS 13+, or Linux
- **RAM**: 4 GB minimum (16 GB recommended)
- **Storage**: 22 GB free space (for Gemini Nano model)
- **GPU**: 4+ GB VRAM recommended (CPU also works)

---

## 🤖 Enable Chrome Built-in AI

### A. Enable Prompt API Flag

1. Open Chrome
2. Go to: `chrome://flags/#prompt-api-for-gemini-nano`
3. Select: **Enabled**
4. **Don't restart yet!**

### B. Enable Specialized APIs
1. **Summarization**: `chrome://flags/#summarization-api-for-gemini-nano` -> **Enabled**
2. **Rewriter**: `chrome://flags/#rewriter-api-for-gemini-nano` -> **Enabled**
3. **Proofreader**: `chrome://flags/#proofreader-api` -> **Enabled**

### C. Enable Optimization Guide Flag

1. Go to: `chrome://flags/#optimization-guide-on-device-model`
2. Select: **Enabled BypassPerfRequirement**
3. **Now click "Relaunch"** button

### C. Download Gemini Nano Model
1. After restarting Chrome, go to: `chrome://components/`
2. Look for: **"Optimization Guide On Device Model"**
3. If found, click **"Check for update"**. Status should eventually show "Up-to-date" with a version number.
4. **If Component is MISSING or NOT DOWNLOADING**:
    -   **Step A**: Go to `chrome://flags` and ensure `#prompt-api-for-gemini-nano` and `#prompt-api-for-gemini-nano-multimodal-input` are **Enabled**.
    -   **Step B**: **Restart Chrome**.
    -   **Step C**: Open ReMind Extension -> Check Status. If "Downloadable", go to **TraceBack**.
    -   **Step D**: In TraceBack, click **"Download AI Model"**. This forces the download.
    -   **Step E**: Watch `chrome://components/`. Wait for "Optimization Guide On Device Model" to appear and reach "Up-to-date".
    -   **Step F**: ONLY AFTER download is complete, go to `chrome://flags/#optimization-guide-on-device-model` and set to **Enabled BypassPerfRequirement**.
    -   **Step G**: Restart Chrome.
5. **Verify**:
   - Go back to `chrome://components/` and refresh.
   - The **Optimization Guide On Device Model** should now appear.
   - Ensure the version is NOT "0.0.0.0".
   - If it says "Downloading", wait until it says "Component updated" or "Up-to-date".
6. **Flag Check**:
   - Check `chrome://flags/#optimization-guide-on-device-model`: **Enabled BypassPerfRequirement**
   - Check `chrome://flags/#prompt-api-for-gemini-nano`: **Enabled**
   - Check `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`: **Enabled**
   - Check `chrome://flags/#summarization-api-for-gemini-nano`: **Enabled**
   - Check `chrome://flags/#rewriter-api-for-gemini-nano`: **Enabled**
   - Check `chrome://flags/#proofreader-api`: **Enabled**
   - **Relaunch** Chrome if you made changes.
7. Return to ReMind Main Popup to confirm status is "Ready".

### D. Verify AI is Ready

1. Open DevTools: Press **F12**
2. Go to **Console** tab
3. Type and run:
   ```javascript
   // New Standard
   await window.ai.languageModel.capabilities()
   // OR Legacy Standard
   await window.LanguageModel.availability()
   ```
4. Should return: `available: "readily"` ✅

---

## 🐛 Troubleshooting AI

### Problem: "AI Not Available"

**Solution:**
1. Check flags are enabled:
   - `chrome://flags/#prompt-api-for-gemini-nano` → Enabled
   - `chrome://flags/#optimization-guide-on-device-model` → Enabled BypassPerfRequirement

2. Check model downloaded:
   - Go to `chrome://components/`
   - Find "Optimization Guide On Device Model"
   - Version should NOT be "0.0.0.0"

3. Check in Console:
   ```javascript
   // New Standard
   await window.ai.languageModel.capabilities()
   
   // OR Legacy Standard
   await window.LanguageModel.availability()
   // Should return: "readily"
   ```

4. If still not working:
   - Disable both flags
   - Restart Chrome
   - Enable both flags again
   - Restart Chrome again
   - Try creating session in Console:
     ```javascript
     // New Standard
     const session = await window.ai.languageModel.create();
     // Legacy Standard
     const session = await window.LanguageModel.create();
     ```

### Problem: Model won't download

**Solution:**
1. Check free disk space (need 22+ GB)
2. Check internet connection
3. Wait longer (can take 15-30 min on slow connections)
4. Try: `chrome://on-device-internals` to see model status
5. Restart Chrome and check components again

---

