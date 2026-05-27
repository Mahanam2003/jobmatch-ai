// Generic fallback filler — scans all visible inputs/selects/textareas and
// matches them against a keyword map derived from the field's label text.

async function fillGeneric(profile) {
  // Each entry: list of regex patterns → profile value resolver
  const RULES = [
    { rx: [/first[\s_-]?name/i, /given[\s_-]?name/i, /\bfname\b/i],                              val: () => profile.first_name },
    { rx: [/last[\s_-]?name/i,  /family[\s_-]?name/i, /surname/i, /\blname\b/i],                 val: () => profile.last_name },
    { rx: [/^(full[\s_-]?)?name$/i, /full[\s_-]?name/i, /your[\s_-]?name/i, /applicant[\s_-]?name/i], val: () => profile.full_name },
    { rx: [/e[\s-]?mail/i],                                                                        val: () => profile.email },
    { rx: [/phone/i, /mobile/i, /\btel\b/i, /telephone/i, /cell/i],                               val: () => profile.phone_formatted },
    { rx: [/linkedin/i],                                                                            val: () => profile.linkedin },
    { rx: [/\bgithub\b/i, /\bgit\b/i],                                                             val: () => profile.github },
    { rx: [/\bwebsite\b/i, /portfolio/i, /personal[\s_-]?url/i, /\burl\b/i],                      val: () => profile.website },
    { rx: [/\bschool\b/i, /\buniversity\b/i, /\bcollege\b/i, /\binstitution\b/i],                 val: () => profile.education[0].school },
    { rx: [/\bgpa\b/i, /grade[\s_-]?point/i],                                                      val: () => profile.education[0].gpa },
    { rx: [/\bdegree\b/i],                                                                          val: () => profile.education[0].degree },
    { rx: [/\bmajor\b/i, /field[\s_-]?of[\s_-]?study/i, /\bconcentration\b/i, /\bprogram\b/i],   val: () => profile.education[0].field },
    { rx: [/\bcompany\b/i, /\bemployer\b/i, /\borganization\b/i, /\bworkplace\b/i],               val: () => profile.experience[0].company },
    { rx: [/\btitle\b/i, /\brole\b/i, /\bposition\b/i, /job[\s_-]?title/i],                      val: () => profile.experience[0].title },
    { rx: [/authorized/i, /work[\s_-]?auth/i, /eligible[\s_-]?to[\s_-]?work/i, /legally[\s_-]?auth/i], val: () => profile.authorized_to_work },
    { rx: [/\bsponsor/i, /\bvisa\b/i],                                                             val: () => profile.needs_sponsorship },
    { rx: [/hear[\s_-]?about/i, /how[\s_-]?did[\s_-]?you/i, /\bsource\b/i, /referred/i, /where[\s_-]?did/i], val: () => profile.hear_about },
    { rx: [/\bcity\b/i, /\blocation\b/i, /current[\s_-]?city/i],                                  val: () => profile.city },
    { rx: [/\bstate\b/i],                                                                           val: () => profile.state },
    { rx: [/\bzip\b/i, /postal/i],                                                                  val: () => profile.zip },
    { rx: [/\bsummary\b/i, /about[\s_-]?yourself/i, /introduction/i, /self[\s_-]?intro/i, /tell[\s_-]?us[\s_-]?about/i], val: () => profile.summary },
    { rx: [/description/i, /responsibilities/i, /\bduties\b/i],                                    val: () => profile.experience[0].description },
  ];

  const INPUT_SEL = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
    'input:not([type="reset"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])',
  ].join(',');

  const elements = [
    ...document.querySelectorAll(INPUT_SEL),
    ...document.querySelectorAll('textarea'),
    ...document.querySelectorAll('select'),
  ];

  let filled = 0;
  let delay  = 0;

  for (const el of elements) {
    const skip = shouldSkip(el);
    if (skip === 'hard') continue;
    if (skip === 'yellow') { flashYellow(el); continue; }

    // Skip if already has a value (don't overwrite user input)
    if (el.tagName !== 'SELECT' && el.value && el.value.trim().length > 0) continue;

    const label = getFieldLabel(el);
    if (!label) continue;

    let matched = false;

    for (const rule of RULES) {
      if (rule.rx.some(rx => rx.test(label))) {
        const value = rule.val();
        if (!value) break; // empty profile field — skip

        if (el.tagName === 'SELECT') {
          const ok = await fillSelect(el, value, delay);
          if (ok) { filled++; delay += 80; }
        } else {
          await fillField(el, value, delay);
          filled++;
          delay += 80;
        }
        matched = true;
        break;
      }
    }

    // Visible, unfilled, labelled field — mark yellow so user sees it
    if (!matched && label.length > 1) {
      flashYellow(el);
    }
  }

  return filled;
}
