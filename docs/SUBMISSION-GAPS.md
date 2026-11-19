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
- The Spanish text has not been reviewed by a native speaker.
- No external human reviewer has checked the wording. The evaluation is internal and says so.
- The form was not submitted, and this project must not be submitted unless Igor explicitly says to submit it and names the challenge.

## What a reviewer can open today

From a checkout: `npm ci`, `npm test`, `npm run dev`. The default view is the published PAS denial. Downloads work without a network call. `eval/RESULTS.md` and `CLAIMS.md` are the evidence pack.
