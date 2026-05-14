const API_URL = 'http://localhost:8000/analyze';
const CIRCUMFERENCE = 175.93; // 2 * π * 28

// ── View manager ──────────────────────────────────────────────────────────────
const VIEWS = ['initial', 'loading', 'error', 'results'];

function showView(name) {
  for (const id of VIEWS) {
    document.getElementById(`view-${id}`).classList.toggle('hidden', id !== name);
  }
}

// ── Job description extractor (injected into page via executeScript) ──────────
function extractJobDescriptionFromPage() {
  const selectors = [
    // LinkedIn
    '.jobs-description__content',
    '.jobs-box__html-content',
    '[class*="jobs-description__container"]',
    // Handshake
    '.job-description',
    '[data-hook="job-description"]',
    // Indeed
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    // Greenhouse
    '#content .job__description',
    '.job__description',
    // Lever
    '[data-qa="job-description"]',
    // Generic
    '#content',
    '.content',
  ];

  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.innerText.trim();
        if (text.length > 150) return text.substring(0, 9000);
      }
    } catch (_) {}
  }

  // Fallback: largest non-nav block
  const SKIP = new Set(['NAV', 'HEADER', 'FOOTER', 'SCRIPT', 'STYLE', 'NOSCRIPT']);
  let best = null, bestLen = 0;
  for (const el of document.querySelectorAll('div, section, article, main')) {
    if (SKIP.has(el.tagName) || el.closest('nav, header, footer')) continue;
    const t = el.innerText.trim();
    if (t.length > bestLen && t.length > 300) { bestLen = t.length; best = el; }
  }
  return best ? best.innerText.trim().substring(0, 9000) : null;
}

// ── Score ring renderer ───────────────────────────────────────────────────────
function renderScore(score) {
  const numEl    = document.getElementById('scoreNumber');
  const arcEl    = document.getElementById('scoreArc');
  const verdictEl = document.getElementById('verdictLine');

  // Remove previous color classes
  arcEl.classList.remove('s-green', 's-yellow', 's-red');
  numEl.classList.remove('c-green', 'c-yellow', 'c-red');
  verdictEl.classList.remove('c-green', 'c-yellow', 'c-red');

  numEl.textContent = score;
  arcEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);

  let colorClass, label;
  if (score >= 80)      { colorClass = 'green';  label = 'Strong Match'; }
  else if (score >= 60) { colorClass = 'yellow'; label = 'Good Match';   }
  else                  { colorClass = 'red';    label = 'Weak Match';   }

  arcEl.classList.add(`s-${colorClass}`);
  numEl.classList.add(`c-${colorClass}`);
  verdictEl.classList.add(`c-${colorClass}`);
  verdictEl.textContent = label;
}

// ── Safe HTML helpers ─────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render missing keywords ───────────────────────────────────────────────────
function renderKeywords(keywords) {
  const container = document.getElementById('chipsContainer');
  container.innerHTML = '';
  if (!keywords?.length) {
    container.innerHTML = '<span class="chip-none">None flagged — great coverage! 🎉</span>';
    return;
  }
  for (const kw of keywords) {
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = kw;
    container.appendChild(span);
  }
}

// ── Render rewritten bullets ──────────────────────────────────────────────────
function renderBullets(bullets) {
  const container = document.getElementById('bulletsContainer');
  container.innerHTML = '';
  if (!bullets?.length) return;

  for (const b of bullets) {
    const card = document.createElement('div');
    card.className = 'bullet-card';
    card.innerHTML = `
      <div class="b-label">Original</div>
      <div class="b-text b-original">${esc(b.original)}</div>
      <div class="b-divider"></div>
      <div class="b-label">Rewritten</div>
      <div class="b-text b-rewritten" id="btext-${container.children.length}">${esc(b.rewritten)}</div>
      <div class="b-footer">
        <div class="b-reason">${esc(b.reason)}</div>
        <button class="copy-btn">Copy</button>
      </div>
    `;
    const copyBtn = card.querySelector('.copy-btn');
    const rewrittenText = b.rewritten;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(rewrittenText);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
      } catch (_) {
        copyBtn.textContent = 'Error';
      }
    });
    container.appendChild(card);
  }
}

// ── Error display ─────────────────────────────────────────────────────────────
function showError(message, isApiUnreachable = false) {
  document.getElementById('error-message').textContent = message;
  document.getElementById('cmd-hint').classList.toggle('hidden', !isApiUnreachable);
  showView('error');
}

// ── Main analyze pipeline ─────────────────────────────────────────────────────
async function analyze() {
  showView('loading');

  // 1. Get active tab
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
  } catch (e) {
    showError('Cannot access the current tab.');
    return;
  }

  // 2. Extract job description from page
  let jobDescription = null;

  // Primary: executeScript (works on any page with activeTab permission)
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractJobDescriptionFromPage,
    });
    jobDescription = results?.[0]?.result ?? null;
  } catch (_) {
    // Fallback: message passing to content.js (already injected on known sites)
    try {
      jobDescription = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: 'getJobDescription' }, (res) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(res?.jobDescription ?? null);
        });
      });
    } catch (_) {}
  }

  if (!jobDescription) {
    showError(
      'No job description found on this page.\n\n' +
      'Make sure you\'re on a job posting (not a search results page), ' +
      'scroll down to fully load the description, then try again.'
    );
    return;
  }

  // 3. POST to local API
  let data;
  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: jobDescription }),
    });

    if (!resp.ok) {
      let detail = resp.statusText;
      try { const body = await resp.json(); detail = body.detail ?? detail; } catch (_) {}
      throw new Error(`Server error ${resp.status}: ${String(detail).substring(0, 200)}`);
    }

    data = await resp.json();
  } catch (e) {
    const isNetwork = e instanceof TypeError;
    showError(
      isNetwork
        ? 'Cannot reach the local API server.\nMake sure it\'s running:'
        : e.message,
      isNetwork
    );
    return;
  }

  // 4. Render results
  renderScore(data.match_score ?? 0);
  renderKeywords(data.missing_keywords ?? []);
  renderBullets(data.rewritten_bullets ?? []);
  document.getElementById('adviceBox').textContent = data.top_advice ?? '';
  showView('results');
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('analyzeBtn').addEventListener('click', analyze);

document.getElementById('retryBtn').addEventListener('click', () => showView('initial'));

document.getElementById('resetBtn').addEventListener('click', () => {
  // Clear color state from arc before going back
  document.getElementById('scoreArc').classList.remove('s-green', 's-yellow', 's-red');
  document.getElementById('scoreArc').style.strokeDashoffset = CIRCUMFERENCE;
  showView('initial');
});
