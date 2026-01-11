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

### B. Enable Optimization Guide Flag

1. Go to: `chrome://flags/#optimization-guide-on-device-model`
2. Select: **Enabled BypassPerfRequirement**
3. **Now click "Relaunch"** button

### C. Download Gemini Nano Model

1. After restart, go to: `chrome://components/`
2. Find: **"Optimization Guide On Device Model"**
3. Click: **"Check for update"**
4. Wait for download (~1.5 GB, takes 5-15 minutes)
5. Version should change from "0.0.0.0" to something like "2026.XX.XX.XXXX"

### D. Verify AI is Ready

1. Open DevTools: Press **F12**
2. Go to **Console** tab
3. Type and run:
   ```javascript
   await ai.languageModel.availability()
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
   await ai.languageModel.availability()
   // Should return: available: "readily"
   ```

4. If still not working:
   - Disable both flags
   - Restart Chrome
   - Enable both flags again
   - Restart Chrome again
   - Try creating session in Console:
     ```javascript
     const session = await ai.languageModel.create();
     ```

### Problem: Model won't download

**Solution:**
1. Check free disk space (need 22+ GB)
2. Check internet connection
3. Wait longer (can take 15-30 min on slow connections)
4. Try: `chrome://on-device-internals` to see model status
5. Restart Chrome and check components again

---