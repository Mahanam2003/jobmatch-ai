import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY")
SERPAPI_URL = "https://serpapi.com/search.json"

_SOURCES = [
    ("LinkedIn",  "site:linkedin.com/jobs"),
    ("Handshake", "site:joinhandshake.com"),
]

# Suffixes Google appends to titles from these sites
_TITLE_SUFFIXES = [
    " - LinkedIn", " | LinkedIn",
    " - Handshake", " | Handshake",
    " - Jobs", " | Jobs",
]


def _build_query(site_filter: str, keyword: str, location: str) -> str:
    q = f'{site_filter} "{keyword}"'
    if location.strip():
        q += f' "{location.strip()}"'
    return q


def _clean_title(raw: str) -> str:
    for suffix in _TITLE_SUFFIXES:
        if raw.endswith(suffix):
            raw = raw[: -len(suffix)]
    return raw.strip()


def _extract_company(snippet: str) -> str:
    # Snippets often start with "Company · Location · …" or "Company — Location"
    parts = re.split(r"[·|—\-]", snippet, maxsplit=2)
    if len(parts) >= 2:
        candidate = parts[0].strip()
        words = candidate.split()
        if 1 <= len(words) <= 6 and len(candidate) <= 60:
            return candidate
    return "Unknown Company"


def fetch_serp_jobs(
    keywords: list[str],
    location: str = "",
    num_per_query: int = 10,
) -> list[dict]:
    if not SERPAPI_KEY:
        raise ValueError(
            "SERPAPI_KEY not found in .env. "
            "Add SERPAPI_KEY=<your_key> to internship_finder/.env."
        )

    all_jobs: list[dict] = []
    seen_urls: set[str] = set()

    for keyword in keywords:
        for source_name, site_filter in _SOURCES:
            params = {
                "engine": "google",
                "q": _build_query(site_filter, keyword, location),
                "api_key": SERPAPI_KEY,
                "num": num_per_query,
            }

            try:
                resp = requests.get(SERPAPI_URL, params=params, timeout=20)
                resp.raise_for_status()
                data = resp.json()
            except requests.HTTPError as exc:
                raise RuntimeError(
                    f"SerpAPI error ({resp.status_code}): {resp.text}"
                ) from exc
            except requests.RequestException as exc:
                raise RuntimeError(f"Network error calling SerpAPI: {exc}") from exc

            for result in data.get("organic_results", []):
                url = result.get("link", "#")
                if url in seen_urls:
                    continue
                seen_urls.add(url)

                snippet = result.get("snippet", "No description available.")
                all_jobs.append({
                    "id": url,
                    "title": _clean_title(result.get("title", "Unknown Title")),
                    "company": _extract_company(snippet),
                    "location": location.strip() or "See listing",
                    "description": snippet,
                    "url": url,
                    "source": source_name,
                })

    return all_jobs
