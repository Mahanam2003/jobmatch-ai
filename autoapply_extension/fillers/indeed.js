// Indeed (indeed.com) filler
// Indeed uses React and dynamically renders fields — field names follow
// a dotted-path convention like "applicant.name", "applicant.emailAddress".

async function fillIndeed(profile) {
  let filled = 0;
  let delay  = 0;

  const FIELDS = [
    // name (Indeed may show a single "name" field or split first/last)
    {
      sels: [
        'input[name="applicant.name"]',
        'input[id*="applicant-name" i]',
        'input[name*="fullName" i]',
        'input[placeholder*="Full name" i]',
      ],
      val: profile.full_name,
    },
    {
      sels: ['input[name*="firstName" i]', 'input[id*="firstName" i]', 'input[placeholder*="First name" i]'],
      val: profile.first_name,
    },
    {
      sels: ['input[name*="lastName" i]', 'input[id*="lastName" i]', 'input[placeholder*="Last name" i]'],
      val: profile.last_name,
    },
    // email
    {
      sels: [
        'input[name="applicant.emailAddress"]',
        'input[name*="email" i]',
        'input[type="email"]',
        'input[id*="email" i]',
      ],
      val: profile.email,
    },
    // phone
    {
      sels: [
        'input[name="applicant.phoneNumber"]',
        'input[name*="phone" i]',
        'input[type="tel"]',
        'input[id*="phone" i]',
      ],
      val: profile.phone_formatted,
    },
    // location
    {
      sels: [
        'input[name="applicant.city"]',
        'input[name*="city" i]',
        'input[id*="city" i]',
        'input[placeholder*="City" i]',
      ],
      val: profile.city,
    },
    {
      sels: ['input[name="applicant.state"]', 'input[name*="state" i]', 'input[id*="state" i]'],
      val: profile.state,
    },
    {
      sels: ['input[name*="zip" i]', 'input[id*="zip" i]', 'input[name*="postal" i]'],
      val: profile.zip,
    },
  ];

  for (const { sels, val } of FIELDS) {
    if (!val) continue;
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const skip = shouldSkip(el);
      if (skip === 'hard') break;
      if (el.value && el.value.trim()) break; // already filled
      await fillField(el, val, delay);
      filled++; delay += 80;
      break;
    }
  }

  // ── Selects (work auth, etc.) ────────────────────────────────────────────
  for (const sel of document.querySelectorAll('select')) {
    const label = getFieldLabel(sel);
    if (/authorized|work\s*auth|legally\s*auth/i.test(label)) {
      const ok = await fillSelect(sel, 'Yes', delay);
      if (ok) { filled++; delay += 80; }
    } else if (/sponsor|visa/i.test(label)) {
      const ok = await fillSelect(sel, 'No', delay);
      if (ok) { filled++; delay += 80; }
    }
  }

  // ── Yellow-flag skip textareas ───────────────────────────────────────────
  document.querySelectorAll('textarea').forEach(ta => {
    if (SKIP_PATTERNS.some(p => p.test(getFieldLabel(ta)))) flashYellow(ta);
  });

  return filled;
}
