// Lever (lever.co) filler
// Lever uses a consistent field schema: name, email, phone, org (current company),
// and a "urls" object for LinkedIn, GitHub, Portfolio, etc.

async function fillLever(profile) {
  let filled = 0;
  let delay  = 0;

  const FIELDS = [
    // Full name (Lever uses a single name field)
    {
      sels: ['input[name="name"]', '#name', 'input[id="name"]', 'input[placeholder*="name" i]'],
      val: profile.full_name,
    },
    {
      sels: ['input[name="email"]', '#email', 'input[type="email"]'],
      val: profile.email,
    },
    {
      sels: ['input[name="phone"]', '#phone', 'input[type="tel"]', 'input[placeholder*="phone" i]'],
      val: profile.phone_formatted,
    },
    // Current company / org
    {
      sels: ['input[name="org"]', '#org', 'input[placeholder*="company" i]', 'input[placeholder*="organization" i]'],
      val: profile.experience[0].company,
    },
    // URLs object
    {
      sels: ['input[name="urls[LinkedIn]"]', 'input[id*="linkedin" i]', 'input[placeholder*="linkedin" i]'],
      val: profile.linkedin,
    },
    {
      sels: ['input[name="urls[GitHub]"]', 'input[id*="github" i]', 'input[placeholder*="github" i]'],
      val: profile.github,
    },
    {
      sels: ['input[name="urls[Portfolio]"]', 'input[name="urls[Website]"]', 'input[id*="portfolio" i]', 'input[id*="website" i]'],
      val: profile.website,
    },
    // Location
    {
      sels: ['input[name="location"]', 'input[id*="location" i]', 'input[placeholder*="location" i]'],
      val: profile.location,
    },
  ];

  for (const { sels, val } of FIELDS) {
    if (!val) continue;
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const skip = shouldSkip(el);
      if (skip === 'hard') break;
      if (el.value && el.value.trim()) break;
      await fillField(el, val, delay);
      filled++; delay += 80;
      break;
    }
  }

  // ── Additional questions (Lever appends custom fields at the bottom) ─────
  const extras = document.querySelectorAll(
    '.application-additional-information input:not([type="hidden"]):not([type="file"]), ' +
    '.application-additional-information textarea, ' +
    '.application-additional-information select, ' +
    '[class*="additional"] input:not([type="hidden"]), ' +
    '[class*="additional"] select'
  );

  for (const el of extras) {
    const skip = shouldSkip(el);
    if (skip === 'hard') continue;
    if (skip === 'yellow') { flashYellow(el); continue; }
    const label = getFieldLabel(el);
    if (SKIP_PATTERNS.some(p => p.test(label))) { flashYellow(el); continue; }
    // Unknown extra fields → yellow
    if (!el.value || !el.value.trim()) flashYellow(el);
  }

  // ── Work auth selects anywhere on page ──────────────────────────────────
  for (const sel of document.querySelectorAll('select')) {
    const label = getFieldLabel(sel);
    if (/authorized|work\s*auth|legally/i.test(label)) {
      const ok = await fillSelect(sel, 'Yes', delay);
      if (ok) { filled++; delay += 80; }
    } else if (/sponsor|visa/i.test(label)) {
      const ok = await fillSelect(sel, 'No', delay);
      if (ok) { filled++; delay += 80; }
    }
  }

  return filled;
}
