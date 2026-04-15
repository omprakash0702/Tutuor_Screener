import os
import uuid
import json
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI, AsyncOpenAI

# Load .env from project root (one level above this file)
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

app = FastAPI(title="TutorScreen API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sync_client = OpenAI()
async_client = AsyncOpenAI()

sessions: Dict[str, dict] = {}

MODEL = "gpt-4o"

INTERVIEWER_SYSTEM = """You are Alex, a senior hiring specialist at an education company conducting tutor candidate screening interviews.

YOUR MISSION: Determine whether this candidate has the subject knowledge, communication skills, and teaching ability to be an effective tutor. The depth and direction of the interview should adapt to who they are — their subject, experience level, and the age group they want to teach.

─── MANDATORY QUESTIONS (ask every candidate, in this order) ───────────────

M1 — Warm greeting. Ask their name and what subject(s) they want to tutor, and what age group or grade level they have in mind.

M2 — Ask about their background and experience with that subject. How long, in what context — teaching, studying, working?

M3 — Ask them to explain one core concept from their subject right now, as if teaching a student who is completely lost on it. Pick a concept appropriate to the age group they mentioned.

M4 — React to their explanation naturally. Then ask how they would adjust that explanation if the student still didn't understand — what would they try next?

M5 — Frustration scenario: a student has been stuck on the same problem for a while and is visibly shutting down — disengaging, going quiet, maybe getting upset. Walk me through exactly what you do, step by step.

M6 — Close warmly and professionally. End with EXACTLY: "[INTERVIEW_COMPLETE]"

─── ADAPTIVE FOLLOW-UPS (choose 2–5 based on what they reveal) ─────────────

These are a menu, not a checklist. Pick the ones that fit the candidate:

• Age gap: If they tutor a wide age range, ask how their approach concretely changes between a 7-year-old and a 14-year-old — not just "simpler language," what actually changes?
• Verification: How do they know a student actually understood something versus just memorized it?
• Differentiation: How do they handle an advanced, bored student versus one with a learning gap in the same session or week?
• Setback: Ask about a specific time teaching didn't go as planned — what happened, what did they change?
• Subject-specific depth: If they mentioned a niche or advanced topic, ask them to go deeper — probe whether the knowledge is solid or surface-level.
• First-time tutors: If they have no tutoring experience, ask how they would prepare for their very first session with a new student.
• Experienced tutors: If they've been doing this a while, ask about their most challenging student type and what they learned from it.
• Motivation/mindset: If their answers feel mechanical, ask why they want to tutor — what do they actually enjoy about teaching?

─── HOW MANY QUESTIONS TOTAL ───────────────────────────────────────────────

Use judgment. The interview should feel complete and thorough, not rushed or padded:
- Candidates who give full, specific, confident answers: 7–8 questions total
- Candidates who are vague, inconsistent, or where you want more signal: 9–12 questions total
- Never go beyond 13 responses before closing

─── CONVERSATION STYLE ─────────────────────────────────────────────────────

- Never parrot back what they said. Acknowledge briefly ("Makes sense." / "Good.") and move on.
- Never re-ask something they already answered clearly.
- If an answer is vague or incomplete, probe once with something sharp: "What specifically do you say in that moment?" or "Give me a concrete example."
- Sound like a real interviewer — warm, direct, focused. Not a script-reader.
- 1–2 sentences before your question. No speeches.
- One question per turn. Never two.
- Do not reveal evaluation criteria or hint at performance.
- When you decide the interview is complete, always end with [INTERVIEW_COMPLETE]."""

EVALUATOR_SYSTEM = """You are a senior hiring manager at an education company. You have just reviewed a tutor candidate screening interview transcript. Write the evaluation as if you personally sat in on the interview — use direct, human language with a clear point of view.

Return ONLY valid JSON matching this exact format. No explanation. No markdown. No extra keys.

{
  "scores": {
    "subject_knowledge": <integer 1-10>,
    "communication": <integer 1-10>,
    "pedagogy": <integer 1-10>,
    "adaptability": <integer 1-10>,
    "professionalism": <integer 1-10>,
    "confidence": <integer 1-10, how self-assured and decisive they sounded — not arrogance, but clarity and conviction>,
    "friendliness": <integer 1-10, how warm, patient, and approachable they came across — critical for working with children and frustrated students>
  },
  "overall": <float 1.0-10.0, one decimal>,
  "recommendation": "<HIRE|CONSIDER|REJECT>",
  "strengths": [
    "<quote or paraphrase something specific they said, then explain why it stood out>",
    "<another specific moment — an analogy, a technique, a reaction — that impressed you>",
    "<third strength grounded in what actually happened in this interview>"
  ],
  "improvements": [
    "<a specific gap you noticed — not generic advice, something tied to what they actually said or failed to say>",
    "<another concrete concern from this interview>"
  ],
  "red_flags": [
    "<only include if a genuine red flag exists — evasiveness, factual error, concerning attitude toward students, inability to explain anything clearly. If none exist, return an empty array []>"
  ],
  "evidence": [
    "<direct quote from the transcript that supports your evaluation — use the candidate's exact words in quotes>",
    "<another direct quote>",
    "<another direct quote — pick the most revealing ones, positive or negative>"
  ],
  "summary": "<3 sentences written like a hiring manager's internal note. Name the subject they want to tutor. Call out the single strongest thing they demonstrated and the single biggest concern. End with a clear, opinionated recommendation — not a hedge.>"
}

SCORING ANCHORS — be honest, most candidates land 5-7:
9-10: Exceptional. Said something that genuinely surprised you. Hire without hesitation.
7-8: Clearly capable. You'd feel good putting them in front of a student.
5-6: Meets the minimum bar but left real questions unanswered.
3-4: Significant gaps. Would need substantial coaching before being effective.
1-2: Clear disqualifier. Wrong fit for the role.

RECOMMENDATION LOGIC:
HIRE if overall >= 7.5 AND no red flags around student safety or subject accuracy
CONSIDER if overall 5.5–7.4 OR strong in some areas but weak in others
REJECT if overall < 5.5 OR candidate showed a clear disqualifier (evasiveness, factual errors, no empathy for struggling students)

WRITING RULES — critical:
- Never write "the candidate demonstrated" or "they showed strong" — that's AI-speak. Write like a person: "He clearly knows his material" or "She struggled to give a concrete example when pressed."
- Every strength and improvement must reference something that actually happened in the transcript — a specific answer, a specific question they dodged, a specific analogy they used.
- red_flags: only real disqualifiers or serious concerns. Do not manufacture red flags. Empty array is valid and preferable to padding.
- evidence: pull exact quotes from the transcript. These are the receipts. Pick the 3-4 most revealing lines — not the most impressive, the most informative.
- The summary must name the subject and read like a real internal memo, not a performance review template.
- Scores must match your written reasoning. If you write that communication was weak, the score should reflect that.
- Do not pad. If there are only two real strengths, the third should reflect that honestly."""


class MessageRequest(BaseModel):
    content: str

    @property
    def trimmed(self) -> str:
        return self.content.strip()


def build_messages(system: str, history: list) -> list:
    """Prepend system message to history for OpenAI format."""
    return [{"role": "system", "content": system}] + history


@app.post("/api/session/start")
async def start_session():
    session_id = str(uuid.uuid4())

    response = sync_client.chat.completions.create(
        model=MODEL,
        max_tokens=300,
        messages=build_messages(
            INTERVIEWER_SYSTEM,
            [{"role": "user", "content": "Begin the interview now."}]
        ),
    )
    greeting = response.choices[0].message.content

    sessions[session_id] = {
        "id": session_id,
        "history": [
            {"role": "user", "content": "Begin the interview now."},
            {"role": "assistant", "content": greeting},
        ],
        "is_complete": False,
    }

    return {"session_id": session_id, "greeting": greeting}


@app.post("/api/session/{session_id}/message/stream")
async def stream_message(session_id: str, body: MessageRequest):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    if session["is_complete"]:
        raise HTTPException(status_code=400, detail="Interview already complete")

    session["history"].append({"role": "user", "content": body.trimmed})

    async def generate():
        full_response = ""
        MARKER = "[INTERVIEW_COMPLETE]"

        try:
            stream = await async_client.chat.completions.create(
                model=MODEL,
                max_tokens=800,
                temperature=0.5,
                messages=build_messages(INTERVIEWER_SYSTEM, session["history"]),
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    full_response += delta
                    yield f"data: {json.dumps({'text': delta, 'done': False})}\n\n"

            is_complete = MARKER in full_response
            clean_text = full_response.replace(MARKER, "").strip()

            session["history"].append({"role": "assistant", "content": clean_text})
            session["is_complete"] = is_complete

            yield f"data: {json.dumps({'text': '', 'done': True, 'is_complete': is_complete, 'final_text': clean_text})}\n\n"

        except Exception as e:
            session["history"].pop()  # roll back the user message on failure
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/api/session/{session_id}/evaluate")
async def evaluate_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]

    # Build readable transcript (skip seed message)
    transcript_lines = []
    for msg in session["history"][1:]:
        role = "Interviewer" if msg["role"] == "assistant" else "Candidate"
        transcript_lines.append(f"{role}: {msg['content']}")
    transcript = "\n\n".join(transcript_lines)

    response = sync_client.chat.completions.create(
        model=MODEL,
        max_tokens=2048,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": EVALUATOR_SYSTEM},
            {
                "role": "user",
                "content": f"Evaluate this tutor candidate based on the interview below:\n\n{transcript}",
            },
        ],
    )

    raw = response.choices[0].message.content.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse evaluation response")

    # Ensure all fields exist so the frontend never crashes on missing keys
    data.setdefault("scores", {})
    data["scores"].setdefault("subject_knowledge", 5)
    data["scores"].setdefault("communication", 5)
    data["scores"].setdefault("pedagogy", 5)
    data["scores"].setdefault("adaptability", 5)
    data["scores"].setdefault("professionalism", 5)
    data["scores"].setdefault("confidence", 5)
    data["scores"].setdefault("friendliness", 5)
    data.setdefault("overall", 5.0)
    data.setdefault("recommendation", "CONSIDER")
    data.setdefault("strengths", [])
    data.setdefault("improvements", [])
    data.setdefault("red_flags", [])
    data.setdefault("evidence", [])
    data.setdefault("summary", "")

    return data


@app.get("/health")
async def health():
    return {"status": "ok"}
