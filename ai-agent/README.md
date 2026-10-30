# Bellefly Kids Story Builder — AI agent (demo only)

This folder is the Meta AI part of the demo, so judges can see it in the repo.

## What it is
- A Cloudflare Worker that calls the Meta Model API, model **Muse Spark 1.3, Standard tier**.
- It is NOT live yet. It is NOT deployed yet. No API key is in this repo, in this file, or in the demo page.
- The demo page's "Parent only: Try a new AI draft" button calls POST /api/draft on this Worker, when deployed.

## How it works, in order
1. Parent taps the AI draft button (parent only, never a child).
2. The page sends ONLY three button choices to the Worker: character, theme, age. It never sends a child's name.
3. The Worker checks those choices against the allowed lists. Anything else is rejected before any API call.
4. Origin allowlist: a browser Origin must be https://belleflykids.github.io, otherwise 403. Rate limit: max 10 requests per minute per hashed IP, otherwise 429. IPs are hashed with SHA-256 first, never stored raw.
5. GATE: if no META_API_KEY secret is set on the server, the Worker returns 503 "AI not connected yet" and makes NO API call and NO charge. This is the current state.
6. If a key IS set (only after Meta AI credits show in Billing), the Worker calls Meta server-side, with a fixed system prompt: gentle Bellefly bedtime story, kind/helpful, calm/bedtime-safe, bedtime ending, clean words, never the words magic/magical/mystical, no holiday themes, no religious symbols, 3 short paragraphs, about 150-250 words, Taylor Shift rolls, not walks. It returns draft text only.
7. The browser validator checks that draft. Fail = blocked, never shown as a story. Pass = parent preview only. Parent Approve makes it a story, Discard kills it.

## What it is NOT
- Not a separate AI safety agent. The child protection layer is this validator PLUS the human parent Approve gate, together.
- Not Contributor tier. Standard tier only, so draft inputs/outputs are not used to train Meta's models.
- Not connected to the commercial Bedtime Bundle, its Worker, or its files. This is demo-only code for the hackathon, October 26 to November 4, 2026.

## To deploy (only when credits show)
- Deploy this Worker separately from the bundle delivery Worker.
- Set the key as a server secret only, e.g. `wrangler secret put META_API_KEY`. Never paste a key into GitHub, chat, or this file.
- Then test one parent-only draft end-to-end, and watch Spend/Requests in dev.meta.ai Billing.
