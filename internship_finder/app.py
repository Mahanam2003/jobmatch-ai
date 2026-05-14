import re
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

from utils.pdf_parser import extract_text_from_pdf
from utils.embedder import embed_text
from utils.job_fetcher import extract_keywords, fetch_internships
from utils.serp_fetcher import fetch_serp_jobs
from utils.matcher import rank_jobs

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Internship Finder",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Styles ─────────────────────────────────────────────────────────────────────
st.markdown(
    """
    <style>
    .job-card {
        background: #1e1e2e;
        border: 1px solid #313244;
        border-radius: 12px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 1rem;
    }
    .job-title  { font-size: 1.1rem;  font-weight: 700; color: #cdd6f4; }
    .job-meta   { font-size: 0.88rem; color: #a6adc8; margin: 0.25rem 0 0.5rem; }
    .job-desc   { font-size: 0.88rem; color: #bac2de; line-height: 1.55; }
    .score-label{ font-size: 0.85rem; color: #89b4fa; font-weight: 600; }
    /* Source badges */
    .badge {
        display: inline-block;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        margin-left: 0.5rem;
        vertical-align: middle;
    }
    .badge-linkedin  { background: #0a66c2; color: #fff; }
    .badge-handshake { background: #7c3aed; color: #fff; }
    .badge-adzuna    { background: #ea580c; color: #fff; }
    /* Apply button */
    a.apply-btn {
        display: inline-block;
        margin-top: 0.6rem;
        padding: 0.35rem 0.9rem;
        background: #89b4fa;
        color: #1e1e2e !important;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        text-decoration: none;
    }
    a.apply-btn:hover { background: #b4befe; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## ⚙️ Search Options")
    location_input = st.text_input(
        "Location filter",
        placeholder='e.g. "Seattle, WA" or "Remote"',
        help="Leave blank to search nationwide. Injected into all queries.",
    )
    st.markdown("---")
    st.markdown(
        "**Sources searched:**\n"
        "- 🟠 Adzuna (job board API)\n"
        "- 🔵 LinkedIn Jobs (via SerpAPI)\n"
        "- 🟣 Handshake (via SerpAPI)\n"
    )
    st.markdown(
        "Results from all three sources are merged, "
        "deduplicated, and ranked by semantic similarity."
    )

# ── Header ─────────────────────────────────────────────────────────────────────
st.markdown("# 🎓 Internship Finder")
st.markdown(
    "Upload your **resume** (required) and optionally a **cover letter** to discover "
    "internships ranked by how well they match your background."
)
st.divider()

# ── File upload ────────────────────────────────────────────────────────────────
col_l, col_r = st.columns(2)
with col_l:
    resume_file = st.file_uploader("Resume (PDF) — required", type=["pdf"])
with col_r:
    cover_letter_file = st.file_uploader("Cover Letter (PDF) — optional", type=["pdf"])

st.markdown("")
run = st.button("🔍  Find Internships", type="primary", disabled=resume_file is None)

if resume_file is None:
    st.caption("Upload your resume PDF to get started.")


# ── Helpers ────────────────────────────────────────────────────────────────────
_BADGE_CLASS = {
    "LinkedIn":  "badge-linkedin",
    "Handshake": "badge-handshake",
    "Adzuna":    "badge-adzuna",
}


def _source_badge(source: str) -> str:
    css = _BADGE_CLASS.get(source, "badge-adzuna")
    return f'<span class="badge {css}">{source}</span>'


def _dedup_key(job: dict) -> str:
    title   = re.sub(r"\s+", " ", job.get("title",   "")).strip().lower()
    company = re.sub(r"\s+", " ", job.get("company", "")).strip().lower()
    return f"{title}|{company}"


def _merge_and_deduplicate(job_lists: list[list[dict]]) -> list[dict]:
    merged: list[dict] = []
    seen_urls: set[str] = set()
    seen_title_company: set[str] = set()

    for jobs in job_lists:
        for job in jobs:
            url = job.get("url", "")

            # URL-level dedup (catches exact duplicates across sources)
            if url and url != "#":
                if url in seen_urls:
                    continue
                seen_urls.add(url)

            # title+company dedup (catches same job posted in multiple places)
            company = job.get("company", "Unknown Company")
            if company != "Unknown Company":
                key = _dedup_key(job)
                if key in seen_title_company:
                    continue
                seen_title_company.add(key)

            merged.append(job)

    return merged


# ── Main pipeline ──────────────────────────────────────────────────────────────
if run and resume_file is not None:
    location = location_input.strip()

    # 1. Extract text
    with st.spinner("Extracting text from your documents…"):
        resume_text = extract_text_from_pdf(resume_file)
        if not resume_text:
            st.error(
                "Could not extract text from your resume. "
                "Please make sure it is a text-based PDF (not a scanned image)."
            )
            st.stop()

        combined_text = resume_text
        if cover_letter_file:
            cl_text = extract_text_from_pdf(cover_letter_file)
            if cl_text:
                combined_text = resume_text + "\n\n" + cl_text

    # 2. Embed user documents
    with st.spinner("Generating semantic embedding for your documents…"):
        user_embedding = embed_text(combined_text)

    # 3. Extract multi-role keywords
    keywords = extract_keywords(combined_text)
    loc_label = f" in **{location}**" if location else " (nationwide)"
    st.info(
        f"**{len(keywords)} search roles extracted{loc_label}:**  \n"
        + "  \n".join(f"- {kw}" for kw in keywords)
    )

    # 4a. Fetch from Adzuna
    adzuna_jobs: list[dict] = []
    with st.spinner(f"Fetching from Adzuna ({len(keywords)} queries)…"):
        try:
            adzuna_jobs = fetch_internships(keywords, location=location)
        except (ValueError, RuntimeError) as exc:
            st.warning(f"Adzuna fetch failed: {exc}")

    # 4b. Fetch from SerpAPI (LinkedIn + Handshake)
    serp_jobs: list[dict] = []
    with st.spinner(
        f"Fetching from LinkedIn & Handshake via SerpAPI "
        f"({len(keywords) * 2} queries)…"
    ):
        try:
            serp_jobs = fetch_serp_jobs(keywords, location=location)
        except (ValueError, RuntimeError) as exc:
            st.warning(f"SerpAPI fetch failed (LinkedIn/Handshake results skipped): {exc}")

    # 5. Merge & deduplicate
    all_jobs = _merge_and_deduplicate([adzuna_jobs, serp_jobs])

    if not all_jobs:
        st.warning(
            "No internships were found across any source. "
            "Try uploading a resume with more specific skills, or broaden your location."
        )
        st.stop()

    # 6. Rank by semantic similarity
    with st.spinner(f"Ranking {len(all_jobs)} listings by relevance to your profile…"):
        ranked = rank_jobs(user_embedding, all_jobs)

    # ── Source breakdown ───────────────────────────────────────────────────────
    source_counts: dict[str, int] = {}
    for j in all_jobs:
        src = j.get("source", "Adzuna")
        source_counts[src] = source_counts.get(src, 0) + 1

    breakdown = "  ·  ".join(
        f"{_source_badge(src)} {count}"
        for src, count in sorted(source_counts.items())
    )

    # ── Results ────────────────────────────────────────────────────────────────
    st.divider()
    display_count = min(len(ranked), 20)
    st.markdown(f"### Top {display_count} matched internships")
    st.markdown(
        f"{len(all_jobs)} total listings &nbsp;·&nbsp; "
        f"showing top {display_count} by semantic match &nbsp;·&nbsp; {breakdown}",
        unsafe_allow_html=True,
    )
    st.markdown("")

    for idx, job in enumerate(ranked[:display_count], start=1):
        score_pct = job["score"] * 100
        score_label = (
            "Excellent match" if score_pct >= 70
            else "Good match"    if score_pct >= 50
            else "Partial match"
        )
        source = job.get("source", "Adzuna")
        badge  = _source_badge(source)

        desc = job["description"]
        short_desc = desc[:320].rsplit(" ", 1)[0] + "…" if len(desc) > 320 else desc

        st.markdown(
            f"""
            <div class="job-card">
                <div class="job-title">{idx}. {job['title']}{badge}</div>
                <div class="job-meta">🏢 {job['company']} &nbsp;·&nbsp; 📍 {job['location']}</div>
                <div class="score-label">Match: {score_pct:.1f}% — {score_label}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.progress(min(job["score"], 1.0))

        with st.expander("Description & Apply", expanded=False):
            st.markdown(f"<div class='job-desc'>{short_desc}</div>", unsafe_allow_html=True)
            st.markdown(
                f'<a class="apply-btn" href="{job["url"]}" target="_blank">Apply Now →</a>',
                unsafe_allow_html=True,
            )
