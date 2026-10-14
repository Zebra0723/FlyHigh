import "./style.css";
import { StudioViewer } from "./viewer.js";
import { loadModel } from "./loaders.js";
import { createPaperPlane } from "./demo.js";

const $ = (id) => document.getElementById(id);
const picked = (name) => document.querySelector(`input[name="${name}"]:checked`);
const CAPTURE_SIZES = { "1:1": [1024, 1024], "3:2": [1536, 1024], "2:3": [1024, 1536] };
const DEMO_SUBJECT = "folded paper airplane";

const viewer = new StudioViewer($("viewport"));
viewer.setModel(createPaperPlane());
$("subject").value = DEMO_SUBJECT;
$("material").value = "crisp white printer paper with sharp creases";

// ---- Model upload -------------------------------------------------------
async function handleFiles(files) {
  if (!files?.length) return;
  showError("");
  $("modelName").textContent = "Loading…";
  try {
    const { object, name } = await loadModel(files);
    viewer.setModel(object);
    viewer.setMaterialOverride($("clay").checked ? "clay" : "original");
    $("modelName").textContent = name;
    if ($("subject").value === DEMO_SUBJECT) {
      $("subject").value = "";
      $("material").value = "";
    }
  } catch (err) {
    $("modelName").textContent = "No model loaded";
    showError(err.message);
  }
}

$("fileInput").addEventListener("change", (e) => handleFiles(e.target.files));
const dz = $("dropzone");
["dragenter", "dragover"].forEach((t) =>
  dz.addEventListener(t, (e) => (e.preventDefault(), dz.classList.add("over"))),
);
["dragleave", "drop"].forEach((t) => dz.addEventListener(t, () => dz.classList.remove("over")));
dz.addEventListener("drop", (e) => {
  e.preventDefault();
  handleFiles(e.dataTransfer.files);
});

document.querySelectorAll("[data-rot]").forEach((b) =>
  b.addEventListener("click", () => viewer.rotateModel(b.dataset.rot)),
);
$("reframe").addEventListener("click", () => viewer.frame());
$("clay").addEventListener("change", (e) => viewer.setMaterialOverride(e.target.checked ? "clay" : "original"));
$("exposure").addEventListener("input", (e) => viewer.setExposure(Number(e.target.value)));

// ---- Studio setup -------------------------------------------------------
const syncBackdrop = () => viewer.setBackdrop(picked("backdrop").dataset.color);

// Fit the viewport to the chosen frame inside the available stage area.
const wrap = document.querySelector(".viewport-wrap");
function syncAspect() {
  const [aw, ah] = picked("aspect").value.split(":").map(Number);
  const cs = getComputedStyle(wrap);
  const availW = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const stacked = window.matchMedia("(max-width: 900px)").matches;
  const availH = stacked
    ? window.innerHeight * 0.6
    : wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  let w = availW;
  let h = (w * ah) / aw;
  if (h > availH) {
    h = availH;
    w = (h * aw) / ah;
  }
  $("viewport").style.width = `${Math.floor(w)}px`;
  $("viewport").style.height = `${Math.floor(h)}px`;
}
document.querySelectorAll('input[name="backdrop"]').forEach((i) => i.addEventListener("change", syncBackdrop));
document.querySelectorAll('input[name="aspect"]').forEach((i) => i.addEventListener("change", syncAspect));
new ResizeObserver(syncAspect).observe(wrap);
window.addEventListener("resize", syncAspect);
syncBackdrop();
syncAspect();

// ---- Server config ------------------------------------------------------
let providers = [];
async function loadConfig() {
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    providers = cfg.providers || [];
    $("accessWrap").hidden = !cfg.requiresAccessCode;
    try {
      $("accessCode").value = localStorage.getItem("studio-access") || "";
    } catch {}
  } catch {
    providers = [];
  }
  $("providers").innerHTML = providers
    .map(
      (p, i) => `<label class="chip"><input type="radio" name="provider" value="${p.id}"${i ? "" : " checked"} />
        <span class="dot"></span>${p.label}</label>`,
    )
    .join("");
  document.querySelectorAll('input[name="provider"]').forEach((i) => i.addEventListener("change", syncProviderHint));
  if (!providers.length) {
    $("generate").disabled = true;
    $("providerHint").textContent =
      "No engine configured. Set OPENAI_API_KEY, GEMINI_API_KEY or REPLICATE_API_TOKEN on the server.";
  }
  syncProviderHint();
}
function selectedProvider() {
  return providers.find((p) => p.id === picked("provider")?.value);
}
function syncProviderHint() {
  const p = selectedProvider();
  if (p) $("providerHint").textContent = p.description;
}
loadConfig();

// ---- Generate -----------------------------------------------------------
$("generate").addEventListener("click", async () => {
  const provider = selectedProvider();
  if (!provider) return;
  showError("");
  const aspect = picked("aspect").value;
  const [w, h] = CAPTURE_SIZES[aspect];
  const { beauty, depth } = viewer.capture(w, h);
  const reference = provider.uses === "depth" ? depth : beauty;
  const options = {
    subject: $("subject").value,
    material: $("material").value,
    backdrop: picked("backdrop").value,
    lighting: picked("lighting").value,
    extra: $("extra").value,
  };
  const accessCode = $("accessCode").value;
  try {
    localStorage.setItem("studio-access", accessCode);
  } catch {}

  const card = addPendingCard(beauty, aspect, provider.label);
  const btn = $("generate");
  btn.disabled = true;
  btn.querySelector(".btn-label").textContent = "Developing…";
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: provider.id, accessCode, reference, aspect, options }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    fillCard(card, json.image, beauty, json.prompt, provider.label);
  } catch (err) {
    card.remove();
    showError(err.message);
    if (!$("gallery").querySelector(".card")) {
      $("gallery").innerHTML = '<p class="empty">Developed photographs will appear here.</p>';
    }
  } finally {
    btn.disabled = false;
    btn.querySelector(".btn-label").textContent = "Generate photograph";
  }
});

let shotCount = 0;
function addPendingCard(reference, aspect, label) {
  $("gallery").querySelector(".empty")?.remove();
  const card = document.createElement("figure");
  card.className = "card pending";
  card.style.aspectRatio = aspect.replace(":", " / ");
  card.innerHTML = `<img src="${reference}" alt="" class="ghost" /><div class="bar"></div>
    <figcaption><span>Developing</span><span>${label}</span></figcaption>`;
  $("gallery").prepend(card);
  return card;
}

function fillCard(card, image, reference, prompt, label) {
  shotCount += 1;
  const n = String(shotCount).padStart(2, "0");
  card.classList.remove("pending");
  card.innerHTML = `<img src="${image}" alt="Generated studio photograph ${n}" />
    <figcaption style="color:#fff;mix-blend-mode:difference"><span>No. ${n}</span><span>${label}</span></figcaption>`;
  card.addEventListener("click", () => openLightbox(image, reference, prompt));
  openLightbox(image, reference, prompt);
}

// ---- Lightbox with before/after slider ----------------------------------
function openLightbox(image, reference, prompt) {
  $("lbImg").src = image;
  $("lbRef").src = reference;
  $("lbPrompt").textContent = prompt;
  $("lbDownload").href = image;
  $("lbDownload").download = `studio-photograph.${image.startsWith("data:image/png") ? "png" : "jpg"}`;
  $("compareSlider").value = 100;
  $("compareTop").style.clipPath = "inset(0 0 0 0)";
  $("lightbox").showModal();
}
$("compareSlider").addEventListener("input", (e) => {
  $("compareTop").style.clipPath = `inset(0 ${100 - e.target.value}% 0 0)`;
});
$("lbClose").addEventListener("click", () => $("lightbox").close());
$("lightbox").addEventListener("click", (e) => e.target === $("lightbox") && $("lightbox").close());

function showError(msg) {
  $("error").hidden = !msg;
  $("error").textContent = msg;
}
