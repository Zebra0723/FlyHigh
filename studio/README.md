# FlyHigh Studio

A standalone app, separate from the main FlyHigh site, that turns an uploaded **3D model** into a
**realistic, studio-quality photograph of a real version of that object**.

It has its own `package.json`, server and build, and shares no code or database with the main app,
so you can deploy it on its own.

## How it works

1. **Upload** a model (GLB, GLTF, OBJ+MTL, STL, FBX or PLY). Drop textures and `.bin` files in at the
   same time and they'll be linked up. A demo paper plane loads by default.
2. **Compose the shot** in the 3D viewer: orbit, zoom, pick the frame (1:1, 3:2, 2:3), backdrop and lighting.
   The viewer frame is exactly what gets sent.
3. **Describe it** ("ceramic coffee mug", "brushed aluminium") so the AI knows what the real object is made of.
4. **Generate.** The browser renders two references at full resolution:
   - a shaded *beauty* render (used by OpenAI and Gemini), and
   - a normalised *depth map* (used by FLUX Depth, which keeps the geometry exactly).

   The server builds a product-photography prompt and calls the image model you picked.
5. Compare the result with the 3D reference using the before/after slider, then download it.

## Engines

Set at least one key. The UI only lists engines whose key is set.

| Env var | Engine | Notes |
|---|---|---|
| `OPENAI_API_KEY` | GPT Image (`/v1/images/edits`, high fidelity) | Best all-rounder |
| `GEMINI_API_KEY` | Gemini image (`gemini-2.5-flash-image`) | Fast, keeps shape well |
| `REPLICATE_API_TOKEN` | FLUX Depth Pro | Geometry-locked; needs a good description |

Optional: `OPENAI_IMAGE_MODEL`, `GEMINI_IMAGE_MODEL`, `REPLICATE_MODEL` override the models.
`ACCESS_CODE` makes the UI ask for a code before it will generate, so strangers can't spend your credits.
`RATE_LIMIT_PER_HOUR` limits generations per IP (default 30).

## Run locally

```bash
cd studio
cp .env.example .env   # add at least one key
npm install
npm run dev            # http://localhost:5174 (API on :3001)
```

Production build: `npm run build && npm start`. One Node process serves both the UI and the API on `PORT`.

## Deploy

**Render (same host as the main app, as a separate service):**
New → Web Service, pick this repo, then set:
- Root Directory: `studio`
- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npm start`
- Environment: your API key(s), plus `ACCESS_CODE` if you want one

You can also use the blueprint in `studio/render.yaml`.

**Anywhere with Docker:** `docker build -t flyhigh-studio studio && docker run -p 3001:3001 -e OPENAI_API_KEY=... flyhigh-studio`
