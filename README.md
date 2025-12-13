# 🧠 MemoGraph Lite
### *Your AI-Powered Second Brain*

> **Built for the Google Gemini Hackathon**  
> *Turn your scattered thoughts into a connected Knowledge Graph.*

---

## 💡 The Problem
We all suffer from **Digital Amnesia**. We take notes, save snippets, and record voice memos, but we lose them in the void. Keyword search fails because we forget the *exact words* we used.

## 🚀 The Solution
**MemoGraph Lite** is a semantic knowledge base. It doesn't just store text; it **understands** it.
1.  **Voice-First:** Record thoughts naturally.
2.  **Semantic Search:** Ask "What was that idea about plants?" and it finds the note about "Raspberry Pi waterer" (no keyword match needed).
3.  **Visual Graph:** Automatically clusters and links related concepts in a beautiful 3D-like web.

---

## 🛠️ Tech Stack
*   **Frontend:** React 19 + TypeScript + Vite
*   **AI Model:** Google Gemini 2.5 Flash (for speed & reasoning)
*   **Embeddings:** Google `text-embedding-004` (for vector search & clustering)
*   **Visualization:** D3.js (Force-directed graph)
*   **Styling:** Tailwind CSS

---

## ⚡️ Quick Start Guide

### 1. Prerequisites
*   Node.js (v18 or higher) installed.
*   A Google Cloud Project with the **Gemini API** enabled.

### 2. Installation
Open your terminal in the project folder:

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
touch .env
```

### 3. Get Your API Key 🔑
1.  Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2.  Click **"Get API key"**.
3.  Click **"Create API key in new project"**.
4.  Copy the key string (starts with `AIza...`).

### 4. Configure Environment
Open the `.env` file you created and paste your key:

```env
API_KEY=your_copied_api_key_here
```

### 5. Run the App
```bash
npm run dev
```
Open the link shown (usually `http://localhost:5173`).

---

## 🎤 Demo Script (For the Jury)

**Step 1: The Hook (Voice)**
*   *Action:* Click the **Microphone** button in the input bar.
*   *Say:* "I need to remember to buy almond milk and check the expiration date on the eggs."
*   *Result:* The app transcribes it. Click **"+"** to save. The AI generates a title automatically.

**Step 2: The "Wow" (Semantic Search)**
*   *Action:* Click **"Load Demo Data"** to populate the app with rich data.
*   *Action:* In the search bar, type (or speak): *"How do I improve my website performance?"*
*   *Note:* You don't have a note with the word "website" or "performance".
*   *Result:* The RAG system finds the "Q3 Roadmap" note (which mentions "Reduce bundle size") and answers your question using that context.

**Step 3: The Visual (Memory Graph)**
*   *Action:* Click the **"Memory Graph"** tab.
*   *Observation:* See the nodes floating. Notice the **dotted lines** connecting the "React" note to the "TypeScript" note automatically.
*   *Action:* Click **"Organize My Notes"** in the sidebar.
*   *Result:* Gemini clusters your notes into topics like "Coding," "Personal," and "Ideas." The graph physically pulls them together into colored groups.

---

## 🏆 Why We Should Win
1.  **Technical Complexity:** We implemented a full RAG (Retrieval Augmented Generation) pipeline purely on the client side.
2.  **Multimodal:** Handles Text-to-Speech (TTS) and Speech-to-Text (STT) seamlessly.
3.  **UX Design:** The "Memory Graph" makes abstract AI concepts visible and tangible to the user.
