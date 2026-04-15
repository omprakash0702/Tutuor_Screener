# TutorScreen AI

An AI-powered tutor candidate screening tool. Conducts a structured voice or text interview, then generates a detailed evaluation report with scores, strengths, red flags, and direct quotes from the interview.

---

## Features

- **Adaptive interview** — 7–13 questions that adjust based on the candidate's subject, experience level, and target age group
- **Voice + text input** — speak via microphone or type; continuous speech capture so long answers are never cut off
- **Live streaming responses** — AI interviewer streams replies token by token
- **Text-to-speech** — every AI message is spoken aloud (mutable)
- **Detailed evaluation report** — 7 scored dimensions, verdict (HIRE / CONSIDER / REJECT), strengths, improvements, red flags, and key quotes pulled directly from the transcript

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | FastAPI, Python 3.11+ |
| AI | OpenAI GPT-4o (streaming + JSON mode) |
| Speech | Web Speech API (STT) + SpeechSynthesis (TTS) |

---

## Project Structure

```
Tutor_screener/
├── backend/
│   ├── main.py          # FastAPI app — session, streaming, evaluation endpoints
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                        # Screen state machine
│   │   ├── components/
│   │   │   ├── WelcomeScreen.jsx
│   │   │   ├── InterviewScreen.jsx        # Chat UI, mic, TTS
│   │   │   └── EvaluationScreen.jsx       # Report UI
│   │   └── hooks/
│   │       └── useSpeechRecognition.js    # Continuous STT hook
│   ├── tailwind.config.js
│   └── vite.config.js
├── .env                 # OPENAI_API_KEY (not committed)
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An OpenAI API key with GPT-4o access

### 1. Clone and set up environment

```bash
git clone <repo-url>
cd Tutor_screener
```

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-proj-...
```

### 2. Start the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

Open `http://localhost:5173` in **Chrome** (required for Web Speech API).

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/session/start` | Start a new interview session, returns greeting |
| `POST` | `/api/session/{id}/message/stream` | Send a message, streams SSE response |
| `GET` | `/api/session/{id}/evaluate` | Generate evaluation report for completed interview |
| `GET` | `/health` | Health check |

---

## Evaluation Report Fields

```json
{
  "scores": {
    "subject_knowledge": 8,
    "communication": 7,
    "pedagogy": 6,
    "adaptability": 7,
    "professionalism": 8,
    "confidence": 7,
    "friendliness": 9
  },
  "overall": 7.4,
  "recommendation": "CONSIDER",
  "strengths": ["..."],
  "improvements": ["..."],
  "red_flags": ["..."],
  "evidence": ["direct quotes from the interview"],
  "summary": "..."
}
```

---

## Notes

- Sessions are stored in memory — a server restart clears active interviews
- Chrome is required for voice input (Web Speech API)
- Mute button in the interview header silences the AI's TTS
