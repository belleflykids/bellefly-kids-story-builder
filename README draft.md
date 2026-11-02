# Bellefly Kids Story Builder

A parent-led bedtime story builder, not a chat for a child.

Parents and caregivers operate it and read aloud. Children listen, never type.

## Three easy steps

One, pick a character.
Two, pick a theme.
Three, pick an age appropriate group.
Then tap Make a story. That easy.

A parent picks a character (8 Bellefly Kids characters), a theme (6: kindness, courage, sharing, patience, gratitude, friendship), and an age band (2–3, 4–5, 6–7), and an optional first name that is never stored or sent anywhere. A parent gets a gentle story to preview and read aloud, with Read to me on top.

The youngest version (2–3) is shorter and concrete — setup plus action only — with the abstract closing paragraph held for older ages.

## Live demo

https://belleflykids.github.io/bellefly-kids-story-builder/

Demo video (Unlisted, 2:57): https://youtu.be/nzNGtM1hfis

## What was built, October 26 to November 4, 2026

This demo was built for the Meta Global AI Developer Hackathon, October 26 to November 4, 2026, for the pre-existing Bellefly Kids world. The Bellefly Kids characters and world existed before the hackathon and are not claimed as hackathon inventions.

Built during the hackathon:
- The Story Builder code (`index.html`) — 144 intended story combinations (8 characters × 6 themes × 3 ages), all pre-written and checked, with no fallbacks in testing.
- The safety validator — fail-closed. A draft must pass all checks, including a calm bedtime ending, before a parent can read it.
- The safety test suite — 14 tests, run from the live demo page.
- The AI Worker (`ai-agent/`) — a parent-only AI draft mode, made with Muse Spark 1.3 through the Meta Model API (Standard tier), through a protected Cloudflare Worker. The Worker accepts only character, theme, and age from fixed allowlists, and never receives a child's name. The API key is stored as a Cloudflare Worker secret and never sent to the browser.
- The song, images, and live recording created for the demo video.

## Safety — the child protection layer

Safety here is the validator plus parent preview and Approve, together:
1. Checked stories first
2. A safety check second
3. A parent preview and approve third

No draft reaches a child without both checks. A simple parent quick-check unlocks the AI draft button for that page visit, the draft is checked first, and only a parent tapping Approve makes it a story to read aloud. It never goes straight to a child.

There are no child accounts, no child typing, no ads, no trackers, and no personal data collected by the demo itself; standard host logs only.

## Files in this repo

- `index.html` — the live demo (V48, November 2, 2026)
- `ai-agent/` — the protected Cloudflare Worker code for the parent-only AI draft
- `bellefly-story-builder-header.webp` and the 8 character images (`toby.webp`, `emma.webp`, `luna.webp`, `shelly.webp`, `benny-baby-bee.webp`, `cory.webp`, `pippa.webp`, `taylor-shift.webp`) — the images the live demo loads

## How to try it

Open the live demo link above, pick a character, a theme, and an age band, then tap Make a story. To test the validator, use the parent-only draft checker on the page. To test the AI draft, answer the parent quick-check, then ask for a draft to preview — it will be checked first, and only a parent Approve makes it a story.
