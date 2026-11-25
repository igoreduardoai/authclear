# What is not done for the HIMSS27 Emerge submission

Update 2026-11-25 (America/Chicago): several items below are now done. This file is kept as the original gap list, with the current state summarized here. Nothing has been submitted.

Now in place:
- Live no-login demos at https://authclear-delta.vercel.app and https://igoreduardoai.github.io/authclear/ (commit `9ce2cbf` of the `redesign-ui` branch). `GET /health` returns static JSON on both hosts.
- Walkthrough video, 74.9s, YouTube unlisted: https://youtu.be/O2yJwSbtwy4 (narration is one continuous ElevenLabs take of Igor's cloned voice; on-screen label names that). Local file: `authclear-demo-2026-11-23-v4.mp4`.
- The first screen is the decision (Not approved / Not Certified / Download member letter). Raw FHIR paths are behind Show source. That redesign is PR #4, not merged.
- Default-branch `main` now has a short README pointing at those demo URLs. The working source is still on the open PR stack (#1, #2, #4) and has not been merged.

Still not done:
- No five-second test recorded with a person who had not seen the page.
- No ≤10-slide deck.
- Incubator/accelerator and "actively seeking funding" still need Igor's confirmation on the Sessionboard form.
- No presenter photo/bio confirmation.
- Spanish text has not had a native-speaker review.
- No external human wording review.
- Health-monitor workflow is on the PR branches, not on `main`, so it will not run on a schedule until those PRs are merged (needs Igor's OK).
- Remaining design-standard nits on the first viewport, not fixed here so the live page stays in sync with the recorded video: the muted line "The outcome field is complete. The review action code is A3..." is still on the decision card; step 1 still says "review action" and "resource".
- Do not submit unless Igor explicitly says to submit and names HIMSS27 Emerge.


---

# What is not done for the HIMSS27 Emerge submission

This file is a gap list. Nothing here has been submitted.

The form is the HIMSS27 Emerge Sessionboard application for Challenge 1, Patient Access, Experience & Care Navigation. The deadline cited in the build notes is 06/12/2026 23:59 CST. Re-read the live form in a browser on the day of submission. This repo was not able to render that form.

## Not done

- No stable public URL yet. Deploy steps are in `docs/DEPLOY.md`. There was no free-host credential in this environment.
- No five-second test with a person. Someone who has not seen the page needs to look at the default screen, without narration, and say what the decision is and what they would do next. The default screen is the "Not Certified" headline, the outcome-versus-review-action line, and the next-action card.
- No video. A storyboard is in `docs/VIDEO-STORYBOARD.md`. It has not been filmed. There is no YouTube link.
- No slide deck.
- Sessionboard fields that the build notes left for a person to answer are still open: incubator or accelerator affiliation, and whether the company is actively seeking funding. This repo does not answer them.
- No presenter photo, bio, or confirmation of who stands on stage.
- The Spanish text has not been reviewed by a native speaker. A Fernández-Huerta index is reported in `eval/RESULTS.md`. That number is not a review.
- No external human reviewer has checked the wording. The evaluation is internal and says so.
- Appeal deadlines are not computed. The CMS FAQ's 14-day extension is not applied, because the resource does not say an extension was granted. A standard pending due time adds 168 hours, which this repo labels as its own reading of "seven calendar days", not as words CMS published.
- The holdout ids were not changed in the field-mapping work. Their hashes are `eval/holdout-ids.sha256` and `eval/holdout-gold.sha256`.
- The form was not submitted, and this project must not be submitted unless Igor explicitly says to submit it and names the challenge.
- The mid-stage winner-gap gate was not run from this environment. `github.com/igoreduardoai/hackathon-lab` was not visible to the credentials here (`gh repo view` could not resolve it, and `git ls-remote` returned "Repository not found"). No gate result was invented.

## What a reviewer can open today

From a checkout: `npm ci`, `npm test`, `npm run dev`. The default view is the published PAS denial. Downloads work without a network call. `eval/RESULTS.md` and `CLAIMS.md` are the evidence pack.
