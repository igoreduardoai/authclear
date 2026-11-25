# AuthClear redesign spec (v1, 2026-11-23)

Repo: igoreduardoai/authclear · base: PR #2 head `ee5ad27` · new work = a stacked PR on PR #2, no merge, no deploy until Igor OKs.
Live before: https://authclear-delta.vercel.app/ and https://igoreduardoai.github.io/authclear/ (same build).
Before screenshots: `screenshots-before/authclear-vercel-1280x800.png`, `-390x844.png`, and `-full.png` variants.
Standard: `DESIGN-STANDARD.md` (same folder). Author "Igor Eduardo". Forbidden company name never appears. Synthetic / HL7-published example data only.

## 1. What is ugly now (from the 1280×800 / 390×844 captures and Igor's video frame)

1. **It looks generated.** Cream paper `#f3efe6` + Georgia serif display + side stripe on the result box + ALL-CAPS eyebrow ("PATIENT ACCESS PROTOTYPE · NO LOGIN") + middle-dot meta strings. These are exactly the AI-design tells listed in Anthropic frontend-design and impeccable's craft floor.
2. **The heaviest element is a black legal banner**, full width, above the product. The disclaimer out-shouts the result.
3. **The headline is payer jargon.** "Not Certified" in 56px serif, followed by "The outcome field is complete. The review action code is A3." A patient learns nothing in 5 seconds.
4. **Raw FHIR is the main visual.** Below the fold, a dark JSON tree takes the widest column, and every notice sentence carries a code path like `entry[0].resource.item[0].adjudication[0].extension[0].valueCodeableConcept.coding[0].code`, in 11px mono inside narrow beige cards. That is the "beige cards dumping FHIR paths" in Igor's screenshot.
5. **Three equal columns of tiny text** (FHIR resource / Member notice / Navigator task) at 1280px: the member notice column is ~200px wide, the "English / Español" buttons wrap onto two lines, five same-weight download buttons stack with no primary.
6. **No one primary action.** Six tab buttons + a select + five downloads + two details, all the same weight.
7. **Empty space in the wrong place.** The result box has a 600px-wide paragraph and a large empty right half; the content below is cramped.
8. **Mobile:** 844px of height spent on header, banner and six wrapped tabs; the result starts at y≈505 and next steps are below the fold.
9. **Evaluation numbers on the main page** (Flesch-Kincaid, holdout %, seeds) read like a lab report to a patient.
10. **Video:** burned-in subtitles plus a "Narration: synthetic voice" banner sit over the bottom of the frame and the YouTube controls.

## 2. Design direction

Calm, clinical-but-human, readable by a tired person on a phone. Cool near-white background, white surfaces, navy ink, one deep-teal action color, status colors with icons. Font: Atkinson Hyperlegible Next (self-hosted, OFL) for all UI; Geist Mono only inside the source drawer. Tokens exactly as DESIGN-STANDARD §2. The one memorable element: the **result card** (status, plain headline, steps, call script). Everything else is quiet.

## 3. Screens

### 3.1 Desktop 1280×800 — first viewport (no scroll)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [shield-check] AuthClear   Prior-authorization letters in plain language   [EN|ES]  │  top bar 56px, h1 = "AuthClear" (18px)
│ (i) Synthetic / HL7-published example data — no real members. Not a coverage        │  one muted 14px line, no black banner
│     decision, clinical advice, or legal advice.                                      │
├───────────────────────────┬──────────────────────────────────────────────────────────┤
│ Example records           │  ┌ RESULT CARD (white, 16px radius, 32px padding) ─────┐ │
│ ● Denied            [x]   │  │ [XCircle] Grouped as a denial     (status badge)     │ │
│ ○ Pending           [clk] │  │ Not Certified                    ← h2, 40px bold      │ │
│ ○ Approved          [chk] │  │ Your plan did not approve this request.  ← 20px lead │ │
│ ○ Patient Access    [usr] │  │                                                      │ │
│ ○ Submission error  [!]   │  │ What to do next                    ← h3 "Next action"│ │
│ ○ Invalid input     [?]   │  │  1. … (from action.summary, split into ≤3 steps)     │ │
│ More published examples ▾ │  │  2. …                                                │ │
│ ───────────────────────── │  │ ┌ What to say when you call ──────── [Copy] ┐        │ │
│ Use your own (P1)         │  │ │ "Hi, I'm calling about prior authorization │        │ │
│ [ Paste FHIR JSON ]       │  │ │  reference ###. The letter says… Can you…" │        │ │
│ [ Upload .json    ]       │  │ └────────────────────────────────────────────┘        │ │
│ Stays in your browser.    │  │ [Download member letter] (primary)                    │ │
│ Use example data only.    │  │ [Download Task JSON] (outline)  [More ▾]  Show source│ │
│                           │  └──────────────────────────────────────────────────────┘ │
└───────────────────────────┴──────────────────────────────────────────────────────────┘
```
- Left rail 300px, sticky. The six primary examples are the `role="tab"` buttons (vertical `tablist`, `aria-orientation="vertical"`), each with a lucide status icon. Selected = teal 2px **full** border + tint, not a side stripe.
- Right column max 760px. The result card is `#decision` (`aria-live="polite"`).
- Below the card (scroll): "Full explanation" (plain sentences, the `#case-panel` tabpanel), "Navigator task" card, then "How we tested" (eval block) collapsed in a `<details>` or moved to RESULTS.md link.

### 3.2 Mobile 390×844

```
┌ AuthClear              [EN|ES] ┐  56px
│ (i) Synthetic … (2 lines max)  │
│ [Denied][Pending][Approved] ▸  │  horizontal scroll chips (same role=tab), 44px tall
│ ┌ RESULT CARD ───────────────┐ │
│ │ [x] Grouped as a denial     │ │
│ │ Not Certified   (32px)      │ │
│ │ Your plan did not approve…  │ │
│ │ What to do next 1. 2.       │ │  ← must be visible above 844px
│ │ [Download member letter]    │ │  full-width primary
│ └─────────────────────────────┘ │
│ What to say when you call …    │
└────────────────────────────────┘
```
Paste/upload moves under the examples as a collapsed "Use your own record" row.

### 3.3 Status mapping (badge + icon + tint; text from existing `KICKER`)

| decision | icon (lucide) | tint / text | plain lead sentence EN (new, in explain.ts or a new `plain.ts`) |
|---|---|---|---|
| denied | `XCircle` | `#FEF3F2` / `#B42318` | "Your plan did not approve this request." |
| pended | `Clock` | `#FFFAEB` / `#93370D` | "Your plan has not decided yet." |
| approved | `CheckCircle2` | `#ECFDF3` / `#067647` | "Your plan approved this request." |
| error | `AlertTriangle` | `#F4F3FF` / `#5925DC` | "The request had an error. It is not a decision." |
| mixed | `Split` | `#F2F4F7` / `#344054` | "Your plan made different decisions for different items." |
| unknown / unreadable | `HelpCircle` | `#F2F4F7` / `#344054` | "We could not find a decision in this record." |

Spanish leads added in the same table in code. All new sentences must pass the existing readability tests (EN FK ≤ ~6.5, ES FH ≥ ~85) — add them to the scored set.

### 3.4 "What to say when you call" (new, EN/ES)

Built only from extracted fields, template sentences, each slot with its pointer (so the source drawer can highlight it). Slots: service (`extraction.service`), reference number (`authId`), date of the letter (`responseCreated`), reasons (`reasons`), urgency (`urgent`). Missing slot → the sentence is dropped, never filled with a guess. Always ends with questions the member can ask, e.g. EN "What is the deadline to appeal? Can you send me the reason in writing?" / ES "¿Cuál es la fecha límite para apelar? ¿Me pueden enviar el motivo por escrito?". Copy button (`Copy call script`) uses `navigator.clipboard`, shows "Copied" for 2s with `aria-live`. Unit tests: (a) no value appears that is not in the record; (b) readability EN/ES; (c) every slot has a pointer.

### 3.5 Evidence: "Show source" sheet

- Right Sheet 560px (desktop) / bottom Sheet 90vh (mobile), shadcn `Sheet` (Radix Dialog: focus trap, Esc, returns focus).
- Contents, in tabs inside the sheet: **Sentences ↔ fields** (each plain sentence, then its FHIR path in Geist Mono 13px, click highlights the JSON), **Record** (existing `JsonTree`, dark only here), **Validator** (validatorLine + source link), **Task preview**.
- Each sentence in "Full explanation" gets a small `Show source` text button (icon `FileSearch`) that opens the sheet scrolled to that sentence. FHIR paths are no longer printed in the main page.
- Important: Radix unmounts the sheet when closed, so nothing the e2e tests read may live only inside it (see §5).

### 3.6 Downloads

Visible: **Download member letter** (primary), **Download Task JSON** (outline). `More downloads ▾` (DropdownMenu): queue CSV, source FHIR, dry-run notification. The member-letter HTML gets the same tokens/font stack (inline CSS) so the downloaded letter also looks good.

### 3.7 Below the fold

1. Full explanation (`#case-panel`, `role="tabpanel"`): numbered plain sentences, 17px, max 65ch, notes about example patient/insurer names and "Spanish not reviewed by a native speaker" as muted 14px.
2. Navigator task card: owner, decision-clock maximum (human date + raw ISO value in muted mono, e.g. "Thu, May 5, 2005, 11:01 AM (UTC+5) · 2005-05-05T11:01:00+05:00"), rule id, "How the deadline was calculated" details.
3. "How we tested" `<details>`: the existing eval `<dl>` unchanged in content, restyled as a 2-column definition list. Link to RESULTS.md and health.json.
4. Footer: "AuthClear is a prototype by Igor Eduardo. It does not send email or SMS. The dry-run file is a payload only."

## 4. Implementation notes

- Add: `tailwindcss @tailwindcss/vite`, shadcn init (Vite, `src/components/ui`), components: button, badge, card, sheet, tabs (only inside the sheet), dropdown-menu, tooltip, separator; `lucide-react`; `@fontsource/atkinson-hyperlegible-next`, `@fontsource/geist-mono`. All MIT/ISC/OFL, free.
- Replace `styles.css` with Tailwind + a token layer (`@theme` with the DESIGN-STANDARD colors). Keep `.skip` link ("Skip to decision").
- Add `DESIGN.md` at the repo root (google-labs-code/design.md format) with the tokens.
- Do not change `src/lib/*` logic except: add plain-lead + call-script builders (new files), and their tests.
- Language toggle: two shadcn `Button`s (or Radix `Toggle`) with `aria-pressed`. **Do not use ToggleGroup type="single"** (it renders `role="radio"` and breaks the "Español" button test).
- Example selector: keep the custom `role="tablist"` / `role="tab"` buttons with `aria-controls="case-panel"`; Radix Tabs is fine only if roles, names and `aria-controls` stay identical.
- Paste/upload (P1, can ship in a follow-up commit): `JSON.parse` → existing `extract()`; parse errors go to the existing "Cannot read" path; nothing leaves the browser; label "Use example data only. Do not paste real patient records." No PDF/photo upload, no OCR (that would claim a capability the app does not have).

## 5. Test contract (must stay green, no test edits)

Unit: 33 Vitest tests (forbidden-name scan, LICENSE "Igor Eduardo", readability EN FK ~6.2, ES FH ~87.6, official 7/7, holdout, deadline rule). Playwright 4 tests + axe. The DOM contract they rely on:

| Test expects | Keep as |
|---|---|
| h1 "AuthClear" visible | top bar h1 |
| text "Synthetic / HL7-published example data — no real members." visible | the muted info line (exact wording) |
| h2 = notice.headline ("Not Certified", "Pending", "Certified in total", "Cannot read") | result-card h2 (plain lead goes in a `<p>`, not the h2) |
| "Grouped as a denial" / "Agrupado como negativa" visible | status badge text |
| `#decision` contains conflict text ("The outcome field is complete", "queued") and the pending due ISO string, and "Not Certified" in ES | inside the result card (conflict shown as a small muted "Note on this record" alert; ISO string printed visibly next to the human date) |
| h3 "Next action" | keep the h3 text "Next action" (visual label can read "Next action" — don't rename to "What to do next" unless also kept as accessible name) |
| `#case-panel` contains notice sentences ("The resource status is active", "does not include a specific reason", "referenced Claim example", "El estado del recurso es active", "no incluye un motivo específico") | Full explanation list rendered in the DOM (not inside the Sheet) |
| tabs named Denied, Pending, Patient Access, Invalid input | role=tab buttons, visible at both sizes |
| buttons "Download Task JSON", "Download member letter" visible + clickable; letter HTML contains "Not Certified", "no real members" | visible buttons (not in the dropdown) |
| button "Español" | aria-pressed button |
| axe 0 at 1280 and at 390 after clicking Pending | run both |
| `/health.json` | unchanged |

Add (new tests): call-script no-invention + readability; Playwright screenshot of 1280×800 and 390×844 saved to `docs/screens/after-*.png`; assert no element with text matching `entry\[\d+\]\.resource` is visible on first load; assert "Download member letter" is inside the first viewport on mobile.

## 6. Acceptance

- 5-second test on the 1280×800 after-screenshot: "a tool that explains an insurance prior-auth letter; this one was denied; I'd download the letter / call the plan."
- No FHIR path or JSON visible without clicking "Show source".
- axe 0, all old tests + new tests green, `npm run build` OK, forbidden-name test green.
- DESIGN-STANDARD §6 checklist filled in the PR description with before/after screenshots.
- Then re-record the video per DESIGN-STANDARD §7 (1920×1080, no burned-in banner, CC captions, corner disclosure card + description line), only after Igor approves the new look.
