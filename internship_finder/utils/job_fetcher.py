import os
import requests
from dotenv import load_dotenv

load_dotenv()

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")
ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs/us/search/1"

# Each signal key maps to ordered candidate queries; first match per signal is used.
_KEYWORD_SIGNALS: dict[str, list[str]] = {
    "data":             ["data analyst intern", "data science intern", "data engineering intern"],
    "analytics":        ["analytics intern", "business intelligence intern"],
    "sports":           ["sports analytics intern", "sports analyst intern",
                         "performance analyst intern", "soccer analytics intern"],
    "machine learning": ["machine learning intern"],
    "python":           ["python developer intern"],
    "sql":              ["sql analyst intern"],
    "finance":          ["finance analyst intern"],
    "marketing":        ["marketing analytics intern"],
    "research":         ["research analyst intern"],
}

_FALLBACK_KEYWORDS = [
    "data analyst intern",
    "sports analyst intern",
    "business intelligence intern",
    "data science intern",
    "soccer analytics intern",
    "performance analyst intern",
    "research analyst intern",
]


def extract_keywords(text: str, max_keywords: int = 7) -> list[str]:
    text_lower = text.lower()
    found: list[str] = []
    seen_queries: set[str] = set()

    for signal, queries in _KEYWORD_SIGNALS.items():
        if signal in text_lower:
            for q in queries:
                if q not in seen_queries:
                    seen_queries.add(q)
                    found.append(q)
                    break  # one query per matched signal

        if len(found) >= max_keywords:
            break

    if not found:
        return _FALLBACK_KEYWORDS[:max_keywords]

    return found[:max_keywords]


def fetch_internships(
    keywords: list[str],
    location: str = "",
    results_per_page: int = 20,
) -> list[dict]:
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        raise ValueError(
            "Adzuna API credentials not found. "
            "Ensure ADZUNA_APP_ID and ADZUNA_APP_KEY are set in your .env file."
        )

    all_jobs: list[dict] = []
    seen_ids: set[str] = set()

    for keyword in keywords:
        params: dict = {
            "app_id": ADZUNA_APP_ID,
            "app_key": ADZUNA_APP_KEY,
            "results_per_page": results_per_page,
            "what": keyword,
            "content-type": "application/json",
        }
        if location.strip():
            params["where"] = location.strip()

        try:
            resp = requests.get(ADZUNA_BASE_URL, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except requests.HTTPError as exc:
            raise RuntimeError(
                f"Adzuna API error ({resp.status_code}): {resp.text}"
            ) from exc
        except requests.RequestException as exc:
            raise RuntimeError(f"Network error while fetching jobs: {exc}") from exc

        for job in data.get("results", []):
            job_id = job.get("id", "")
            if not job_id or job_id in seen_ids:
                continue
            seen_ids.add(job_id)
            all_jobs.append({
                "id": job_id,
                "title": job.get("title", "Unknown Title"),
                "company": (job.get("company") or {}).get("display_name", "Unknown Company"),
                "location": (job.get("location") or {}).get("display_name", "Unknown Location"),
                "description": job.get("description", "No description available."),
                "url": job.get("redirect_url", "#"),
                "source": "Adzuna",
            })

    return all_jobs
