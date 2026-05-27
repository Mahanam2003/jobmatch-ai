// LinkedIn Easy Apply filler (linkedin.com)
// Easy Apply is a paginated modal — only visible page fields are filled.
// The extension can be clicked again after advancing to the next page.

async function fillLinkedIn(profile) {
  let filled = 0;
  let delay  = 0;

  // Easy Apply modal, or fall back to the whole document
  const root = document.querySelector(
    '.jobs-easy-apply-modal, [data-test-modal], [aria-label*="Easy Apply" i]'
  ) || document;

  async function tryFill(selectors, value) {
    if (!value) return;
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (!el) continue;
      const skip = shouldSkip(el);
      if (skip === 'hard') continue;
      if (skip === 'yellow') { flashYellow(el); continue; }
      // Don't overwrite pre-filled fields
      if (el.value && el.value.trim()) continue;
      if (el.tagName === 'SELECT') {
        const ok = await fillSelect(el, value, delay);
        if (ok) { filled++; delay += 80; }
      } else {
        await fillField(el, value, delay);
        filled++; delay += 80;
      }
      return;
    }
  }

  // ── Contact info ────────────────────────────────────────────────────────
  await tryFill(
    ['input[id*="firstName" i]', 'input[name*="firstName" i]', 'input[placeholder*="First name" i]'],
    profile.first_name
  );
  await tryFill(
    ['input[id*="lastName" i]', 'input[name*="lastName" i]', 'input[placeholder*="Last name" i]'],
    profile.last_name
  );
  await tryFill(
    ['input[type="email"]', 'input[id*="email" i]'],
    profile.email
  );
  await tryFill(
    ['input[id*="phoneNumber" i]', 'input[id*="phone" i]', 'input[type="tel"]'],
    profile.phone
  );
  await tryFill(
    ['input[id*="city" i]', 'input[id*="location" i]', 'input[placeholder*="City" i]'],
    profile.city
  );

  // ── Work authorization (select dropdowns) ───────────────────────────────
  const selects = root.querySelectorAll('select');
  for (const sel of selects) {
    const label = getFieldLabel(sel).toLowerCase();
    if (/authorized|legally\s*auth|work\s*auth/i.test(label)) {
      const ok = await fillSelect(sel, 'Yes', delay);
      if (ok) { filled++; delay += 80; }
    } else if (/sponsor|visa/i.test(label)) {
      const ok = await fillSelect(sel, 'No', delay);
      if (ok) { filled++; delay += 80; }
    }
  }

  // ── Radio buttons for yes/no work-auth questions ────────────────────────
  // LinkedIn sometimes uses radio groups instead of selects
  const fieldsets = root.querySelectorAll('fieldset');
  for (const fs of fieldsets) {
    const legend = fs.querySelector('legend')?.textContent || '';
    if (/authorized|legally\s*auth/i.test(legend)) {
      const yesRadio = Array.from(fs.querySelectorAll('input[type="radio"]'))
        .find(r => /yes/i.test(r.value) || /yes/i.test(getFieldLabel(r)));
      if (yesRadio && !yesRadio.checked) {
        yesRadio.click();
        flashGreen(yesRadio);
        filled++; delay += 80;
      }
    } else if (/sponsor|visa/i.test(legend)) {
      const noRadio = Array.from(fs.querySelectorAll('input[type="radio"]'))
        .find(r => /no/i.test(r.value) || /no/i.test(getFieldLabel(r)));
      if (noRadio && !noRadio.checked) {
        noRadio.click();
        flashGreen(noRadio);
        filled++; delay += 80;
      }
    }
  }

  // ── Yellow-flag cover letter / why fields ───────────────────────────────
  root.querySelectorAll('textarea').forEach(ta => {
    if (SKIP_PATTERNS.some(p => p.test(getFieldLabel(ta)))) flashYellow(ta);
  });

  return filled;
}
