# ReMind: Complete System Architecture & Comparison

<div align="center">
  <h3>The Cognitive Layer for your Browser</h3>
  <p>Technical Whitepaper & Performance Analysis</p>
</div>

---

## 1. Executive Summary: The "Shadow" Architecture
Normal Chrome is a **Passive Viewer**. It displays what the server sends.
ReMind transforms Chrome into an **Active Processor**. It creates a "Shadow DOM" of intelligence that runs parallel to your browsing, filtering distractions and indexing knowledge without touching the remote server.

### High-Level "Chrome vs. ReMind"
| Metric | Normal Chrome | Chrome + ReMind |
| :--- | :--- | :--- |
| **Role** | Display Engine | Display + Cognitive Engine |
| **Data Flow** | Server $\to$ Screen | Server $\to$ **AI Layer** $\to$ Screen |
| **Memory** | ~100MB / Tab | ~100MB + **22MB (Shared AI Model)** |
| **Latency** | Network Speed | **< 16ms** (Local Processing) |
| **Privacy** | Cloud-dependent | **100% Local (Offline)** |

---

## 2. Core Architecture: The "Three-Brain" System
ReMind uses a distributed architecture to keep the browser fast while running heavy AI workloads.

### Pillar A: The Reflex Brain (Content Scripts)
*   **Location**: Injected into every web page.
*   **Role**: Instant UI changes, blocking distractions, reading text.
*   **Tech**: Vanilla JS, IntersectionObserver.
*   **Speed**: Immediate (< 1ms).

### Pillar B: The Memory Brain (Background Service Worker)
*   **Location**: Invisible background process.
*   **Role**: Orchestrator. Manages storage (IndexedDB), coordinates messages, handles state.
*   **Tech**: Service Workers, Chrome Storage API.
*   **Speed**: Fast (Event-driven).

### Pillar C: The Deep Brain (Offscreen AI Sandbox)
*   **Location**: A hidden HTML document (`offscreen.html`).
*   **Role**: The Heavy Lifter. Runs the Neural Networks (Transformers.js) and Vector Operations.
*   **Tech**: WebAssembly (WASM), WebGL, Transformers.js.
*   **Speed**: Asynchronous (50-200ms).

---

## 3. Feature-by-Feature Deep Dive

### I. TraceBack (The "Perfect Memory")
*   **Goal**: "Ctrl+F for your entire history."
*   **Normal Chrome**: Stores URLs + Time. Search is simple string matching.
*   **ReMind Architecture**:
    1.  **Capture**: `content.js` extracts visible text (no scripts/ads).
    2.  **Vectorize**: `offscreen.js` converts text to a **384-dimensional vector** (MiniLM Model).
    3.  **Store**: Saves the Vector + Metadata to IndexedDB.
    4.  **Recall**: Uses **Cosine Similarity** to find "meaning" matches, not just keyword matches.

### II. ReZone (The "Attention Guard")
*   **Goal**: Stop you from doomscrolling.
*   **Normal Chrome**: Lets you browse anything freely.
*   **ReMind Architecture**:
    1.  **Drift Detection**: Tracks `window.blur` and URL changes. If you wander off for > 2 seconds, it starts a timer.
    2.  **Relevance Analysis**:
        *   Extracts page content (Title, H1, Meta Description).
        *   Asks Nano AI: *"Is this relevant to [User Goal]?"*
    3.  **Intervention**:
        *   If **Irrelevant**, injects a **Shadow DOM Overlay** covering the screen.
        *   Forcefully guides you back to the relevant URL.

### III. Adaptive Focus (The "Cognitive Filter")
*   **Goal**: Make complex text readable (ADHD/Dyslexia friendly).
*   **Normal Chrome**: Renders raw HTML/CSS.
*   **ReMind Architecture**:
    1.  **Scan**: Uses `IntersectionObserver` to detect paragraphs as you scroll.
    2.  **Process**:
        *   **ADHD**: Extracts the first sentence of every paragraph (bionic reading concept).
        *   **Dyslexia**: Rewrites complex sentences into simple active voice.
    3.  **Replace**: Swaps the innerHTML of paragraphs on-the-fly without breaking the page layout.

### IV. HTMLify (The "Format Bridge")
*   **Goal**: Turn any messy content (PDF, Image, Notes) into clean HTML.
*   **Normal Chrome**: Can view PDFs/Images, but cannot edit or restructure them.
*   **ReMind Architecture**:
    1.  **Ingest**:
        *   **Images**: Runs `Tesseract.js` (WASM) in a distinct Worker to extract text (OCR).
        *   **PDFs**: Uses `PDF.js` to extract raw strings.
    2.  **Restructure**: Sends raw text to the **Language Model**.
    3.  **Generate**: The AI serves as a "Frontend Developer", writing semantic HTML (`<section>`, `<h2>`, `<table>`) to structure the raw data.

---

## 4. Normal Chrome vs. ReMind (Detailed Comparison)

| Process | Normal Chrome | ReMind Extension | Resource Impact |
| :--- | :--- | :--- | :--- |
| **Text Rendering** | Browser Engine (Blink) | **Adaptive Engine** (Modifies DOM) | Low (< 5ms) |
| **History** | SQLite Database (Disk) | **Vector Index** (IndexedDB + RAM) | +1.5MB Storage |
| **Image Viewing** | Raster Display | **OCR Layer** (Tesseract WASM) | High (Only during conversion) |
| **Tab Management** | Passive | **Active Monitoring** (Drift Detect) | Negligible |
| **AI Processing** | Server-Side (Cloud) | **Client-Side (Local WASM)** | +150MB RAM (Shared) |

---

## 5. System Requirements
This architecture is designed to run on standard consumer hardware.

*   **Processor**: Intel Core i3 / AMD Ryzen 3 (2019+) or Apple M1/M2.
*   **RAM**: 8GB Minimum (Allocates ~200MB for AI Model + Workers).
*   **GPU**: Not Required (CPU Fallback enabled via WASM).
*   **Storage**: ~50MB disk space (Model Cache + Vector DB).
