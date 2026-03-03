# Accessibility Audit (A11Y Project Checklist)

**Audit date:** March 3, 2026  
**Guide used:** https://www.a11yproject.com/checklist/  
**Project:** `rexford_cc_website`

## Scope

- Templates in `layouts/`
- Frontend assets in `assets/css/main.css` and `assets/js/main.js`
- Rendered output spot-checks in `public/`

## Findings (Prioritized)

### High Severity

1. Homepage landmarks are mis-structured.
- Impact: On the homepage, `<header>` and `<footer>` are inside `<main>`, which breaks expected page landmark structure for assistive technology navigation.
- Checklist alignment: Semantic landmarks and document structure.
- References: `layouts/_default/baseof.html:7`, `layouts/_default/baseof.html:15`, `layouts/index.html:2`, `layouts/index.html:10`

2. Mobile navigation remains accessible when visually closed.
- Impact: Off-canvas hidden navigation can still be reachable by keyboard/screen readers, and focus is not restored to the trigger when closing.
- Checklist alignment: Keyboard support, focus management, and hidden content behavior.
- References: `assets/css/main.css:538`, `assets/css/main.css:542`, `assets/css/main.css:551`, `assets/js/main.js:18`, `assets/js/main.js:21`, `assets/js/main.js:71`, `assets/js/main.js:75`

3. Sticky bottom CTA remains focusable/readable when visually hidden.
- Impact: Hidden controls may unexpectedly receive keyboard focus and be announced by assistive tech.
- Checklist alignment: Keyboard operability and hidden content semantics.
- References: `assets/css/main.css:455`, `assets/css/main.css:463`, `assets/css/main.css:467`, `assets/js/main.js:234`, `assets/js/main.js:240`

### Medium Severity

4. Missing skip link before repeated navigation.
- Impact: Keyboard and screen-reader users must traverse repeated nav before reaching page content.
- Checklist alignment: Bypass blocks.
- References: `layouts/partials/header.html:1`, `layouts/_default/baseof.html:11`

5. Mobile menu and submenu controls have incomplete ARIA state wiring.
- Impact: Expanded/collapsed state and control relationships are not fully exposed.
- Checklist alignment: Name/role/value and interactive control state.
- References: `layouts/partials/header.html:38`, `layouts/partials/header.html:39`, `layouts/partials/header.html:28`, `layouts/partials/header.html:33`

6. Heading hierarchy skips levels on key pages.
- Impact: Non-linear heading outlines reduce navigability for screen-reader heading shortcuts.
- Checklist alignment: Semantic headings and logical document outline.
- References: `layouts/get-started/single.html:6`, `layouts/get-started/single.html:71`, `layouts/get-started/single.html:79`, `layouts/blog/single.html:42`, `layouts/blog/single.html:55`, `layouts/blog/single.html:72`

7. Focus visibility is not consistently defined with explicit focus styles.
- Impact: Keyboard users can lose track of current focus position.
- Checklist alignment: Visible focus indicator.
- References: `assets/css/main.css:57`, `assets/css/main.css:85`, `assets/css/main.css:87`, `assets/css/main.css:89`, `assets/css/main.css:240`, `assets/css/main.css:387`, `assets/css/main.css:493`

8. Reduced motion preferences are not honored.
- Impact: Smooth scroll/transitions remain active for users who request reduced motion.
- Checklist alignment: Motion sensitivity and `prefers-reduced-motion` support.
- References: `assets/js/main.js:107`, `assets/css/main.css:83`, `assets/css/main.css:98`, `assets/css/main.css:238`, `assets/css/main.css:464`, `assets/css/main.css:547`

9. Client-side required-field errors are not announced via live region.
- Impact: Required-field validation can fail silently for some assistive tech users if only browser UI is shown.
- Checklist alignment: Form error identification and announcement.
- References: `assets/js/main.js:164`, `assets/js/main.js:165`, `assets/js/main.js:166`, `layouts/partials/lead-form-inline.html:47`, `layouts/get-started/single.html:67`

10. Honeypot control is inside an `aria-hidden="true"` container.
- Impact: Interactive form controls should not exist inside an aria-hidden subtree.
- Checklist alignment: ARIA usage correctness.
- References: `layouts/partials/lead-form-inline.html:11`, `layouts/partials/lead-form-inline.html:12`, `layouts/get-started/single.html:14`, `layouts/get-started/single.html:15`

11. Some tap targets are below recommended minimum size.
- Impact: Small targets increase activation difficulty for touch users.
- Checklist alignment: Pointer target sizing.
- References: `assets/css/main.css:377`, `assets/css/main.css:378`, `assets/css/main.css:495`, `assets/css/main.css:519`, `assets/css/main.css:520`

12. Team title text contrast fails normal-text requirements.
- Impact: `#c9943a` on white is approximately 2.70:1 and fails WCAG AA (4.5:1 for normal text).
- Checklist alignment: Color contrast.
- References: `assets/css/main.css:259`

### Low Severity

13. Generic link text does not always provide standalone purpose.
- Impact: Links such as “Learn More” and “Read More” are ambiguous out of context.
- Checklist alignment: Meaningful link text.
- References: `layouts/partials/services-grid.html:11`, `layouts/services/single.html:96`, `layouts/blog/list.html:17`

14. Required `*` marker is not explicitly explained in form instructions.
- Impact: Users may not understand the symbol without a legend/instruction.
- Checklist alignment: Form instructions and required field clarity.
- References: `layouts/partials/lead-form-inline.html:14`, `layouts/partials/lead-form-inline.html:27`, `layouts/get-started/single.html:17`, `layouts/get-started/single.html:30`

15. Additional contrast risks in decorative/hover states.
- Impact: Step numerals at low opacity and one hover color pair are below/near minimum contrast thresholds.
- Checklist alignment: Contrast for informative text/states.
- References: `assets/css/main.css:246`, `assets/css/main.css:248`, `assets/css/main.css:249`, `assets/css/main.css:86`, `assets/css/main.css:87`

16. Blog pagination redirect page lacks meta description.
- Impact: Minor SEO/accessibility metadata gap in generated page output.
- Checklist alignment: Page metadata quality.
- References: `public/blog/page/1/index.html:1`

## Verified Good Coverage

1. Page language is present (`<html lang="en">`).
- Reference: `layouts/_default/baseof.html:2`

2. Core templates define page title and description tags.
- References: `layouts/partials/head.html:5`, `layouts/partials/head.html:9`

3. Template images appear to use meaningful alt text or empty alt for decorative images.
- References: `layouts/partials/team.html:26`, `layouts/partials/hero.html:23`, `layouts/partials/footer.html:9`

4. Form fields include useful autocomplete tokens.
- References: `layouts/partials/lead-form-inline.html:39`, `layouts/partials/lead-form-inline.html:40`, `layouts/partials/lead-form-inline.html:43`, `layouts/partials/lead-form-inline.html:44`, `layouts/get-started/single.html:51`, `layouts/get-started/single.html:52`, `layouts/get-started/single.html:55`, `layouts/get-started/single.html:56`

5. Duplicate IDs were not found in audited rendered pages.
- Scope: 86 files under `public/`.
