// Each provider takes the studio "beauty" render and/or a depth map of the
// 3D model plus a prompt, and returns a data URL of the generated photo.

const OPENAI_SIZES = { "1:1": "1024x1024", "3:2": "1536x1024", "2:3": "1024x1536" };

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)[1];
  return new Blob([Buffer.from(b64, "base64")], { type: mime });
}

async function readError(res) {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j.error?.message || j.detail || j.error || text;
  } catch {
    return text.slice(0, 500);
  }
}

const openai = {
  id: "openai",
  label: "OpenAI GPT Image",
  description: "Best all-rounder. Reads the shaded render and infers real materials.",
  enabled: () => Boolean(process.env.OPENAI_API_KEY),
  async generate({ prompt, beauty, aspect }) {
    const form = new FormData();
    form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
    form.append("image", dataUrlToBlob(beauty), "reference.png");
    form.append("prompt", prompt);
    form.append("size", OPENAI_SIZES[aspect]);
    form.append("quality", "high");
    form.append("input_fidelity", "high");
    form.append("n", "1");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    if (!res.ok) throw new Error(`OpenAI: ${await readError(res)}`);
    const json = await res.json();
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI returned no image.");
    return `data:image/png;base64,${b64}`;
  },
};

const gemini = {
  id: "gemini",
  label: "Google Gemini Image",
  description: "Fast and strong at keeping the exact shape of the reference.",
  enabled: () => Boolean(process.env.GEMINI_API_KEY),
  async generate({ prompt, beauty, aspect }) {
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: "image/png", data: beauty.split(",")[1] } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: aspect },
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini: ${await readError(res)}`);
    const json = await res.json();
    const parts = json.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p) => p.inlineData || p.inline_data);
    const data = img?.inlineData || img?.inline_data;
    if (!data) {
      const reason = json.candidates?.[0]?.finishReason || json.promptFeedback?.blockReason;
      throw new Error(`Gemini returned no image${reason ? ` (${reason})` : ""}.`);
    }
    return `data:${data.mimeType || data.mime_type || "image/png"};base64,${data.data}`;
  },
};

const replicate = {
  id: "replicate",
  label: "FLUX Depth (Replicate)",
  description: "Locks geometry to a depth map. Describe the object well for best results.",
  enabled: () => Boolean(process.env.REPLICATE_API_TOKEN),
  async generate({ prompt, depth }) {
    const model = process.env.REPLICATE_MODEL || "black-forest-labs/flux-depth-pro";
    const headers = {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    };
    const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: {
          prompt,
          control_image: depth,
          steps: 50,
          guidance: 12,
          output_format: "png",
          safety_tolerance: 2,
        },
      }),
    });
    if (!res.ok) throw new Error(`Replicate: ${await readError(res)}`);
    let prediction = await res.json();

    const deadline = Date.now() + 180_000;
    while (!["succeeded", "failed", "canceled"].includes(prediction.status)) {
      if (Date.now() > deadline) throw new Error("Replicate: timed out waiting for result.");
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(prediction.urls.get, { headers: { Authorization: headers.Authorization } });
      if (!poll.ok) throw new Error(`Replicate: ${await readError(poll)}`);
      prediction = await poll.json();
    }
    if (prediction.status !== "succeeded") {
      throw new Error(`Replicate: ${prediction.error || prediction.status}`);
    }
    const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    const img = await fetch(url);
    if (!img.ok) throw new Error("Replicate: could not download result.");
    const mime = img.headers.get("content-type") || "image/png";
    const b64 = Buffer.from(await img.arrayBuffer()).toString("base64");
    return `data:${mime};base64,${b64}`;
  },
};

export const providers = { openai, gemini, replicate };

export function availableProviders() {
  return Object.values(providers)
    .filter((p) => p.enabled())
    .map(({ id, label, description }) => ({ id, label, description }));
}
