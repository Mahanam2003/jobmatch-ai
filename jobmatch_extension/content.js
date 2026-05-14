// Runs in the page context on known job sites.
// popup.js uses chrome.scripting.executeScript as its primary extraction path;
// this message listener is a fallback for future background-script usage.

function extractJobDescription() {
  const selectors = [
    // LinkedIn
    '.jobs-description__content',
    '.jobs-box__html-content',
    '[class*="jobs-description"]',
    // Handshake
    '.job-description',
    '[data-hook="job-description"]',
    '[data-bind="html: description"]',
    // Indeed
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    // Greenhouse
    '#content .job__description',
    '.job__description',
    // Lever
    '[data-qa="job-description"]',
    '.content[class*="description"]',
    // Generic fallbacks
    '#content',
    '.content',
    '[class*="description"]',
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

  // Last resort: largest non-nav text block on the page
  const SKIP_TAGS = new Set(['NAV', 'HEADER', 'FOOTER', 'SCRIPT', 'STYLE', 'NOSCRIPT']);
  let best = null;
  let bestLen = 0;

  for (const el of document.querySelectorAll('div, section, article, main')) {
    if (SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest('nav, header, footer')) continue;
    const text = el.innerText.trim();
    if (text.length > bestLen && text.length > 300) {
      bestLen = text.length;
      best = el;
    }
  }

  return best ? best.innerText.trim().substring(0, 9000) : null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getJobDescription') {
    sendResponse({ jobDescription: extractJobDescription() });
  }
  return true;
});
