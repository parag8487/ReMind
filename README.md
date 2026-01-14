# <img src="assets/icon48.png" alt="ReMind" width="32" style="vertical-align: middle;"> ReMind

**Unified Cognitive AI Assistant. Recall everything, adapt everywhere.**

ReMind combines the power of **TraceBack** (photographic memory) and **AdaptiveFocus** (learning accessibility) into a single, cohesive Chrome extension. **All data processing happens locally** using Chrome's built-in Gemini Nano AI, ensuring complete privacy.

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
  - **Audio**: Web Speech API for real-time transcription.
  - **Compression**: WebP for efficient snapshot storage.
- **Adaptive Focus**:
  - **NLP**: Chrome Summarizer API for content distillation.
  - **DOM**: MutationObserver for dynamic content adaptation.

---

## ✨ Key Features

ReMind integrates four core modules:

### 1. TraceBack
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

#### 👥 Use Cases

TraceBack is perfect for anyone who needs to recall what they've seen online:

- **🎓 Students** - Find lecture notes, research papers, and study materials you've browsed
- **💼 Executives** - Recall details from market research, competitor analysis, and reports
- **👨‍💻 Engineers** - Quickly find API docs, Stack Overflow solutions, and technical articles
- **💰 Sales Teams** - Remember product details, customer research, and competitive intel
- **🧠 People with ADHD** - Never lose track of important information in your browsing sessions
- **🔬 Researchers** - Track down sources and references you encountered during your work
- **📝 Content Creators** - Find inspiration and reference materials from your browsing history

### 2. AdaptiveFocus (Learning Accessibility)
*Transform the web to match your brain.*

#### 🧪 Test Scenarios

**Test Scenario 1 - Dyslexia Support** (3 minutes):
1. Visit any article (e.g., [Wikipedia: Solar System](https://en.wikipedia.org/wiki/Solar_System))
2. Click ReMind icon → Select **Adaptive Focus** → Select **Dyslexia** profile
3. Choose **Grade 4-6**
4. Click **Apply adaptations**
5. **Observe:** Typography changes (increased spacing, sans-serif font, warm background)
6. **Click "Expand" on any paragraph:** See simplified rewrite with comprehension question
7. **Scroll to end of expanded section:** Simple glossary lists 3-4 key words with definitions

**Test Scenario 2 - ADHD Support** (3 minutes):
1. Visit a different article (e.g., [BBC News article](https://www.bbc.com/news))
2. Click ReMind → Select **ADHD** profile
3. Choose **Grade 7-8**
4. Click **Apply adaptations**
5. **Observe:** Instant "Quick Overview" banner appears (placeholder to reduce waiting frustration)
6. **Wait for full structured summary:** Key topics broken into digestible sections
7. **Use the checklist:** Each paragraph becomes a completable task with checkboxes

**Test Scenario 3 - Grade Band Differences** (2 minutes):
1. Try the same article with **Grade 1-3** (Dyslexia mode)
2. **Notice:** Text converts to UPPERCASE, simpler vocabulary, no comprehension questions
3. Switch to **Grade 7-8** (Dyslexia mode)
4. **Notice:** More reflective questions, optional glossary, maintained complexity

#### 🏆 Judging Criteria Highlights

**Functionality (Scalability):**
- Works on any text-heavy webpage (news, Wikipedia, blogs, educational sites)
- Supports 3 grade bands × 2 profiles = 6 distinct adaptation modes
- Persists settings across sessions for continuous support
- Fully client-side = works globally without regional API restrictions

**Purpose (Real-world problem):**
- Addresses the needs of students with learning differences
- Enables independent web reading for neurodivergent learners
- Reduces teacher workload in creating differentiated materials
- Repeat-use by design: auto-adapt mode for persistent support

**Content (Creativity):**
- Research-informed pedagogy (not just generic simplification)
- Grade-aware prompting system
- Progressive disclosure UI (respect for user autonomy)
- Visual hierarchy optimized for focus and attention

**User Experience:**
- Zero-latency typography changes (instant feedback)
- Progressive enhancement (placeholders while AI generates content)
- One-click restore to original content
- Simple glossary at end of expanded sections for vocabulary support

**Technical Execution:**
- Sophisticated prompt engineering with grade-band and profile-specific templates
- Queue-based prefetching system (begins processing paragraphs before user interaction in dyslexia mode)
- Session caching to reduce redundant API calls
- Fallback handling when Summarizer API unavailable
- Clean architecture: popup ↔ content script ↔ service worker

#### 🌟 Core Features

| Capability | How it Helps | Notes |
|------------|--------------|-------|
| **Profile-aware rewrites** | Tailors text for Dyslexia or ADHD learners. | All logic runs in `background/service-worker.js` with Gemini Nano. |
| **Grade bands** (1–3, 4–6, 7–8) | Adjusts tone, question complexity, typography, and glossary use. | Selectable in the popup; stored with `chrome.storage.sync`. |
| **Teacher-oriented UI** | Clean dashboard with embedded profile settings + grade selector. | `popup/popup.html`, `popup/popup.js` |
| **Dynamic support sections** | Dyslexia mode adds expandable panels with simplified paragraphs + comprehension question. | Prefetch queue avoids blocking on huge sections. |
| **Quick overview for focus** | ADHD mode creates an instant "Quick Overview" banner and bullet checklist with checkboxes. | Summary uses the Summarizer API when available, with fast placeholders. |
| **Simple glossary** | At the end of expanded sections, a simple word list (3-4 key terms with definitions) appears for vocabulary support. | Grade-specific: 1-3 get 3 words, 4-6 get 4 words, 7-8 get 2 optional words. |

#### 🎓 Grade Bands & Tuning

| Grade Band | Dyslexia behaviour | ADHD behaviour |
|------------|--------------------|----------------|
| **1st – 3rd** | Entire adaptation in uppercase, no questions, glossary limited to three core words. | 2–3 uppercase checklist items, very short sentences. |
| **4th – 6th** | Comprehension question after each paragraph, glossary with up to four entries. | 3–4 checklist items with brief encouragement. |
| **7th – 8th** | More reflective questions (styled differently), glossary optional (max two entries). | Up to 5 checklist items focused on planning, future steps. |

### 3. ReZone (Focus Recovery)
*Gentle nudges to keep you in the zone.*

#### 🎯 The Problem
- **Context Switching**: usage studies show it takes ~23 minutes to refocus after a distraction.
- **Doomscrolling**: Getting lost in unrelated content without realizing it.
- **Loss of Intent**: Forgetting *why* you opened a tab in the first place.

#### ✨ The Solution
ReZone is an AI-powered focus guardian that runs locally to protect your attention:

- 🛡️ **Detects Distractions**: Uses Gemini Nano to analyze if a page matches your current goal (e.g., "Studying Algebra").
- 🚦 **Intervention Shield**: Gently blocks distracting sites with a "Hold on..." overlay, offering a choice to "Stay" or "Back to Work".
- ↩️ **Smart Re-Entry**: When you return to work after a drift, it summarizes exactly where you left off.

#### 🎭 Emotional Tone Engine
ReZone adapts its personality to your mood. You can choose how it talks to you:

| Mode | Persona | Description |
|------|---------|-------------|
| **Tiny Mode** 🧸 | Encouraging & Gentle | Perfect for high-stress times. Uses soft language and positive reinforcement. <br> *"Welcome back! Let’s start again from where you stopped 😊"* |
| **Standard** 📘 | Professional & Direct | The default efficient assistant. Clear, concise, and neutral. <br> *"Welcome back! Let’s continue where you left off."* |
| **Playful** 😈 | Sassy & Fun | A bit of personality to keep you engaged. Calls you out on distractions with humor. <br> *"Ooo 👀 this page is very not work… you sneaky little multitasker 😏"* |

#### 🔒 Privacy First
All distraction analysis happens **locally** using the Chrome Prompt API. Your browsing habits and diversion patterns never leave your device.

### 4. HTMLify (Content Transformer)
*Turn chaos into code.*

#### 🎯 The Problem
- **Locked Data**: Text trapped in PDFs, images, or screenshots is hard to edit or reuse.
- **Messy OCR**: Standard OCR tools output unstructured text full of errors.
- **Manual Coding**: Converting a design screenshot or a PDF report into a web page takes hours.

#### ✨ The Solution
HTMLify uses a multi-stage AI pipeline to restructure content into clean, semantic HTML:

- 📷 **Image-to-HTML**: Drag a screenshot, get beautiful code. 
  - Uses **Tesseract.js (WASM)** for client-side OCR.
  - Uses **Gemini Nano** to interpret layout, fix OCR errors, and generate semantic HTML/CSS.
- 📄 **PDF-to-HTML**: Extracts text from PDFs and intelligently formats it into headers, paragraphs, and lists.
- 📝 **Text-to-HTML**: Turns messy notes into structured, styled documents.

#### 🔒 Privacy First
- **Zero Server Uploads**: Image recognition happens in-browser via WebAssembly.
- **Local Intelligence**: Text structuring is performed by the on-device Gemini Nano model.

---

## 🛠️ Installation Requirements

Before installing ReMind, ensure your Chrome browser is set up for on-device AI.

### Step 1: Get the Right Browser
You need **Google Chrome version 128+** (Canary or Dev channel recommended for latest AI features).
- [Download Chrome Canary](https://www.google.com/chrome/canary/)

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

### ⚠️ Troubleshooting: "I don't see the Optimization Guide!"
**Critical Check:** Are you using **Chrome Canary**? This feature often does *not* work on standard Chrome or even Chrome Dev.
1.  **Download Chrome Canary**: [https://www.google.com/chrome/canary/](https://www.google.com/chrome/canary/)
2.  **Check Flags (Canary)**:
    -   `chrome://flags/#optimization-guide-on-device-model` -> **Enabled BypassPerfRequirement**
    -   `chrome://flags/#prompt-api-for-gemini-nano` -> **Enabled**
3.  **Hard Restart**: Fully quit Chrome (from system tray) and reopen.
4.  **Force Download**:
    -   Open `chrome://components`
    -   If missing, open a new tab, hit F12 (Console), run: `await window.LanguageModel.availability()`
    -   Refresh `chrome://components`.

**Still not working?**
Try launching Chrome interactions with this command line flag:
`--enable-features=OptimizationGuideModelDownloading,OptimizationHints`

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

4. **Download AI Models** (First Time Setup)
   - When you first open ReMind, you'll see a setup guide
   - Click **"Download AI Components"** to start downloading Gemini Nano
   - The download is ~1.5GB and may take several minutes
   - You can track progress in the extension popup
   - **Note**: Models download once and are shared across all Chrome AI apps

5. **Start Browsing!**
   - Once AI models are ready, ReMind starts capturing automatically
   - Click the extension icon anytime to search your memory
   - Use Timeline, Search, or Ask modes to find what you need

> 💡 **Tip**: For detailed AI setup instructions, see the [AI Setup Guide](docs/AI_SETUP_GUIDE.md)

**🎉 Success! ReMind is now active.**

---

## 🎮 How to Use

### Main Interface
Click the **ReMind icon** in your toolbar to open the main menu. You will see two options:

1.  **Adaptive Focus** (🧠): Click this to open the Learning Accessibility tools.
2.  **TraceBack** (🔍): Click this to access your photographic memory and search history.

### Using TraceBack (Recall)
- **Automatic Capture**: Runs silently in the background.
- **Access**: Click **TraceBack** from the main menu.
- **Search**: Use the dedicated interface to find past content using natural language.

### Using AdaptiveFocus (Accessibility)
1. **Navigate** to an article.
2. **Open ReMind** and click **Adaptive Focus**.
3. **Configure Settings**:
    - **Profile**: Dyslexia or ADHD.
    - **Grade**: Choose your reading level.
4. **Click "Apply Adaptations"** to transform the page.

### Using ReZone (Focus)
1. **Navigate** to any page you want to study or work on.
2. **Open ReMind** and click **ReZone**.
3. **Set a Goal** (e.g., "Researching History") to activate the AI guardian.
4. **Browse freely**: If you drift to distractions (social media, shopping), ReZone will nudge you back.
5. **Resume**: When you return, a summary card helps you pick up exactly where you left off.

### Using HTMLify (Converter)
1. **Open ReMind** and click **HTMLify**.
2. **Choose Source**:
    - **Text**: Paste content locally.
    - **Image**: Upload or capture a screenshot.
    - **PDF**: Upload a document.
3. **Convert**: Click "Convert & Download" to get a clean, standalone HTML file.

---

## 🔒 Privacy & Data

ReMind is designed with a **Privacy-First** architecture.
- **Local AI**: All text processing, rewriting, and image recognition happens **locally on your device** using Chrome's Gemini Nano.
- **Local Storage**: Your browsing history and snapshots for TraceBack are stored in your browser's IndexedDB.
- **No Cloud Sync**: We do not send your data to any external servers. You own your data.

---

## ❓ Troubleshooting

**"The AI adaptations aren't loading!"**
- Ensure you have downloaded the Gemini Nano model in `chrome://components`.
- Check that the `Prompt API` flag is enabled in `chrome://flags`.
- Only English content is fully supported at this time.
- **Restart Required**: If the Optimization Guide is stuck or unavailable, **restart your PC and Chrome**. This often clears internal service hangs.

**"TraceBack isn't capturing anything!"**
- Ensure all flags are enabled.
- **Restart Chrome**: If capturing fails despite flags being on, fully quit and restart Chrome to reset the background transaction services.

**"I can't install the extension."**
- Make sure you are loading the *unpacked* folder. The folder you select should contain the `manifest.json` file.

---

## 🏗️ Architecture

ReMind uses a unified extension architecture to manage both features:

```text
ReMind/
├── manifest.json           # Unified V3 Manifest
├── background.js          # Shared Service Worker & AI Orchestration
├── assets/                # Shared Icons & Images
├── docs/                  # AI Setup & Documentation
├── popup/                 # Main Menu (Router)
└── features/
    ├── traceback/         # TraceBack Module (Memory)
    │   ├── background.js
    │   ├── content.js
    │   ├── popup/         # Side Panel UI
    │   ├── lib/           # IndexedDB & Semantic Search
    │   ├── offscreen/     # Offscreen Canvas Processing
    │   └── tools/         # Debugging & Diagnostics
    ├── adaptivefocus/     # Adaptive Focus Module (Learning Accessibility)
    │   ├── background/    # Service Worker Logic (Retry/Caching)
    │   ├── content/       # DOM Injection & Styles
    │   ├── popup/         # Profile Settings UI
    │   └── assets/        # Feature-specific assets
    ├── rezone/            # ReZone Module (Focus Guardian)
    │   ├── content.js     # Drift Detection Logic
    │   ├── popup.html     # Re-Entry Card UI
    │   ├── popup.js       # Re-Entry Logic
    │   ├── styles.css     # Shared Styles
    │   └── assets/        # Tone Icons
    └── htmlcon/           # HTMLify Module (Content Transformer)
        ├── background.js  # Capture Handler
        ├── popup/         # Converter UI
        ├── lib/           # Tesseract WASM & PDF.js
        └── cropper/       # Image Cropping Logic
```


---

*Made with ❤️ and 🧠 for a better web.*

---