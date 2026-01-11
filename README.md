# <img src="assets/icon48.png" alt="ReMind" width="32" style="vertical-align: middle;"> ReMind

**Your Local Memory for the Web.**

ReMind is a privacy-first Chrome extension that gives you a photographic memory of your browsing history. It uses **TraceBack** module to automatically index the content you view, allowing you to search and recall information using natural language. **All data processing happens locally** using Chrome's built-in Gemini Nano AI, ensuring complete privacy.

---

## 🏗️ Technical Architecture

ReMind utilizes a modern, privacy-first architecture powered by Chrome's on-device AI capabilities:

### Core Technologies
- **AI Engine**: Google Gemini Nano (via Chrome Prompt API) – *Zero-latency, offline inference*.
- **Orchestration**: Chrome Service Workers – *Background indexer & decision engine*.
- **Storage**: IndexedDB – *High-performance local vector & content storage*.
- **Isolation**: ShadowDOM – *Non-intrusive UI injection*.

### Module Stack
- **TraceBack**:
  - **OCR**: DOM Extraction + Vision API fallbacks.
  - **Compression**: WebP for efficient snapshot storage.

---

## ✨ Key Features

### TraceBack
*Never lose track of what you've seen online.*

- **Photographic Memory**: Automatically indexes the text and visual content of pages you visit.
- **Content-Based Search**: Search not just by URL, but by the actual content you read.
- **Privacy-First**: 100% local processing. Your browsing history is stored on your device and never sent to the cloud.
- **Time Travel**: Browse your history visually through a timeline.

#### 🎯 The Problem
- **Users forget** where they saw information online
- **Browser history** is just a list of URLs (not searchable by content)
- **Can't remember context**: "What was I researching Tuesday afternoon?"
- **Screenshots/bookmarks** require manual effort (and people forget)

#### ✨ The Solution
TraceBack runs silently in the background, automatically:
- 📸 **Capturing screenshots** of your active tab
- 🔤 **Extracting text** using OCR powered by Chrome Prompt API
- 🔍 **Building a searchable local index** of all content
- 🧠 **Letting you search** by content, time, or natural language

#### 🔒 Privacy First
- ✅ **100% local processing** - your browsing data never leaves your device
- ✅ **Works completely offline** - no internet required for search
- ✅ **Zero subscription fees** - no cloud costs
- ✅ **You own your data** - export or delete anytime


---

## 🛠️ Installation Requirements

Before installing ReMind, ensure your Chrome browser is set up for on-device AI.

### Step 1: Get the Right Browser
You need **Google Chrome version 128+** (Standard or Canary).
- **Recommended**: Standard Chrome (Stable)
- **Alternative**: [Chrome Canary](https://www.google.com/chrome/canary/) for latest experimental features

### Step 2: Enable AI Flags
1. Open Chrome and paste this into the address bar: `chrome://flags`
2. Search for and **Enable** the following flags:
   - **Enables optimization guide on device**: Select **Enabled BypassPerfRequirement**
   - **Prompt API for Gemini Nano**: Select **Enabled**
3. **Relaunch** Chrome when prompted.

### Step 3: Download AI Models
1. Go to `chrome://components`
2. Find **Optimization Guide On Device Model**.
3. Click **Check for update**.
4. Wait for it to show a version number (it may take a few minutes to download the ~1.5GB model).
   - *Note: If it says "Component not updated", the model might already be downloading or installed.*

---

## 🚀 Installation

### Prerequisites
1. **Google Chrome** (version 127+)
2. **Chrome Built-in AI Early Preview Program** enrollment
   - Sign up at: [Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in)
   - Enable flags:
     - `chrome://flags/#optimization-guide-on-device-model`
     - `chrome://flags/#prompt-api-for-gemini-nano`

### Install the Extension
1. **Clone the Repository**
   ```bash
   git clone https://github.com/parag8487/ReMind.git
   cd ReMind
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top right toggle)
   - Click **Load unpacked**
   - Select the `ReMind` folder

3. **Grant Permissions**
   - Click on the ReMind icon in your toolbar
   - Allow necessary permissions when prompted

4. **Start Browsing!**
   - Click the extension icon anytime to search your memory.
   - Use Timeline, Search, or Ask modes to find what you need.

> 💡 **Tip**: For detailed AI setup instructions, see the [AI Setup Guide](docs/AI_SETUP_GUIDE.md)

**🎉 Success! ReMind is now active.**

---

## 🎮 How to Use

### Main Interface
Click the **ReMind icon** in your toolbar to open the TraceBack interface.

### Using TraceBack (Recall)
- **Automatic Capture**: Runs silently in the background.
- **Search**: Usage the dedicated interface to find past content using natural language.
- **Ask AI**: Chat with your history to get answers based on what you've seen.

---

## 🔒 Privacy & Data

ReMind is designed with a **Privacy-First** architecture.
- **Local AI**: All text processing and image recognition happens **locally on your device** using Chrome's Gemini Nano.
- **Local Storage**: Your browsing history and snapshots are stored in your browser's IndexedDB.
- **No Cloud Sync**: We do not send your data to any external servers. You own your data.

---

## 🏗️ Architecture

```
ReMind/
├── manifest.json           # Unified V3 Manifest
├── background.js          # Shared Service Worker & AI Orchestration
├── docs/                  # AI Setup & Documentation
├── features/
│   └── traceback/         # TraceBack Module
│       ├── background.js
│       ├── content.js
│       ├── lib/
│       └── popup/
└── popup/                 # Main Menu (Router)
```

---

*Made with ❤️ for a better web.*