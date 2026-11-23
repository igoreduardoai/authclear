# Hackathon Design Standard v1

Owner: Igor Eduardo. Written 2026-11-23 after the AuthClear demo was judged "muito muito feio".
Applies to every hackathon demo, video and screenshot from now on. It sits next to the winner-gap gate v2 and does not replace it.
Sources (read, not copied): see `refs/INDEX.md`. Main ones are shadcn/ui, pbakaus/impeccable, ui-ux-pro-max, Anthropic frontend-design, google-labs-code/design.md + awesome-design-md.

Hard rules carried over: never write the forbidden company name (the one the public-text test blocks); author is "Igor Eduardo"; synthetic or published example data only; no invented users, pilots, clinics, partners or metrics; free tools only.

---

## 0. What a judge sees in 2–3 minutes

A judge gives the demo about 5 seconds before deciding whether it is "real". In those 5 seconds the screen must answer:
1. **What is this?** One plain sentence, not a tagline.
2. **What did it just do?** The result, already on screen, big.
3. **What do I do next?** One primary button.

Everything else (method, evidence, raw data, evaluation numbers) is one click away, not on the first screen.

## 1. Stack

| Layer | Default | Notes |
|---|---|---|
| Build | Vite + React + TypeScript for single-screen demos; Next.js (App Router) only when routing/server work is needed | Don't migrate an existing app just to change framework. |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Tokens as CSS variables in `@theme`. No ad-hoc hex in components. |
| Components | shadcn/ui (`npx shadcn@latest init`, then `add button card badge sheet tabs toggle tooltip separator alert`) | Code is copied into `src/components/ui`, so we own it. Built on Radix (keyboard + ARIA for free). |
| Icons | `lucide-react` only, 1.5–2px stroke, 16/20/24px | No emoji or unicode glyphs as icons. |
| Fonts (self-hosted via @fontsource, OFL) | Patient/consumer-facing: **Atkinson Hyperlegible Next** (made for low-vision readers). Developer/ops tools: **Geist** or **Inter Variable**. Code only: **Geist Mono**. | Max two families. Mono is for real code/JSON, never as "techy" decoration. |
| Motion | CSS transitions; `motion` (Framer) only if needed | One authored moment per page (e.g., result card reveal). Respect `prefers-reduced-motion`. |
| Hosting | Vercel Hobby (`*.vercel.app`) or HF Space (`*.hf.space`) | The gate only accepts these. |

## 2. Tokens

Write them once in a `DESIGN.md` at the repo root (format: google-labs-code/design.md) and mirror them into Tailwind `@theme`.

### 2.1 Color (light theme; every pair below checked for WCAG AA)

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--bg` | `#F7F9FB` | page background (cool, not cream) | — |
| `--surface` | `#FFFFFF` | cards, drawers | — |
| `--ink` | `#0F1B2D` | body and headings | 16.4:1 on bg |
| `--muted` | `#475467` | secondary text | 7.3:1 on bg |
| `--line` | `#D0D5DD` | decorative dividers only | — |
| `--control-border` | `#667085` | input/toggle borders (needs ≥3:1) | ~4.8:1 |
| `--primary` | `#0F6B6B` (deep teal) | the one primary action, links | 6.3:1 with white |
| `--focus` | `#2563EB` | 2px focus ring, 2px offset | 5.2:1 |
| Status: denied | text `#B42318` on `#FEF3F2` | | 6.1:1 |
| Status: pending | text `#93370D` on `#FFFAEB` | | 7.2:1 |
| Status: approved | text `#067647` on `#ECFDF3` | | 5.4:1 |
| Status: can't read / error | text `#5925DC` on `#F4F3FF` | | 7.0:1 |
| Status: unknown | text `#344054` on `#F2F4F7` | | 9.5:1 |

Status is never color alone: always icon + word (e.g., `XCircle` + "Not approved").
Avoid the known AI-generated looks (Anthropic frontend-design list): warm cream + serif display + terracotta; black with one acid accent; newspaper hairlines; identical soft-shadow card grid; all-caps eyebrows on every heading.

### 2.2 Type scale (rem, 16px base, ratio ~1.25)

| Role | Size / line-height | Weight |
|---|---|---|
| Result headline (the one big thing) | 2.5rem / 1.1 (mobile 2rem) | 700 |
| H1 product name (small, in the top bar) | 1.125rem / 1.3 | 600 |
| H2 section | 1.5rem / 1.25 | 600 |
| H3 card title | 1.125rem / 1.35 | 600 |
| Body | 1.0625rem (17px) / 1.6 — patient-facing; 1rem / 1.55 — tools | 400 |
| Small / meta | 0.875rem / 1.45 | 400, `--muted` |
| Code | 0.8125rem / 1.5 Geist Mono | 400 |

Body measure 60–75ch. Sentence case everywhere. No ALL-CAPS labels. Tracking ≥ -0.03em on display.

### 2.3 Spacing, radius, shadow

- Spacing: 4px base. Use 4, 8, 12, 16, 24, 32, 48, 64. Section gap 48–64; inside a card 24; between related lines 8–12. More space above a heading than below.
- Radius: controls 8px; cards 12–16px; pills only for small badges. One radius per level, not one for everything.
- Elevation: border **or** shadow, never both. Card: `0 1px 2px rgb(16 24 40 / .06), 0 1px 3px rgb(16 24 40 / .10)`. Drawer/sheet: `0 20px 24px -4px rgb(16 24 40 / .10)`. No glows, no hard offset shadows, no side-stripe borders.
- Max content width 72rem; result column max 44rem.

## 3. Layout rules

1. **Result first.** The first viewport (1280×800 and 390×844) shows the outcome: status badge + plain headline + the 1–3 next steps. No scrolling needed to understand it.
2. **One primary action** per screen (filled `--primary`). Up to 2 secondary (outline). The rest go in a "More" menu.
3. **Progressive disclosure.** Technical evidence (FHIR paths, JSON, validator output, eval tables) lives behind a "Show source" button that opens a right-side Sheet (desktop) / bottom Sheet (mobile). It is never the main visual.
4. **Input is short.** Choose an example / paste / upload in one compact card. Example chips ≤4 visible; the rest in a select.
5. **Disclaimer is one quiet line**, not a black banner: small info icon + text under the top bar or in the footer, still visible on the first screen when rules require it.
6. **≤4 items per group** (cognitive-load rule from impeccable critique rubric). Lists longer than 4 get grouped or collapsed.
7. **No nested cards.** No grid of identical cards as page structure.
8. **Empty, loading, error states** designed: an error says what happened and what to do next.
9. Evaluation/metrics go to a separate "How we tested" section or page, below the fold.

## 4. Patient-facing healthcare copy

- Grade 6 English (Flesch-Kincaid ≤ 7); Spanish Fernández-Huerta ≥ 80. Keep the readability tests in CI.
- Second person, active voice: "Your plan did not approve this request." not "The resource status is active."
- Say what happens next and who does it. Dates as "Monday, May 5, 2025" with the raw value available in the source drawer.
- Never invent a date, reason, phone number, or deadline. If the record does not say it, the UI says "Your letter does not say. Ask your plan." 
- Never give medical, legal or coverage advice. One plain disclaimer line.
- Buttons name the action: "Download letter", "Show source", "Copy call script". No "Submit", no "→" in labels.
- Spanish is a full toggle of the patient text (EN | ES). Mark Spanish as "not reviewed by a native speaker" until it is.
- Synthetic data is labeled once ("Example data, not a real person") near the name, not shouted.

## 5. Accessibility (blocking)

- WCAG 2.2 AA. axe-core 0 violations at 1280×800 and 390×844 (Playwright + `@axe-core/playwright`).
- Keyboard: visible 2px focus ring everywhere; Sheet traps focus and returns it; Esc closes.
- Targets ≥ 44×44px on mobile. `lang` attribute on Spanish text. `aria-live="polite"` on the result.
- Respect `prefers-reduced-motion`; no autoplay motion longer than 300ms.
- Contrast numbers in §2.1; don't introduce new pairs without checking.

## 6. Visual QA checklist (run before every video and every submit)

1. Screenshot at **1280×800** and **390×844** (above the fold) plus a full page. Save to `docs/screens/` and to Drive.
2. **5-second test:** show only the 1280×800 screenshot for 5 seconds to someone (or, at minimum, a fresh agent with no context). They must answer: what is it, what was the result, what would you click. Record the answers verbatim. If any is wrong, fix before recording.
3. **Compare to 3 reference apps** side by side (use the DESIGN.md sheets in `refs/awesome-design-md`: Stripe, Linear, Vercel; for health copy, a patient-portal result screen). Write one line each: spacing, type hierarchy, color discipline — where are we worse?
4. impeccable "craft floor" pass: contrast, spacing rhythm, type measure, states (hover/disabled/loading/error/empty), focus ring, no overflow at any breakpoint, every brief requirement findable in seconds.
5. AI-tell scan: no eyebrow labels, no middle-dot meta strings, no cream+serif, no side stripes, no gradient text, no emoji icons, no mono as decoration, no identical card grid.
6. Raw JSON / code visible in the first viewport? → fail.
7. Forbidden-name test green; axe 0; unit + e2e green.

## 7. Video rule

- Record at **1920×1080**, browser at 100% zoom, window 1920×1080 with the app viewport ≥1600 wide (or record at 1280×720 CSS px with deviceScaleFactor 1.5). No dev tools, no bookmarks bar, no personal tabs.
- **No burned-in banner over content or over the bottom 12% of the frame** (YouTube controls live there).
- Synthetic-voice disclosure: a small corner card (top-left, ≤20% width, 3–4s) on the opening frame and again on the last frame, plus the first line of the YouTube description: "Narration: synthetic voice."
- Captions: upload an `.srt` as YouTube CC (generate from the narration lines). Burn in only if the platform cannot take a caption file, and then keep them in the top or a reserved band, never covering UI or controls.
- Script = 3 beats: problem in one sentence (≤15s) → live result on screen (≥60% of the time) → how it was tested + limits (≤30s). Cursor moves slowly; zoom/crop to the result card when it appears.
- Upload as unlisted on the "Igor Eduardo" channel. Title and description never contain the forbidden company name.

## 8. Prompt pack

### 8.1 Design plan prompt (use before any code)
```
You are the design lead for <PRODUCT>, a <ONE-LINE WHAT IT DOES> for <AUDIENCE> used in <CONTEXT>.
Read DESIGN-STANDARD.md (tokens, layout, copy, a11y rules) and follow it.
Before coding, write a design plan: 4–6 named colors (from the standard unless the brief says otherwise),
type roles, an ASCII wireframe of the first viewport at 1280x800 and 390x844, the one primary action,
and what goes behind "Show source". Then list which parts of your plan look like a generic AI default
and change them. Only then build.
```

### 8.2 v0 / Lovable / Stitch screen prompt
```
Build a single-screen React + Tailwind + shadcn/ui app. Font: Atkinson Hyperlegible Next. Icons: lucide.
Background #F7F9FB, cards white, ink #0F1B2D, muted #475467, primary deep teal #0F6B6B, focus ring #2563EB.
First viewport: compact top bar (product name left, EN|ES toggle right), then a two-column layout
(left 360px: input card with example chips and a paste/upload area; right: result card).
Result card: status badge with icon + word, a 40px plain-language headline, 1–3 numbered next steps,
a "What to say when you call" box with a Copy button, one primary button, two outline buttons,
and a "Show source" link that opens a right Sheet with code. No raw JSON in the main view.
No eyebrows, no all-caps labels, no gradient, no side-stripe borders, no emoji. WCAG AA contrast.
Use this example data: <PASTE SYNTHETIC EXAMPLE>.
```

### 8.3 Coding-agent implementation prompt (existing repo)
```
Repo <owner/repo>, branch from <base> (stacked PR, do not merge). Implement the redesign in <SPEC PATH>.
Follow DESIGN-STANDARD.md. Keep all existing logic in src/lib untouched unless the spec says so.
Keep these tests green: <LIST>. Add Playwright screenshots at 1280x800 and 390x844 to docs/screens/.
Run axe at both sizes (0 violations). Never write the forbidden company name; author "Igor Eduardo".
Synthetic data only. Open a PR with before/after screenshots in the description. Do not deploy or merge.
```

### 8.4 Critique prompt (run on the screenshots)
```
Look at these two screenshots (1280x800, 390x844). In 5 seconds: what is this, what was the result,
what would you click? Then score 1–5 on: hierarchy, spacing rhythm, type, color discipline, copy clarity,
trust. List the 5 worst problems with exact fixes. Flag any generic AI-design tell.
```
