// Handshake (joinhandshake.com) filler

async function fillHandshake(profile) {
  let filled = 0;
  let delay  = 0;

  // Ordered list of [ selectors[], value ]
  const FIELDS = [
    {
      sels: ['input[name*="first_name" i]', 'input[id*="first_name" i]', 'input[placeholder*="First" i]'],
      val: profile.first_name,
    },
    {
      sels: ['input[name*="last_name" i]', 'input[id*="last_name" i]', 'input[placeholder*="Last" i]'],
      val: profile.last_name,
    },
    {
      sels: ['input[name*="email" i]', 'input[type="email"]', 'input[id*="email" i]'],
      val: profile.email,
    },
    {
      sels: ['input[name*="phone" i]', 'input[id*="phone" i]', 'input[type="tel"]', 'input[placeholder*="phone" i]'],
      val: profile.phone_formatted,
    },
    {
      sels: ['input[name*="linkedin" i]', 'input[id*="linkedin" i]', 'input[placeholder*="LinkedIn" i]'],
      val: profile.linkedin,
    },
    {
      sels: ['input[name*="github" i]', 'input[id*="github" i]'],
      val: profile.github,
    },
    {
      sels: ['input[name*="website" i]', 'input[id*="website" i]', 'input[name*="portfolio" i]'],
      val: profile.website,
    },
    {
      sels: ['input[name*="gpa" i]', 'input[id*="gpa" i]'],
      val: profile.education[0].gpa,
    },
    {
      sels: ['input[name*="city" i]', 'input[id*="city" i]', 'input[placeholder*="City" i]'],
      val: profile.city,
    },
    {
      sels: ['input[name*="location" i]', 'input[id*="location" i]'],
      val: profile.location,
    },
    {
      sels: ['input[name*="school" i]', 'input[id*="school" i]', 'input[placeholder*="school" i]'],
      val: profile.education[0].school,
    },
    {
      sels: ['input[name*="major" i]', 'input[id*="major" i]', 'input[name*="field" i]'],
      val: profile.education[0].field,
    },
  ];

  for (const { sels, val } of FIELDS) {
    if (!val) continue;
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const skip = shouldSkip(el);
      if (skip === 'hard') break;
      if (skip === 'yellow') { flashYellow(el); break; }
      if (el.value && el.value.trim()) break; // already filled
      await fillField(el, val, delay);
      filled++; delay += 80;
      break;
    }
  }

  // ── Work authorization selects / radios ─────────────────────────────────
  document.querySelectorAll('select').forEach(async sel => {
    const label = getFieldLabel(sel);
    if (/authorized|work\s*auth/i.test(label)) {
      const ok = await fillSelect(sel, 'Yes', delay);
      if (ok) { filled++; delay += 80; }
    } else if (/sponsor|visa/i.test(label)) {
      const ok = await fillSelect(sel, 'No', delay);
      if (ok) { filled++; delay += 80; }
    }
  });

  // ── Yellow-flag skip fields ──────────────────────────────────────────────
  document.querySelectorAll('textarea').forEach(ta => {
    const label = getFieldLabel(ta);
    if (SKIP_PATTERNS.some(p => p.test(label))) {
      flashYellow(ta);
    }
  });

  return filled;
}
