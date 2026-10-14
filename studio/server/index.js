import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { buildPrompt } from "./prompt.js";
import { providers, availableProviders } from "./providers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotEnv(path.resolve(__dirname, "..", ".env"));

const app = express();
app.use(express.json({ limit: "30mb" }));

const ACCESS_CODE = process.env.ACCESS_CODE || "";

app.get("/api/config", (_req, res) => {
  res.json({
    providers: availableProviders(),
    requiresAccessCode: Boolean(ACCESS_CODE),
  });
});

// Simple in-memory rate limit: N generations per IP per window.
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR || 30);
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

app.post("/api/generate", async (req, res) => {
  const { provider, accessCode, beauty, depth, aspect, options = {} } = req.body || {};

  if (ACCESS_CODE && accessCode !== ACCESS_CODE) {
    return res.status(401).json({ error: "Invalid access code." });
  }
  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: "Rate limit reached. Try again later." });
  }
  const impl = providers[provider];
  if (!impl || !impl.enabled()) {
    return res.status(400).json({ error: `Provider "${provider}" is not configured on the server.` });
  }
  if (!isPngDataUrl(beauty) || !isPngDataUrl(depth)) {
    return res.status(400).json({ error: "Missing or invalid reference images." });
  }
  if (!["1:1", "3:2", "2:3"].includes(aspect)) {
    return res.status(400).json({ error: "Unsupported aspect ratio." });
  }

  const prompt = buildPrompt(options);
  const started = Date.now();
  try {
    const image = await impl.generate({ prompt, beauty, depth, aspect });
    console.log(`[generate] ${provider} ok in ${Date.now() - started}ms`);
    res.json({ image, prompt });
  } catch (err) {
    console.error(`[generate] ${provider} failed:`, err);
    res.status(502).json({ error: err.message || "Generation failed." });
  }
});

const distPath = path.resolve(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  const enabled = availableProviders().map((p) => p.id);
  console.log(`Studio server on :${port} — providers: ${enabled.join(", ") || "NONE (set an API key)"}`);
});

function isPngDataUrl(v) {
  return typeof v === "string" && v.startsWith("data:image/png;base64,");
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
