# Public demo and video (2026-11-21)

Both URLs serve the same static build of this branch (`cursor/extractor-field-tests-ca6f`, commit `d8b2059`), not `main`. No login, no backend, no payer connection.

- GitHub Pages: https://igoreduardoai.github.io/authclear/ (served from the `gh-pages` branch, which holds only the `dist/` output plus `.nojekyll`).
- Vercel Hobby (free) mirror: https://authclear-delta.vercel.app/ (health: https://authclear-delta.vercel.app/health). `authclear.vercel.app` belongs to another account.

Checked on 2026-11-21 (CST): HTTP 200 without cookies for `/`, `/health.json`, `/RESULTS.md`; a Playwright smoke check saw "Not Certified", review action A3, and the HL7 Da Vinci PAS 2.2.1 RejectionResponseBundleExample on the first screen.

## Video

- 134.8s, 1280x720, H.264 + AAC, recorded with Playwright on the GitHub Pages URL and following `docs/VIDEO-STORYBOARD.md`.
- Narration: synthetic voice (edge-tts, en-US-GuyNeural). The first 10s show a "Narration: synthetic voice" banner over the product, and the same label stays in the corner for the whole video. Any video description must repeat it.
- Script: `docs/video-narration-lines.json`. The CMS date and the KFF 16% figure are spoken as citations, not results of this product.
- The file is not committed and not uploaded to a public video host yet.

To rebuild the Pages branch: `npm ci && npm run build`, then commit the contents of `dist/` plus an empty `.nojekyll` to `gh-pages`.
