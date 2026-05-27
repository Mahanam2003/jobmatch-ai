// TikTok Careers (lifeattiktok.com) — Ant Design React form filler
//
// Class names confirmed by page inspection:
//   .createFormSection-mutiple   — outer wrapper for each repeating section
//                                  (one for Work Experience, one for Education)
//   .createFormSection-addBtn    — the "+ Add" button inside each section
//   .createFormSection-right     — right-side column holding inputs for one entry
//   .ant-picker                  — Ant Design date/month picker wrapper
//   .ant-select                  — Ant Design select dropdown wrapper
//   .anticon.addMore-plus        — icon inside the Add button (selector not needed)

async function fillTikTok(profile) {
  let filled = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ── Core fill wrapper (counts fills, respects skip rules) ─────────────────

  async function doFill(el, value) {
    if (!el || value == null || value === '') return false;
    const skip = shouldSkip(el);
    if (skip === 'hard') return false;
    if (skip === 'yellow') { flashYellow(el); return false; }
    if (el.tagName === 'SELECT') {
      const ok = await fillSelect(el, value, 0);
      if (ok) filled++;
      return ok;
    }
    await fillField(el, value, 0);
    filled++;
    return true;
  }

  // ── Find first input whose label matches any of the given patterns ─────────

  function findByLabel(patterns, scope = document) {
    const EL_SEL =
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]),' +
      'textarea, select';
    for (const el of scope.querySelectorAll(EL_SEL)) {
      if (patterns.some(rx => rx.test(getFieldLabel(el)))) return el;
    }
    return null;
  }

  // ── Ant Design DatePicker fill ────────────────────────────────────────────
  // Ant pickers ignore direct .value assignment — we must click to open,
  // overwrite the internal input, then confirm with Enter.

  async function fillAntPicker(pickerRoot, yyyymm) {
    if (!pickerRoot || !yyyymm) return false;
    const input = pickerRoot.querySelector('input');
    if (!input) return false;

    // Open the picker
    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(200);

    // Overwrite value using the native setter (bypasses React's tracking)
    input.select?.();
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) nativeSetter.call(input, yyyymm);
    else input.value = yyyymm;

    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Confirm selection
    for (const type of ['keydown', 'keypress', 'keyup']) {
      input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', keyCode: 13, bubbles: true }));
    }
    await sleep(150);
    input.dispatchEvent(new Event('blur', { bubbles: true }));

    flashGreen(pickerRoot);
    filled++;
    return true;
  }

  // ── Ant Design Select fill ────────────────────────────────────────────────
  // Ant selects render their options in a portal (.ant-select-dropdown) that
  // appears at the document root after a click.

  async function fillAntSelect(wrapperEl, valueText) {
    if (!wrapperEl) return false;
    // Open the dropdown
    wrapperEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    wrapperEl.dispatchEvent(new MouseEvent('click',     { bubbles: true }));
    await sleep(350);

    // The dropdown renders as a portal outside the section DOM
    const dropdown = document.querySelector(
      '.ant-select-dropdown:not(.ant-select-dropdown-hidden),' +
      '.rc-select-dropdown:not(.rc-select-dropdown-hidden)'
    );
    if (!dropdown) {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return false;
    }

    const opts = dropdown.querySelectorAll(
      '.ant-select-item-option, .rc-select-item-option, [class*="select-item-option"]'
    );
    const match = [...opts].find(o =>
      o.textContent.trim().toLowerCase().includes(valueText.toLowerCase())
    );
    if (match) {
      match.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      match.dispatchEvent(new MouseEvent('click',     { bubbles: true }));
      flashGreen(wrapperEl);
      filled++;
      return true;
    }

    // No match — close without selecting
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return false;
  }

  // ── Date filler — takes a pre-found input element, not patterns ──────────
  // Handles both .ant-picker wrappers and plain text inputs.
  // Always expects yyyymm in YYYY-MM format (TikTok's required format).

  async function fillDate(inputEl, yyyymm) {
    if (!inputEl || !yyyymm) return;
    const picker = inputEl.closest('.ant-picker');
    if (picker) {
      await fillAntPicker(picker, yyyymm);
    } else {
      await doFill(inputEl, yyyymm);
    }
  }

  // ── Positional field extraction for experience entries ────────────────────
  // TikTok inputs lack reliable aria-labels. We identify fields by order:
  //   non-date text inputs: [0]=company  [1]=title
  //   date inputs (placeholder="YYYY-MM"): [0]=start  [1]=end
  // type="search" is excluded — those belong to Ant Select's internal input.

  function getExpFields(entry) {
    const inputs = [...entry.querySelectorAll(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])' +
      ':not([type="file"]):not([type="search"])'
    )];
    const dateInputs    = inputs.filter(el => /YYYY-MM/i.test(el.placeholder));
    const nonDateInputs = inputs.filter(el => !/YYYY-MM/i.test(el.placeholder));
    return {
      company:   nonDateInputs[0] ?? null,
      title:     nonDateInputs[1] ?? null,
      startDate: dateInputs[0]    ?? null,
      endDate:   dateInputs[1]    ?? null,
      textarea:  entry.querySelector('textarea'),
    };
  }

  // ── Positional field extraction for education entries ─────────────────────
  //   non-date inputs: [0]=school  [1]=field of study
  //   date inputs:     [0]=start   [1]=end
  //   degree is a <select> or .ant-select, never a plain text input

  function getEduFields(entry) {
    const inputs = [...entry.querySelectorAll(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])' +
      ':not([type="file"]):not([type="search"])'
    )];
    const dateInputs    = inputs.filter(el => /YYYY-MM/i.test(el.placeholder));
    const nonDateInputs = inputs.filter(el => !/YYYY-MM/i.test(el.placeholder));
    return {
      school:       nonDateInputs[0] ?? null,
      field:        nonDateInputs[1] ?? null,
      startDate:    dateInputs[0]    ?? null,
      endDate:      dateInputs[1]    ?? null,
      degreeSelect: entry.querySelector('select'),
      degreeAnt:    entry.querySelector('.ant-select'),
    };
  }

  // ── Locate a repeating section by checking its preceding heading ───────────
  // TikTok renders a visible heading element just before each
  // .createFormSection-mutiple. Checking only the first ~200 chars of the
  // section's own text prevents false matches from university names, etc.

  function findSection(patterns) {
    const sections = [...document.querySelectorAll('.createFormSection-mutiple')];
    for (const sec of sections) {
      const prevText = sec.previousElementSibling?.textContent?.trim() || '';
      // Check the heading above and the section's own top-level children text
      const ownTopText = [...sec.children]
        .slice(0, 3)
        .map(c => c.firstElementChild?.textContent || c.textContent)
        .join(' ')
        .slice(0, 200);
      if (patterns.some(p => p.test(prevText) || p.test(ownTopText))) return sec;
    }
    return null;
  }

  // ── 1. BASIC INFO ─────────────────────────────────────────────────────────
  // These fields live in the top of the form, not inside any repeating section.

  await doFill(
    document.querySelector('input[type="email"]') || findByLabel([/\bemail\b/i]),
    profile.email
  );

  await doFill(
    document.querySelector('input[type="tel"]') || findByLabel([/mobile/i, /phone/i, /\btel\b/i]),
    profile.phone_formatted
  );

  // "Name" — avoid matching email inputs whose placeholder also contains "name"
  const nameEl = (() => {
    for (const el of document.querySelectorAll('input:not([type="email"]):not([type="hidden"])')) {
      if (/\bname\b/i.test(getFieldLabel(el))) return el;
    }
    return null;
  })();
  await doFill(nameEl, profile.full_name);

  await sleep(300);

  // ── 2. WORK EXPERIENCE ────────────────────────────────────────────────────
  //
  // The form starts with ONE empty entry already visible.
  // experience[0] → fill the pre-existing entry directly (no Add click).
  // experience[1+] → click Add, wait 1000ms for React to render, then fill
  //                  the last .createFormSection-right (the newly created one).

  const expSection = findSection([/work\s*experience/i, /employment/i, /work\s*history/i]);

  if (expSection) {
    for (let i = 0; i < profile.experience.length; i++) {
      const exp = profile.experience[i];

      if (i > 0) {
        // Only click Add for the 2nd, 3rd, … entries
        const addBtn = expSection.querySelector('.createFormSection-addBtn');
        if (addBtn) {
          addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          await sleep(1000); // React needs time to render and mount the new fields
        }
      }

      // For i=0: targets the single pre-existing entry.
      // For i>0: targets the newly appended entry (always last in the list).
      const rights = expSection.querySelectorAll('.createFormSection-right');
      if (!rights.length) continue;
      const entry = rights[rights.length - 1];

      // Select fields by DOM position — not by label — because TikTok inputs
      // have no reliable aria-labels. See getExpFields() above.
      const { company, title, startDate, endDate, textarea } = getExpFields(entry);

      await doFill(company, exp.company);
      await sleep(80);

      await doFill(title, exp.title);
      await sleep(80);

      await fillDate(startDate, `${exp.start_year}-${String(exp.start_month).padStart(2, '0')}`);
      await sleep(80);

      // Leave end date input empty for current positions
      if (!exp.current) {
        await fillDate(endDate, `${exp.end_year}-${String(exp.end_month).padStart(2, '0')}`);
        await sleep(80);
      }

      await doFill(textarea, exp.description);
      await sleep(80);
    }
  }

  // ── 3. EDUCATION ──────────────────────────────────────────────────────────
  //
  // Same first-entry-exists pattern as work experience:
  // education[0] → fill the pre-existing entry directly.
  // education[1+] → click Add, wait 1000ms, fill the last entry.

  const eduSection = findSection([/\beducation\b/i, /academic/i]);

  if (eduSection) {
    for (let i = 0; i < profile.education.length; i++) {
      const edu = profile.education[i];

      if (i > 0) {
        const addBtn = eduSection.querySelector('.createFormSection-addBtn');
        if (addBtn) {
          addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          await sleep(1000);
        }
      }

      const rights = eduSection.querySelectorAll('.createFormSection-right');
      if (!rights.length) continue;
      const entry = rights[rights.length - 1];

      const { school, field, startDate, endDate, degreeSelect, degreeAnt } = getEduFields(entry);

      await doFill(school, edu.school);
      await sleep(80);

      // Degree: prefer native <select>, fall back to Ant Design select
      if (degreeSelect) {
        await doFill(degreeSelect, edu.degree);
      } else if (degreeAnt) {
        await fillAntSelect(degreeAnt, edu.degree);
      }
      await sleep(80);

      // Field of study — skip for entries where it's empty (e.g. High School Diploma)
      if (edu.field) {
        await doFill(field, edu.field);
        await sleep(80);
      }

      await fillDate(startDate, `${edu.start_year}-${String(edu.start_month).padStart(2, '0')}`);
      await sleep(80);

      // Leave end date empty for currently-enrolled entries
      if (!edu.current) {
        await fillDate(endDate, `${edu.end_year}-${String(edu.end_month).padStart(2, '0')}`);
        await sleep(80);
      }
    }
  }

  // ── 4. SELF INTRODUCTION ──────────────────────────────────────────────────

  const introTA = (() => {
    // First pass: look for explicit "self-introduction" label
    for (const ta of document.querySelectorAll('textarea')) {
      const lbl = getFieldLabel(ta);
      if (/self[\s-]?intro/i.test(lbl) && !SKIP_PATTERNS.some(p => p.test(lbl))) return ta;
    }
    // Second pass: any textarea not inside a section and not a skip field
    for (const ta of document.querySelectorAll('textarea')) {
      const lbl = getFieldLabel(ta);
      if (SKIP_PATTERNS.some(p => p.test(lbl))) continue;
      if (/description|responsibilities/i.test(lbl)) continue;
      if (!expSection?.contains(ta) && !eduSection?.contains(ta)) return ta;
    }
    return null;
  })();
  await doFill(introTA, profile.summary);

  // ── 5. SNS / LINKEDIN ────────────────────────────────────────────────────

  await doFill(
    findByLabel([/linkedin/i, /\bsns\b/i, /social/i]),
    profile.linkedin
  );

  // ── 6. WORK AUTHORIZATION ────────────────────────────────────────────────

  // Native <select> elements
  for (const sel of document.querySelectorAll('select')) {
    const lbl = getFieldLabel(sel);
    if (/authorized|work\s*auth|legally\s*auth|eligible/i.test(lbl)) {
      const ok = await fillSelect(sel, 'Yes', 0);
      if (ok) filled++;
    } else if (/sponsor|visa/i.test(lbl)) {
      const ok = await fillSelect(sel, 'No', 0);
      if (ok) filled++;
    }
  }

  // Ant Design <select> dropdowns
  for (const wrapper of document.querySelectorAll('.ant-select')) {
    const input = wrapper.querySelector('input');
    if (!input) continue;

    // Build label by checking the input itself and walking up for a <label>
    let lbl = getFieldLabel(input);
    let node = wrapper.parentElement;
    for (let i = 0; i < 5 && node; i++) {
      const labelEl = node.querySelector('label') ||
                      node.querySelector('[class*="label" i]');
      if (labelEl && !labelEl.contains(wrapper)) { lbl = labelEl.textContent; break; }
      node = node.parentElement;
    }

    if (/authorized|work\s*auth|legally\s*auth|eligible/i.test(lbl)) {
      await fillAntSelect(wrapper, 'Yes');
    } else if (/sponsor|visa/i.test(lbl)) {
      await fillAntSelect(wrapper, 'No');
    }
  }

  // ── Yellow-flag: mark cover-letter / why fields ───────────────────────────

  document.querySelectorAll('textarea').forEach(ta => {
    if (SKIP_PATTERNS.some(p => p.test(getFieldLabel(ta)))) flashYellow(ta);
  });

  // ── Toast: override content.js generic message with site-specific one ──────
  // The 50ms delay ensures this fires after content.js's showToast call,
  // so the TikTok message wins.
  setTimeout(() => showToast(`AutoApply: filled ${filled} fields on TikTok`), 50);

  return filled;
}
