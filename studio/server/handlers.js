// Request handling shared by the Express server (server/index.js) and the
// Vercel serverless functions (api/*.js).
import { buildPrompt } from "./prompt.js";
import { providers, availableProviders } from "./providers.js";
import { artDirect, claudeEnabled } from "./claude.js";

const accessCode = () => process.env.ACCESS_CODE || "";

export function getConfig() {
  return {
    providers: availableProviders(),
    claude: claudeEnabled(),
    requiresAccessCode: Boolean(accessCode()),
  };
}

// Simple in-memory rate limit: N requests per IP per hour. On serverless
// hosts this is per warm instance only, so treat ACCESS_CODE as the real guard.
const hits = new Map();
function rateLimited(ip) {
  const limit = Number(process.env.RATE_LIMIT_PER_HOUR || 30);
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  const limited = recent.length >= limit;
  if (!limited) recent.push(now);
  hits.set(ip, recent);
  return limited;
}

const isImageDataUrl = (v) =>
  typeof v === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(v);

const fail = (status, error) => ({ status, body: { error } });

function guard(body, ip) {
  if (accessCode() && body?.accessCode !== accessCode()) return fail(401, "Invalid access code.");
  if (rateLimited(ip || "unknown")) return fail(429, "Rate limit reached. Try again later.");
  if (!isImageDataUrl(body?.beauty)) return fail(400, "Missing or invalid reference image.");
  return null;
}

// Claude identifies the object from the render and suggests a description.
export async function describe(body, ip) {
  const blocked = guard(body, ip);
  if (blocked) return blocked;
  if (!claudeEnabled()) return fail(400, "Claude is not configured on the server.");
  try {
    const { subject, materials } = await artDirect({ image: body.beauty, options: body.options });
    return { status: 200, body: { subject, materials } };
  } catch (err) {
    console.error("[describe] failed:", err);
    return fail(502, err.message || "Claude could not read the model.");
  }
}

export async function generate(body, ip) {
  const blocked = guard(body, ip);
  if (blocked) return blocked;
  const { provider, beauty, depth, aspect, options = {}, useClaude } = body;

  const impl = providers[provider];
  if (!impl || !impl.enabled()) return fail(400, `Provider "${provider}" is not configured on the server.`);
  const reference = impl.uses === "depth" ? depth : beauty;
  if (!isImageDataUrl(reference)) return fail(400, "Missing or invalid reference image.");
  if (!["1:1", "3:2", "2:3"].includes(aspect)) return fail(400, "Unsupported aspect ratio.");

  const started = Date.now();
  let prompt = buildPrompt(options);
  let directedBy = "template";
  if (useClaude && claudeEnabled()) {
    try {
      ({ prompt } = await artDirect({ image: beauty, options, engine: impl }));
      directedBy = "claude";
    } catch (err) {
      // The template prompt still works, so a Claude hiccup shouldn't block the shot.
      console.error("[generate] Claude art direction failed, using template:", err);
    }
  }

  try {
    const image = await impl.generate({ prompt, reference, aspect });
    console.log(`[generate] ${provider} (${directedBy}) ok in ${Date.now() - started}ms`);
    return { status: 200, body: { image, prompt, directedBy } };
  } catch (err) {
    console.error(`[generate] ${provider} failed:`, err);
    return fail(502, err.message || "Generation failed.");
  }
}
