# Internship Finder

A Streamlit app that reads your resume and cover letter, then finds and ranks
internship listings from the Adzuna job API using semantic similarity.

---

## Setup

### 1. Prerequisites

- Python 3.10 or newer
- pip

### 2. Create a virtual environment (recommended)

```bash
cd "internship_finder"
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

> **Note:** `sentence-transformers` will download the `all-MiniLM-L6-v2` model
> (~90 MB) on first run. An internet connection is required.

### 4. Configure API keys

The `.env` file in this folder already contains the Adzuna credentials:

```
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
```

If you ever need to replace them, get free credentials at
https://developer.adzuna.com/.

### 5. Run the app

```bash
streamlit run app.py
```

The app opens automatically at `http://localhost:8501`.

---

## Usage

1. Click **Browse files** under *Resume (PDF)* and upload your resume.
2. Optionally upload a cover letter PDF.
3. Click **Find Internships**.
4. The app will:
   - Extract text from your PDFs
   - Generate a semantic embedding of your profile
   - Query Adzuna for internships matching keywords found in your resume
   - Rank every result by cosine similarity against your profile
   - Display the top 20 matches with title, company, location, match score, and an Apply link

---

## Project structure

```
internship_finder/
├── app.py               # Streamlit UI and pipeline orchestration
├── utils/
│   ├── pdf_parser.py    # pdfplumber text extraction
│   ├── embedder.py      # sentence-transformers wrapper (all-MiniLM-L6-v2)
│   ├── job_fetcher.py   # Adzuna API client + keyword extraction
│   └── matcher.py       # cosine similarity ranking
├── .env                 # API credentials (do not commit to git)
├── requirements.txt
└── README.md
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Could not extract text from resume" | Your PDF may be scanned. Use a text-based PDF. |
| "Adzuna API error (401)" | Check that APP_ID and APP_KEY in `.env` are correct. |
| "No internships returned" | The Adzuna free tier is US-only. Ensure your search keywords are relevant. |
| Slow first run | The embedding model is being downloaded (~90 MB). Subsequent runs are fast. |
