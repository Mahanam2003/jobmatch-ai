import json
import os
import re
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# ── Startup validation ─────────────────────────────────────────────────────────
api_key = os.getenv("ANTHROPIC_API_KEY", "")
if not api_key or api_key == "your_anthropic_api_key_here":
    raise RuntimeError(
        "ANTHROPIC_API_KEY is not set. "
        "Open jobmatch_api/.env and paste your key from console.anthropic.com"
    )

# ── Resume (loaded once at startup) ───────────────────────────────────────────
RESUME_TEXT = (Path(__file__).parent / "resume.txt").read_text(encoding="utf-8")

# ── Claude client ──────────────────────────────────────────────────────────────
client = anthropic.Anthropic(api_key=api_key)

# ── System prompt (cached — never changes between requests) ───────────────────
SYSTEM_PROMPT = """You are a senior technical recruiter with 10 years of experience hiring for \
top tech companies. You specialize in two role types:
1. Data/Sports Analytics internships — you know what hiring managers at sports \
organizations and analytics teams look for: SQL, Python, statistical modeling, \
data storytelling, domain knowledge.
2. Product Manager internships — you know what PM hiring managers want: \
user research, A/B testing, roadmap thinking, cross-functional collaboration, \
data-informed decisions, Figma, stakeholder communication.

You are reviewing the resume of Mahan Amiri, a University of Washington \
Informatics student (GPA 3.7, Dean's List) targeting internships in both \
Sports/Data Analytics and Product Management.

When given a job description, you:
1. Score the match from 0-100 based on keyword overlap, experience relevance, \
   and role fit
2. Identify the top 3-5 missing keywords or skills that an ATS would flag
3. Rewrite 2-3 of Mahan's existing bullet points to better match this specific \
   job — keep his real numbers and real experience, just reframe the language \
   and add missing keywords naturally
4. Give one sharp piece of advice a real recruiter would give

Be specific, brutally honest, and practical. Never invent experience Mahan \
doesn't have. Only reframe what's already there.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, no code fences.
Use exactly this structure:
{
  "match_score": <integer 0-100>,
  "verdict": "<Strong Match|Good Match|Weak Match>",
  "missing_keywords": ["keyword1", "keyword2", "keyword3"],
  "rewritten_bullets": [
    {
      "original": "...",
      "rewritten": "...",
      "reason": "..."
    }
  ],
  "top_advice": "..."
}"""

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="JobMatch AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    job_description: str


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        # Remove closing fence
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description cannot be empty")

    try:
        response = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=2048,
            # Cache the system prompt — it never changes between requests
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": [
                        # Cache the resume — same for every request
                        {
                            "type": "text",
                            "text": f"Here is the candidate's resume:\n\n{RESUME_TEXT}",
                            "cache_control": {"type": "ephemeral"},
                        },
                        # Job description is NOT cached — it changes every request
                        {
                            "type": "text",
                            "text": (
                                f"Here is the job description to analyze:\n\n"
                                f"{request.job_description}\n\n"
                                "Return JSON only."
                            ),
                        },
                    ],
                }
            ],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(
            status_code=500,
            detail="Invalid ANTHROPIC_API_KEY. Check your .env file.",
        )
    except anthropic.APIError as exc:
        raise HTTPException(status_code=500, detail=f"Claude API error: {exc}")

    raw = response.content[0].text
    try:
        return json.loads(_strip_fences(raw))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse Claude response as JSON: {exc}\n\nRaw: {raw[:500]}",
        )
