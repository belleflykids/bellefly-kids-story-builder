# Bellefly Kids Story Builder — AI agent (demo only)

This folder is the Meta AI part of the demo, so judges can see it in the repo.

## What it is
- A Cloudflare Worker that calls the Meta Model API, model **Muse Spark 1.3, Standard tier**.
- It is LIVE as of October 30, 2026. The Worker is deployed as bellefly-ai-draft on Cloudflare, and the live demo page (V41) calls it.
- No API key is in this repo, in this file, or in the demo page. The key lives only as a server secret on Cloudflare.

## How it works, in order
1. Parent taps the AI draft button (parent only, never a child).
2. The page sends ONLY three button choices to the Worker: character, theme, age. It never sends a child's name.
3. The Worker checks those choices against the allowed lists. Anything else is rejected before any API call.
4. Origin allowlist: a browser Origin must be https://belleflykids.github.io, otherwise 403. Rate limit: max 10 requests per minute per hashed IP, otherwise 429. IPs are hashed with SHA-256 first, never stored raw.
5. GATE: if no META_API_KEY secret is set on the server, the Worker returns 503 "AI not connected yet" and makes NO API call and NO charge. A key is set now, so live drafts return 200.
6. If a key IS set, the Worker calls Meta server-side, with a fixed system prompt: gentle Bellefly bedtime story, Garden in the evening as the character gets ready for bed, kind/helpful, calm/bedtime-safe, bedtime ending, clean words, never the words magic/magical/mystical, no holiday themes, no religious symbols, 3 short paragraphs, about 150-250 words, locked character looks (for example, Toby is a boy, never an animal), Taylor Shift rolls, not walks, no new named characters invented. It returns draft text only.
7. The browser validator checks that draft. Fail = blocked, never shown as a story. Pass = parent preview only. Parent Approve makes it a story, Discard kills it.

## What it is NOT
- Not a separate AI safety agent. The child protection layer is this validator PLUS the human parent Approve gate, together.
- Not Contributor tier. Standard tier only.
- Not connected to the commercial Bedtime Bundle, its Worker, or its files. This is demo-only code for the hackathon, October 26 to November 4, 2026.

## Live deployment
- This Worker is deployed separately from the bundle delivery Worker.
- The key is set as a server secret only. Never paste a key into GitHub, chat, or this file.
- Live drafts were tested end-to-end on October 30, 2026, including validator PASS and parent Approve on the live demo page.
