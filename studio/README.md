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

## Claude

Claude works as the art director. It can't draw the photo itself, so it works alongside an image engine:

- **Identify with Claude** (section 02) looks at your model and fills in what the object is and what it's made of.
- **Claude art direction** (section 04, on by default) has Claude study the render and write a tailored
  photographer's brief for the engine you picked, instead of the fixed template. For FLUX, which only sees a
  depth map, Claude describes colours and materials in full. If Claude fails, generation falls back to the template.

Set `ANTHROPIC_API_KEY` to turn it on. Requests use Claude Opus 5.5 (`CLAUDE_MODEL` overrides it), with
server-side refusal fallback enabled (`fallbacks: "default"`).

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

Only this folder gets deployed. The main FlyHigh paper plane app is not built or deployed by
any of the steps below, because every option points the host at the `studio` directory.

### Vercel (recommended)

1. Go to [vercel.com/new](https://vercel.com/new) and import the `FlyHigh` GitHub repo.
2. On the configure screen, next to **Root Directory**, click **Edit** and choose `studio`.
   This is the step that makes Vercel deploy only the Studio app and ignore the main site.
3. Leave the build settings alone. `studio/vercel.json` already sets them (Vite, `npm run build`, output `dist`).
4. Open **Environment Variables**. Add `ANTHROPIC_API_KEY` for Claude, plus at least one image engine:
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `REPLICATE_API_TOKEN`

   Strongly recommended: `ACCESS_CODE`, set to any password. Without it, anyone with the link can spend your API credits.
5. Click **Deploy**. When it finishes, open the URL. The engines whose keys you set appear under 04 Develop.

To change keys later, go to Project → Settings → Environment Variables, then redeploy from the
Deployments tab, because env changes only apply to new deployments.

How it runs on Vercel: the page is served as static files, and `api/config.js` and `api/generate.js`
run as serverless functions (sharing `server/handlers.js` with the Express server). `vercel.json`
gives the functions up to 300 seconds, because image generation can take a minute or more. On the Hobby plan
that limit needs Fluid Compute, which is on by default for new projects.
The per-IP rate limit is per function instance on Vercel, so rely on `ACCESS_CODE` to keep strangers out.

CLI alternative: `cd studio && npx vercel` (answer the prompts), add the env vars with
`npx vercel env add OPENAI_API_KEY`, then `npx vercel --prod`.

### Render

New → Web Service, pick this repo, then set:
- Root Directory: `studio`
- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npm start`
- Environment: your API key(s), plus `ACCESS_CODE`

You can also use the blueprint in `studio/render.yaml`.

### Docker

`docker build -t flyhigh-studio studio && docker run -p 3001:3001 -e OPENAI_API_KEY=... flyhigh-studio`
