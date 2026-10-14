import { generate } from "../server/handlers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const { status, body } = await generate(req.body, ip);
  res.status(status).json(body);
}
