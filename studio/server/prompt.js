export const LIGHTING = {
  softbox:
    "high-key studio lighting with a large overhead softbox and two strip-light fills, soft even shadows, gentle specular highlights",
  dramatic:
    "low-key dramatic studio lighting with a single hard key light and strong rim lights outlining the silhouette, deep controlled shadows",
  hero:
    "premium product-hero lighting: large diffused key light, crisp edge rim lights, subtle gradient falloff, glossy controlled reflections",
  natural:
    "soft natural window light from the side, gentle bounce fill, realistic soft shadows",
};

export const BACKDROP = {
  white: "a seamless pure white paper sweep backdrop",
  grey: "a seamless mid-grey gradient studio backdrop",
  black: "a seamless matte black backdrop",
  warm: "a seamless warm beige paper backdrop",
  concrete: "a smooth polished concrete surface with a softly blurred grey wall behind",
  wood: "a light oak tabletop with a softly blurred neutral wall behind",
};

const clean = (s, max = 300) =>
  String(s || "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, max);

export function buildPrompt(options) {
  const subject = clean(options.subject) || "the object shown in the reference image";
  const material = clean(options.material);
  const extra = clean(options.extra, 500);
  const lighting = LIGHTING[options.lighting] || LIGHTING.softbox;
  const backdrop = BACKDROP[options.backdrop] || BACKDROP.white;

  return [
    `A professional, photorealistic studio product photograph of a real, physically manufactured ${subject}.`,
    "Transform the 3D-model reference into a real photographed object: keep the exact same shape, proportions, silhouette, part layout, camera angle, framing and composition as the reference.",
    material
      ? `Materials: ${material}, with true-to-life surface texture, micro-detail and subtle real-world imperfections.`
      : "Infer realistic real-world materials for each part, with true-to-life surface texture, micro-detail and subtle real-world imperfections.",
    `Placed on ${backdrop}, with a soft natural contact shadow beneath it.`,
    `Lighting: ${lighting}.`,
    "Shot on a medium-format digital camera with a 100mm lens at f/8, tack sharp focus, accurate color, physically correct reflections, high dynamic range, commercial catalogue quality.",
    extra ? `Additional direction: ${extra}.` : "",
    "It must look like a real photograph, not a 3D render, not CGI, not a toy unless the object is a toy. No text, no logos added, no watermark, no people, no hands.",
  ]
    .filter(Boolean)
    .join(" ");
}
