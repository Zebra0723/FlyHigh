import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getConfig, generate } from "./handlers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotEnv(path.resolve(__dirname, "..", ".env"));

const app = express();
app.use(express.json({ limit: "30mb" }));

app.get("/api/config", (_req, res) => res.json(getConfig()));

app.post("/api/generate", async (req, res) => {
  const { status, body } = await generate(req.body, req.ip);
  res.status(status).json(body);
});

const distPath = path.resolve(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  const enabled = getConfig().providers.map((p) => p.id);
  console.log(`Studio server on :${port} — providers: ${enabled.join(", ") || "NONE (set an API key)"}`);
});

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
