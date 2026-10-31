// Bellefly Kids Story Builder — AI draft proxy (Cloudflare Worker, COMPLETE, Step 1 + V34 abuse protection)
// ============================================================================
// DEPLOYMENT — DO NOT RUN LIVE UNTIL THE $150 CREDIT LANDS:
//   1) wrangler secret put META_API_KEY   (never paste a key into the repo, chat, or this file)
//   2) Deploy this Worker, then point the demo page's /api/draft fetch at it.
//   3) Until then, this Worker returns 503 "AI not connected yet" and makes
//      NO Meta API call and NO charge. Writing this code costs nothing.
//
// ENDPOINT: POST /api/draft
//   Request (from a parent only, never from a child):
//     { "character": "Toby", "theme": "kindness", "age": "4-5" }
//   Success response:
//     { "draft": "story text..." }
//   Not-connected response (no key set):
//     { "error": "AI not connected yet — credit/key pending" }  (503)
//
// SAFETY FLOW — THE WORKER DOES NOT DECIDE WHAT A CHILD HEARS:
//   1) Worker returns ONLY a draft text string.
//   2) The browser runs the real rule validator (validateStory) on that draft.
//   3) If the draft FAILS, it is blocked and never becomes a story.
//   4) If it PASSES, it is shown to a PARENT ONLY for preview.
//   5) Only if that parent taps Approve does it become a story to read aloud.
//   A failing draft is never returned as a story, by this Worker or by the page.
//
// ALLOWED VALUES — anything else is rejected with 400, before any API call:
const CHARACTERS = ["Toby", "Emma", "Luna", "Shelly", "Benny Baby Bee", "Cory", "Pippa", "Taylor Shift"];
const THEMES = ["kindness", "courage", "sharing", "patience", "gratitude", "friendship"];
const AGES = ["2-3", "4-5", "6-7"];

// Locked character looks — added 30 Oct after the first live draft called
// Toby "a little bunny". The model must never change who a character is.
// These descriptions are fixed, not user-typed, and match the Bellefly Kids
// locked looks. The parent only picks buttons; no free text from a child
// ever reaches the model.
const CHARACTER_LOOKS = {
  "Toby": "Toby is a little boy with short blonde hair, a light blue shirt, mustard-yellow overalls with a blue flower emblem on the pocket, a blue bow tie, barefoot. He is a boy, never an animal.",
  "Emma": "Emma is a little girl with brown hair and bangs, a pink butterfly hair pin (never a flower), a pink butterfly-print top, a pink sparkly tulle skirt, pink butterfly shoes, frilly pink socks, and a pink-and-purple butterfly backpack.",
  "Luna": "Luna is a baby butterfly with fluffy cream fur, big purple eyes, rosy cheeks, two curly brown antennae, and large sparkly translucent purple and pink wings with colorful polka dots.",
  "Shelly": "Shelly is a fluffy baby dragonfly with soft pastel blue and lavender fur, big purple eyes, four sparkly translucent wings, a purple bow on her head, fluffy pom-pom antennae, and a striped pastel tail.",
  "Benny Baby Bee": "Benny Baby Bee is a fluffy baby bumblebee with soft golden-yellow fur, big sparkly brown eyes, two curly brown antennae tipped with fluffy yellow pom-poms, four iridescent sparkly wings, a fuzzy black-and-yellow striped body, and a purple bow tie with a gold heart charm stamped with the letter B.",
  "Cory": "Cory is a little caterpillar with soft fuzzy light-green fur, big green eyes, rosy cheeks, two fuzzy green antennae, a segmented fluffy body with little round green feet, and a green polka-dot bow tie.",
  "Pippa": "Pippa is a baby girl with light golden-brown hair in a high bouncy ponytail tied with a pink bow, big warm brown eyes and rosy cheeks, wearing a pink dress with ruffled sleeves, a big pink satin bow at the waist, and colorful flowers and butterflies on the skirt, barefoot.",
  "Taylor Shift": "Taylor Shift is a pink cartoon train engine with a friendly face, big blue eyes, a happy smile, rosy cheeks, gold trim, a gold cowcatcher and gold lamp, pink hibiscus flowers by the smokestack, and a pink-and-gold nameplate reading Taylor Shift. She is a train: she rolls, she does not walk."
};

function systemPrompt(character, theme, age) {
  return [
    "You write a gentle bedtime story for the Bellefly Kids world.",
    "Character: " + character + ". Lesson: " + theme + ". Age band: " + age + ".",
    "The character must look and be exactly this, never changed: " + (CHARACTER_LOOKS[character] || character) + ".",
    "Setting: the Bellefly Kids Garden in the evening, as the character gets ready for bed, kind friends, calm pace.",
    "This is a bedtime story, not a morning story: do NOT start with waking up, morning, a new day, or warm morning sun. Start in the evening, winding down toward bed.",
    "Use only the chosen character, with Garden friends in general if needed. Do NOT invent new named characters, and do NOT give another character's name to a different animal or person.",
    "Rules, all mandatory:",
    "- Kind and helpful: show helping, kindness, sharing, thanks, or trying.",
    "- Calm and bedtime-safe: no scary, frightening, or hurtful words, no fights,",
    "  no strangers, no secrets, no sneaking out, no staying up all night alone.",
    "- Bedtime ending: end with goodnight and sleep.",
    "- Clean words only. Never use the words: magic, magical, mystical.",
    "- No birthday, Christmas, Easter, or Halloween themes. No religious symbols.",
    "- 3 short paragraphs, about 150 to 250 words, preschool vocabulary.",
    "- If the character is Taylor Shift, she is a train: she rolls, she does not walk.",
    "Return ONLY the story text. No title, no explanation, no extra text."
  ].join("\n");
}

export default {
  async fetch(request, env) {
    // CORS — the demo page on https://belleflykids.github.io must be able to
    // read the response. Without this header the browser blocks it, even
    // when the Worker returns a draft. Only that one origin is allowed.
    const cors = {
      "Access-Control-Allow-Origin": "https://belleflykids.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status,
      headers: Object.assign({ "Content-Type": "application/json" }, cors)
    });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "Parent AI draft only" }, 405);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "Invalid request" }, 400); }
    const { character, theme, age } = body || {};
    if (!CHARACTERS.includes(character) || !THEMES.includes(theme) || !AGES.includes(age)) {
      return json({ error: "Invalid character, theme, or age" }, 400);
    }

    // ABUSE PROTECTION — added V34, before any API call, before any key use:
    // (a) Origin allowlist: if a browser sends an Origin header, it must be
    //     the Pages demo site. A request with no Origin (e.g. a direct test)
    //     is still allowed, but is rate-limited below.
    // (b) Rate limit: max 10 draft requests per minute per calling IP.
    //     This stops one person, or one script, burning through credits.
    //     The limit is in-memory per Worker instance, which is enough for a
    //     demo — it is not a full production abuse system, and is not claimed as one.
    const origin = request.headers.get("Origin");
    if (origin && origin !== "https://belleflykids.github.io") {
      return json({ error: "Origin not allowed" }, 403);
    }
    // COPPA note: do NOT store raw IP addresses. Hash the IP first, keep
    // only the hash for 60 seconds for rate limiting, then drop it. No child
    // data is ever in this request — only character, theme, and age buttons.
    const rawIp = request.headers.get("CF-Connecting-IP") || "unknown";
    let ip = "unknown";
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawIp));
      ip = Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2, "0"); }).join("").slice(0, 16);
    } catch (e) { ip = "unknown"; }
    const now = Date.now();
    const bucket = (globalThis.__belleflyRate || (globalThis.__belleflyRate = new Map())).get(ip) || [];
    const recent = bucket.filter(function(t){ return now - t < 60000; });
    if (recent.length >= 10) {
      return json({ error: "Rate limit: too many draft requests, try again in a minute" }, 429);
    }
    recent.push(now);
    globalThis.__belleflyRate.set(ip, recent);

    // STEP 1 GATE — no key, no call, no charge. This is the current state
    // until the $150 credit lands and a key is stored as a secret.
    if (!env.META_API_KEY) {
      return json({ error: "AI not connected yet — credit/key pending" }, 503);
    }

    // STEP 2 — live call, server-side only. The key never leaves this Worker.
    // Meta Model API, OpenAI-compatible chat completions endpoint.
    try {
      const resp = await fetch("https://api.meta.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + env.META_API_KEY
        },
        body: JSON.stringify({
          model: "muse-spark-1.3",
          messages: [
            { role: "system", content: systemPrompt(character, theme, age) },
            { role: "user", content: "Write the bedtime story." }
          ],
          // Muse Spark is a reasoning model: max_tokens counts its thinking
          // tokens too. 600 was used up by thinking alone on 30 Oct (1 request,
          // 225 input, 600 output, no story text). Raise the cap and keep
          // reasoning minimal, so room is left for the story itself.
          max_tokens: 2000,
          reasoning_effort: "minimal",
          temperature: 0.7
        })
      });
      if (!resp.ok) {
        return json({ error: "Meta AI request failed, no draft returned" }, 502);
      }
      const data = await resp.json();
      const draft = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!draft || typeof draft !== "string") {
        return json({ error: "Meta AI returned no draft text" }, 502);
      }
      // Return draft ONLY. Validation + parent approval happen in the browser.
      return json({ draft: draft.trim() }, 200);
    } catch (e) {
      return json({ error: "Meta AI request failed, no draft returned" }, 502);
    }
  }
};
