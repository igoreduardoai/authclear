Repo igoreduardoai/authclear. Branch `redesign-ui` from PR #2 head ee5ad27 (branch of PR #2). Open a stacked PR with base = PR #2's branch. Do not merge, deploy or push to gh-pages.

Goal: redesign the UI so a judge understands the result in 5 seconds. Follow the attached DESIGN-STANDARD.md and AUTHCLEAR-REDESIGN-SPEC.md exactly (paste both into the repo task, but do NOT commit DESIGN-STANDARD.md verbatim; commit a DESIGN.md with the tokens only).

Do:
1. Add Tailwind v4 (@tailwindcss/vite), shadcn/ui (Vite, src/components/ui: button, badge, card, sheet, tabs, dropdown-menu, tooltip, separator), lucide-react, @fontsource/atkinson-hyperlegible-next, @fontsource/geist-mono. Replace src/styles.css with Tailwind + the token layer from DESIGN-STANDARD §2.1 (bg #F7F9FB, ink #0F1B2D, muted #475467, primary #0F6B6B, focus #2563EB, status tints).
2. Rebuild App.tsx layout per spec §3: compact top bar (h1 "AuthClear", EN|ES aria-pressed buttons), one muted info line with the exact sentence "Synthetic / HL7-published example data — no real members. Not a coverage decision, clinical advice, or legal advice.", left rail of example tabs (role=tab, aria-controls="case-panel", lucide status icons), result card #decision (status badge with kicker text + icon, h2 = existing notice.headline, new plain lead sentence, h3 "Next action" with ≤3 steps, conflict note, call script with Copy button, primary "Download member letter", outline "Download Task JSON", "More downloads" menu for CSV/source/dry-run, "Show source" button).
3. Move every FHIR path, the JsonTree, validator line and Task preview into a shadcn Sheet ("Show source"). No FHIR path or JSON visible on first load.
4. Keep the full plain-sentence explanation in #case-panel (role=tabpanel) in the DOM (not inside the Sheet). Pending due time: human date + the raw ISO string visible inside #decision.
5. Add new pure functions (new files) for the plain lead sentence and the "What to say when you call" script, EN/ES, built only from extracted fields with pointers; missing field → drop the sentence. Unit tests: no invented values, every slot has a pointer, EN FK ≤ 6.5, ES Fernández-Huerta ≥ 85.
6. Move the evaluation block into a collapsed "How we tested" <details> below the fold; content unchanged.
7. Restyle the downloaded member-letter HTML with the same tokens (inline CSS); keep "Not Certified" and "no real members" in it.
8. Optional P1 in a separate commit: "Use your own record" paste/upload .json → existing extract(); parse errors use the existing "Cannot read" path; label "Use example data only. Do not paste real patient records." No PDF/photo/OCR.

Don't: edit existing tests; touch src/lib logic other than adding new files; use ToggleGroup type="single" for language (breaks the "Español" button test); put tested text only inside the Sheet; use eyebrows, ALL-CAPS labels, cream background, serif display, side-stripe borders, gradient text, emoji icons; write the forbidden company name anywhere (public-text test); invent any user, clinic, partner, metric or date. Author stays "Igor Eduardo"; data stays synthetic / HL7-published.

Verify before opening the PR: npm ci && npm run typecheck && npm test (33 existing + new, all green) && npx playwright test (4 existing + new, axe 0 at 1280x800 and at 390x844). Add Playwright screenshots docs/screens/after-1280x800.png and after-390x844.png and put before/after images in the PR body with the DESIGN-STANDARD §6 checklist filled in (5-second test answers, 3 reference-app comparison lines, AI-tell scan). Confirm "Download member letter" sits inside the first 844px on mobile.

Report back: PR URL, head SHA, test counts, axe results, screenshot paths. Do not merge.
