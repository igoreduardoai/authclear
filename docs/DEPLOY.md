# Deploy

AuthClear is a static site. `npm run build` writes `dist/`. The page does not call a backend and does not need a secret.

This environment had no Cloudflare API token and no Hugging Face token, so nothing was deployed. The config below is ready to run with an account you control.

Vercel is not a target. The Vercel terms say: "You shall only use the Services under a Hobby plan for your personal or non-commercial use." This prototype is for a company. See the Hobby plan section of the [Vercel Terms of Service](https://vercel.com/legal/terms).

## Cloudflare Pages

`wrangler.toml` sets `pages_build_output_dir = "dist"`. It does not contain an account id or a token.

```bash
npm ci
npm run build
npx wrangler pages deploy dist --project-name authclear
```

Wrangler will ask you to log in, or you can set `CLOUDFLARE_API_TOKEN` yourself. Do not commit the token.

`public/_redirects` maps `/health` to `/health.json`. `public/_headers` sets `Content-Type: application/json` for both.

After deploy, open the pages URL in a private window. You should see the denial headline "Not Certified" with no login wall. `https://<project>.pages.dev/health.json` should return `"auth": "none"`.

## Hugging Face static Space

Hugging Face static Spaces allow the files to be served without a server SDK. Create an empty static Space in the Hugging Face UI (no token is stored in this repo), then upload:

- everything inside `dist/`
- a `README.md` at the Space root whose first lines are the block in `docs/huggingface-space-README.md`

The Space URL will look like `https://huggingface.co/spaces/<user>/authclear` and the app will be on `https://<user>-authclear.hf.space/`.

Check the same two things: the denial headline loads with no login, and `/health.json` is the JSON file from `dist/`.

## What not to deploy

Do not put a validator jar, a terminology cache, or any `.env` file in the Space or the Pages project. The demo does not need them. Validator output already recorded in the repo is `validation/summary.json`.
