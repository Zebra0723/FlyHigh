// Request handling shared by the Express server (server/index.js) and the
// Vercel serverless functions (api/*.js).
import { buildPrompt } from "./prompt.js";
import { providers, availableProviders } from "./providers.js";

const accessCode = () => process.env.ACCESS_CODE || "";

export function getConfig() {
  return { providers: availableProviders(), requiresAccessCode: Boolean(accessCode()) };
}

// Simple in-memory rate limit: N generations per IP per hour. On serverless
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

export async function generate(body, ip) {
  const { provider, accessCode: code, reference, aspect, options = {} } = body || {};

  if (accessCode() && code !== accessCode()) {
    return { status: 401, body: { error: "Invalid access code." } };
  }
  if (rateLimited(ip || "unknown")) {
    return { status: 429, body: { error: "Rate limit reached. Try again later." } };
  }
  const impl = providers[provider];
  if (!impl || !impl.enabled()) {
    return { status: 400, body: { error: `Provider "${provider}" is not configured on the server.` } };
  }
  if (!isImageDataUrl(reference)) {
    return { status: 400, body: { error: "Missing or invalid reference image." } };
  }
  if (!["1:1", "3:2", "2:3"].includes(aspect)) {
    return { status: 400, body: { error: "Unsupported aspect ratio." } };
  }

  const prompt = buildPrompt(options);
  const started = Date.now();
  try {
    const image = await impl.generate({ prompt, reference, aspect });
    console.log(`[generate] ${provider} ok in ${Date.now() - started}ms`);
    return { status: 200, body: { image, prompt } };
  } catch (err) {
    console.error(`[generate] ${provider} failed:`, err);
    return { status: 502, body: { error: err.message || "Generation failed." } };
  }
}
