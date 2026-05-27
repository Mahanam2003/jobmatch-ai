// ─── Constants ────────────────────────────────────────────────────────────────

const SKIP_PATTERNS = [
  /cover\s*letter/i,
  /why\s*(do\s*you\s*want|this\s*company|are\s*you\s*interested|us\b|choose|apply|join)/i,
  /additional\s*information/i,
  /motivation\s*letter/i,
  /tell\s*us\s*why/i,
  /what\s*(interests|excites|attracts)\s*you/i,
  /anything\s*else/i,
];

const FORBIDDEN_TYPES = new Set(['password', 'hidden', 'file', 'submit', 'button', 'reset']);
const PAYMENT_PATTERN = /credit\s*card|card\s*(number|num)|cvv|cvc|expir(ation|y)|billing\s*address|bank\s*(account|routing)/i;

// ─── Field-label extraction ───────────────────────────────────────────────────

function getFieldLabel(el) {
  // aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  // aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).map(id => {
      const node = document.getElementById(id);
      return node ? node.textContent.trim() : '';
    });
    const joined = parts.filter(Boolean).join(' ');
    if (joined) return joined;
  }

  // placeholder
  if (el.placeholder) return el.placeholder.trim();

  // <label for="...">
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.textContent.trim();
  }

  // name attribute
  if (el.name) return el.name.replace(/[_\-\[\]]/g, ' ').trim();

  // Walk up to find a label sibling or ancestor text
  let node = el.parentElement;
  for (let depth = 0; depth < 6; depth++) {
    if (!node) break;
    // sibling label
    const sibLabel = node.querySelector('label');
    if (sibLabel && !sibLabel.contains(el)) return sibLabel.textContent.trim();
    // generic label-like span
    const spans = node.querySelectorAll('[class*="label" i], [class*="Label"]');
    for (const s of spans) {
      if (!s.contains(el)) return s.textContent.trim();
    }
    node = node.parentElement;
  }

  return '';
}

// ─── Skip logic ───────────────────────────────────────────────────────────────

function shouldSkip(el) {
  const type = (el.type || '').toLowerCase();
  if (FORBIDDEN_TYPES.has(type)) return 'hard';

  const combined = [el.name, el.id, el.placeholder, el.getAttribute('aria-label') || ''].join(' ');
  if (PAYMENT_PATTERN.test(combined)) return 'hard';

  const label = getFieldLabel(el);
  if (SKIP_PATTERNS.some(p => p.test(label))) return 'yellow';

  // Also skip by checking parent/ancestor text for skip patterns
  let node = el.parentElement;
  for (let i = 0; i < 4; i++) {
    if (!node) break;
    if (SKIP_PATTERNS.some(p => p.test(node.textContent))) return 'yellow';
    node = node.parentElement;
  }

  return null;
}

// ─── Fill helpers ─────────────────────────────────────────────────────────────

function fillField(el, value, delay = 0) {
  return new Promise(resolve => {
    setTimeout(() => {
      try {
        // Use the native setter so React/Vue synthetic events fire correctly
        const proto = el.tagName === 'TEXTAREA'
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        if (descriptor && descriptor.set) {
          descriptor.set.call(el, value);
        } else {
          el.value = value;
        }

        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur',   { bubbles: true }));
        flashGreen(el);
        resolve(true);
      } catch (_) {
        resolve(false);
      }
    }, delay);
  });
}

function fillSelect(el, value, delay = 0) {
  return new Promise(resolve => {
    setTimeout(() => {
      try {
        const opts = Array.from(el.options);
        const needle = value.toLowerCase();
        const match = opts.find(o =>
          o.text.toLowerCase().includes(needle) ||
          o.value.toLowerCase().includes(needle)
        );
        if (match) {
          el.value = match.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          flashGreen(el);
          resolve(true);
        } else {
          flashYellow(el);
          resolve(false);
        }
      } catch (_) {
        resolve(false);
      }
    }, delay);
  });
}

// ─── Visual feedback ──────────────────────────────────────────────────────────

function flashGreen(el) {
  const prev = el.style.outline;
  const prevOffset = el.style.outlineOffset;
  el.style.outline = '2px solid #22c55e';
  el.style.outlineOffset = '1px';
  setTimeout(() => {
    el.style.outline = prev;
    el.style.outlineOffset = prevOffset;
  }, 3000);
}

function flashYellow(el) {
  el.style.outline = '2px solid #eab308';
  el.style.outlineOffset = '1px';
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg) {
  document.getElementById('autoapply-toast')?.remove();

  const t = document.createElement('div');
  t.id = 'autoapply-toast';
  Object.assign(t.style, {
    position:   'fixed',
    top:        '16px',
    right:      '16px',
    background: '#111827',
    color:      '#f9fafb',
    border:     '1px solid #374151',
    borderLeft: '4px solid #22c55e',
    borderRadius: '8px',
    padding:    '11px 15px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize:   '13px',
    fontWeight: '500',
    zIndex:     '2147483647',
    boxShadow:  '0 8px 24px rgba(0,0,0,0.55)',
    maxWidth:   '340px',
    lineHeight: '1.45',
    opacity:    '1',
    transition: 'opacity 0.3s ease',
  });
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 320);
  }, 5000);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action !== 'autoFill') return;
  runAutoFill().then(result => sendResponse(result));
  return true; // keep channel open for async response
});

async function runAutoFill() {
  const host = window.location.hostname;
  let filled = 0;

  if      (host.includes('lifeattiktok.com'))   filled = await fillTikTok(PROFILE);
  else if (host.includes('linkedin.com'))        filled = await fillLinkedIn(PROFILE);
  else if (host.includes('handshake.com'))       filled = await fillHandshake(PROFILE);
  else if (host.includes('indeed.com'))          filled = await fillIndeed(PROFILE);
  else if (host.includes('greenhouse.io'))       filled = await fillGreenhouse(PROFILE);
  else if (host.includes('lever.co'))            filled = await fillLever(PROFILE);
  else                                            filled = await fillGeneric(PROFILE);

  showToast(`AutoApply: filled ${filled} field${filled !== 1 ? 's' : ''}`);
  return { filled };
}
