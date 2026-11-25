# AuthClear

AuthClear reads a prior-authorization decision from FHIR Patient Access data and says it in plain language. It also prepares a next-action task a member-services navigator can download.

This is a prototype for [HIMSS27 Emerge](https://www.himssconference.com/emerge/), Challenge 1 (Patient Access, Experience & Care Navigation). It uses published HL7 example data and synthetic records only. No real members. Not a coverage decision, clinical advice, or legal advice.

Live demo, no login:

- [https://authclear-delta.vercel.app](https://authclear-delta.vercel.app)
- [https://igoreduardoai.github.io/authclear/](https://igoreduardoai.github.io/authclear/)

`GET /health` on either host returns static JSON. No API key is required.

The working source, tests, and this demo live on the `redesign-ui` branch (open pull request stack). They have not been merged into this default branch yet.

By Igor Eduardo. MIT license. See [LICENSE](LICENSE).
