// Bellefly Kids Story Builder — AI draft proxy (Cloudflare Worker, COMPLETE, Step 1 + V34 abuse protection)
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

// System prompt — fixed, not user-typed. The parent only picks buttons;
// no free text from a child ever reaches the model.
function systemPrompt(character, theme, age) {
  return [
    "You write a gentle bedtime story for the Bellefly Kids world.",
    "Character: " + character + ". Lesson: " + theme + ". Age band: " + age + ".",
    "Setting: the Bellefly Kids Garden, bright daytime, kind friends, calm pace.",
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
    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json" }
    });

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
