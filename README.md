# JnanaSetu — AI-Powered Adaptive Learning for India's K-12 Students

> "How might we detect and bridge real comprehension gaps (not just performance gaps) in low-resource Indian classrooms with minimal teacher intervention and no reliance on continuous connectivity?"

## 🎯 Mission

JnanaSetu detects the **type** of misunderstanding (conceptual / procedural / careless / unknown) and provides tailored visual + story explanations per gap type. It works fully offline using IndexedDB + preloaded JSON, supports English, Hindi, and Kannada, and reduces teacher workload.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│  React + Vite + Tailwind + PWA (Frontend)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐          │
│  │ Learning │ │ Teacher  │ │  Offline Module  │          │
│  │   Loop   │ │Dashboard │ │  Downloader      │          │
│  └──────────┘ └──────────┘ └──────────────────┘          │
│  ┌──────────────────────────────────────────────────┐     │
│  │  🤖 AI Tutor (NEW!)                              │     │
│  │  ┌─────────────┐ ┌──────────┐ ┌──────────────┐ │     │
│  │  │ Upload PDF  │ │ Chapter  │ │ Adaptive     │ │     │
│  │  │ → AI Trans- │ │ Q&A with │ │ Quiz with    │ │     │
│  │  │ cribes      │ │ Textbook │ │ Misconception│ │     │
│  │  │ Chapter-wise│ │ Ref's    │ │ Detection    │ │     │
│  │  └─────────────┘ └──────────┘ └──────────────┘ │     │
│  └──────────────────────────────────────────────────┘     │
├──────────────────────────────────────────────────────────┤
│  IndexedDB Layer (idb)                                    │
│  modules | events | cards | responses | students          │
├──────────────────────────────────────────────────────────┤
│  AI Engine (Hybrid)                                       │
│  Online → Groq (llama-3.3-70b-versatile)                  │
│  Offline → JSON rules + dataset                           │
├──────────────────────────────────────────────────────────┤
│  Node.js + Express Backend (minimal)                      │
│  /api/sync | /api/events | /api/student | /api/extract-text│
├──────────────────────────────────────────────────────────┤
│  Python Data Pipeline (Legacy — replaced by AI Tutor)     │
│  PDF → Extracted Text → Structured JSON Dataset           │
└──────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (Demo in 5 Minutes)

### Prerequisites

- Node.js 18+
- npm 9+

### Step 1: Install & Start Frontend

Open a terminal in the `jnanasetu` folder:

```bash
cd frontend
npm install
npm run dev
```

The app will open at `http://localhost:5173` (or a nearby port like 5174/5175 if 5173 is busy).

### Step 2: Seed Demo Data

Open a **second terminal** in the `jnanasetu` folder:

```bash
node scripts/seedDemo.js
```

This creates:
- Student **"Arjun"** (Grade 7, Kannada)
- Preloaded **Fractions module** with 5 questions
- Demo events showing an overconfidence scenario
- SM-2 card scheduled for tomorrow

### Step 3: Run the Demo Scenario

1. Open `http://localhost:5173` (or whatever port Vite shows)
2. **Splash Screen** → Tap "Get Started"
3. **Landing Page** → Click **"I'm a Student"**
4. **Auth Page** → Enter:
   - Name: `Arjun`
   - Grade: `7`
   - Language: `ಕನ್ನಡ (Kannada)`
   - Click "Start Learning"
5. **Learn Page** → You'll see the Fractions module. Tap it.
6. **Question**: "What is 1/2 + 1/3?"
   - Type answer: `2/5` ← This is the classic conceptual error
   - Click "Submit"
7. **Confidence Rating** → Rate: **5** (Totally sure!)
8. **System detects**: Overconfidence + Conceptual gap
9. **Socratic Nudge** → "If you cut a roti into 2 and another into 3 pieces, are those pieces the same size?"
   - Click **"Still stuck"**
10. **Explanation Panel** → Watch the SharingTemplate SVG animation (6 steps with roti/pizza visuals)
    - Click "Next" through each step
11. **Peer Prompt** → Type an explanation (10+ words, must include "denominator")
    - Example: "I need to find a common denominator before adding fractions with different denominators"
    - Click "Submit" → See green checkmark + "+10 XP"
12. **Scheduled Card** → Shows: "Next review: tomorrow 🔴"

### Step 4: Teacher Dashboard

Open `http://localhost:5173/dashboard` to see:
- **Top misconception** alert
- **Overconfidence alerts** (Arjun will show up here)
- **Mastery rate** percentage
- **Gap heatmap** by topic
- **Student list** with compact timeline
- Click on Arjun → **Student Drawer** slides in showing:
  - Last 5 answers with gap badges
  - SM-2 upcoming reviews
  - "Flag for intervention" button

### Step 5: Backend (Optional — for sync features)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI if needed
npm run dev
```

### Step 6: Python Pipeline (Optional — for generating new datasets)

```bash
cd pipeline
pip install -r requirements.txt

# Ingest PDFs from Karnataka textbooks
python ingest.py

# Generate misconceptions (requires GROQ_API_KEY in .env)
python generate.py
```

## 📁 Project Structure

```
jnanasetu/
├── frontend/          # React + Vite + Tailwind + PWA
│   ├── src/
│   │   ├── pages/     # Splash, Landing, Auth, Learn, Review, Dashboard
│   │   ├── components/# Learning loop, SVG templates, dashboard
│   │   ├── engine/    # Gap detection, SM-2, story engine, rules
│   │   ├── db/        # IndexedDB CRUD helpers
│   │   ├── i18n/      # English, Hindi, Kannada translations
│   │   ├── services/  # Sync, voice, module loader
│   │   └── context/   # Student + Session providers
│   ├── .env           # VITE_GROQ_API_KEY (pre-configured)
│   └── ...
├── backend/           # Express + MongoDB
│   └── src/
│       ├── routes/    # students, events, modules
│       └── models/    # Mongoose schemas
├── pipeline/          # Python data pipeline
│   └── data/
│       ├── raw/       # Downloaded PDFs
│       ├── extracted/ # Extracted text
│       └── datasets/  # Structured JSON datasets
└── scripts/           # Demo seeding
```

## 🤖 AI Tutor — The New Way to Learn from Any Textbook

The AI Tutor replaces the old Python pipeline (`generate.py`) with Groq AI doing all the work in real-time.

### How It Works

1. **Upload any textbook PDF** → AI extracts text and transcribes it chapter-by-chapter
2. **Ask questions** → AI answers using ONLY your textbook content, with chapter/section references
3. **Take adaptive quizzes** → AI generates questions that detect the type of misunderstanding
4. **Voice input** → Speak your questions (browser speech recognition)
5. **Misconception analysis** → AI classifies errors as conceptual/procedural/careless/unknown

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/services/aiTutor.js` | Core AI service: textbook transcription, Q&A, quiz generation, misconception analysis |
| `frontend/src/components/learning/AITutorChat.jsx` | Chat UI with Q&A mode, Quiz mode, voice input, chapter selector |
| `frontend/src/components/pipeline/TextbookUploader.jsx` | Drag-and-drop PDF upload with progress tracking |
| `frontend/src/pages/AITutorPage.jsx` | Full-page AI Tutor experience |
| `backend/src/routes/textract.js` | Server-side PDF text extraction endpoint |

### How to Use

1. Navigate to **Learn** → tap **AI Tutor** card
2. Upload a PDF textbook (or select a previously processed one)
3. Ask questions in the chat, or switch to **Quiz mode** for adaptive testing
4. Get answers with textbook references and gap-type analysis

### How It Replaces `generate.py`

| Old Approach (generate.py) | New Approach (AI Tutor) |
|---------------------------|------------------------|
| Pre-generates static JSON datasets | Real-time AI transcription |
| Requires Python + pdfplumber | Works in browser + Node.js |
| Fixed question bank | Dynamic adaptive questions |
| No student interaction | Interactive chat + quizzes |
| Batch processing | On-demand per textbook |

## 🧠 Key Features

### Gap Detection Engine
- **Online**: Uses Groq API (llama-3.3-70b-versatile) via OpenAI-compatible endpoint
- **Offline**: Rule-based matching with preloaded JSON rules
- Detects: conceptual, procedural, careless, unknown
- Falls back gracefully if API is unavailable

### SM-2 Spaced Repetition
- Mathematically correct SM-2 algorithm
- Quality derived from correctness + confidence + self-fix
- Overconfidence penalty forces next-day retest

### Visual Story Templates
- **SharingTemplate**: Full SVG animation for fractions (6 steps with roti/pizza visuals)
- Flow, Transform, Compare, Area templates (extensible)

### Multi-language Support
- English, Hindi (हिन्दी), Kannada (ಕನ್ನಡ)
- Real translations for 30+ UI strings each
- TTS support via Web Speech API (Indian English, Hindi, Kannada)

### Offline-First
- All data in IndexedDB
- PWA with service worker caching
- Zero network requests required for core functionality
- AI detection falls back to offline rules when offline

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| State | React Context + useReducer |
| Storage | IndexedDB (idb v8) |
| PWA | vite-plugin-pwa (Workbox) |
| Charts | Recharts (dashboard only) |
| Backend | Express 4, Mongoose 8 |
| AI | Groq (llama-3.3-70b-versatile) online, JSON rules offline |
| Pipeline | Python 3.11, pdfplumber, requests |

## 🌍 Environment Variables

### Frontend (`.env` — already configured)
```
VITE_GROQ_API_KEY=your_groq_api_key_here
VITE_AI4BHARAT_KEY=
```

### Backend (`.env`)
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/jnanasetu
GROQ_API_KEY=your_groq_api_key_here
AI4BHARAT_KEY=
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/events/batch | Sync events batch |
| GET | /api/class/:classId/gaps | Dashboard data |
| POST | /api/students | Create/update student |
| GET | /api/students/:id | Get student |
| GET | /api/modules | List modules |
| GET | /api/modules/:id | Get module details |
| POST | /api/extract-text | Upload PDF → extract text (for AI Tutor) |
| GET | /api/extract-status | PDF extraction service health check |

## 🧪 Python Pipeline

```bash
cd pipeline
pip install -r requirements.txt

# Ingest PDFs
python ingest.py

# Generate misconceptions (requires GROQ_API_KEY in .env)
python generate.py
```

## 📝 License

MIT
