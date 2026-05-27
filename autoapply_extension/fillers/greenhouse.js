// Greenhouse (greenhouse.io) filler
// Greenhouse uses consistent field IDs across all customers.
// Custom questions are rendered as divs with label+input pairs.

async function fillGreenhouse(profile) {
  let filled = 0;
  let delay  = 0;

  // Standard Greenhouse fields
  const STANDARD = [
    { sels: ['#first_name',      'input[name*="first_name" i]'],                      val: profile.first_name },
    { sels: ['#last_name',       'input[name*="last_name" i]'],                       val: profile.last_name },
    { sels: ['#email',           'input[name*="email" i]', 'input[type="email"]'],    val: profile.email },
    { sels: ['#phone',           'input[name*="phone" i]', 'input[type="tel"]'],      val: profile.phone_formatted },
    { sels: ['#resume_text',     'textarea[name*="resume" i]'],                       val: profile.summary },
    { sels: ['#linkedin_profile','input[id*="linkedin" i]', 'input[name*="linkedin" i]'], val: profile.linkedin },
    { sels: ['input[id*="github" i]',   'input[name*="github" i]'],                  val: profile.github },
    { sels: ['input[id*="website" i]',  'input[name*="website" i]', '#website'],     val: profile.website },
    { sels: ['input[id*="portfolio" i]','input[name*="portfolio" i]'],                val: profile.website },
    { sels: ['input[id*="city" i]'],                                                   val: profile.city },
    { sels: ['input[id*="location" i]'],                                               val: profile.location },
  ];

  for (const { sels, val } of STANDARD) {
    if (!val) continue;
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const skip = shouldSkip(el);
      if (skip === 'hard') break;
      if (el.value && el.value.trim()) break;
      if (el.tagName === 'TEXTAREA') {
        await fillField(el, val, delay);
      } else {
        await fillField(el, val, delay);
      }
      filled++; delay += 80;
      break;
    }
  }

  // ── Custom questions (Greenhouse appends these below the standard form) ──
  // Each custom question is usually wrapped in a <div class="field"> with a label.
  const customFields = document.querySelectorAll(
    '.field input:not([type="hidden"]):not([type="file"]), .field textarea, .field select, ' +
    '[class*="custom"] input:not([type="hidden"]), [class*="custom"] select'
  );

  for (const el of customFields) {
    const skip = shouldSkip(el);
    if (skip === 'hard') continue;
    if (skip === 'yellow') { flashYellow(el); continue; }

    const label = getFieldLabel(el).toLowerCase();

    if (/authorized|work\s*auth|eligible/i.test(label)) {
      if (el.tagName === 'SELECT') { const ok = await fillSelect(el, 'Yes', delay); if (ok) { filled++; delay += 80; } }
    } else if (/sponsor|visa/i.test(label)) {
      if (el.tagName === 'SELECT') { const ok = await fillSelect(el, 'No', delay);  if (ok) { filled++; delay += 80; } }
    } else if (/linkedin/i.test(label) && !el.value) {
      await fillField(el, profile.linkedin, delay); filled++; delay += 80;
    } else if (/github/i.test(label) && !el.value) {
      await fillField(el, profile.github, delay);   filled++; delay += 80;
    } else if (/website|portfolio/i.test(label) && !el.value) {
      await fillField(el, profile.website, delay);  filled++; delay += 80;
    } else if (/hear\s*about|source|referred/i.test(label)) {
      if (el.tagName === 'SELECT') { const ok = await fillSelect(el, profile.hear_about, delay); if (ok) { filled++; delay += 80; } }
    } else if (SKIP_PATTERNS.some(p => p.test(label))) {
      flashYellow(el);
    } else if (el.tagName === 'SELECT') {
      // Unknown select — just highlight yellow
      if (!el.value) flashYellow(el);
    }
  }

  return filled;
}
