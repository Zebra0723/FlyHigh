import "./style.css";
import { StudioViewer } from "./viewer.js";
import { loadModel } from "./loaders.js";
import { createPaperPlane } from "./demo.js";

const $ = (id) => document.getElementById(id);
const CAPTURE_SIZES = { "1:1": [1024, 1024], "3:2": [1536, 1024], "2:3": [1024, 1536] };

const viewer = new StudioViewer($("viewport"));
viewer.setModel(createPaperPlane());
if (!$("subject").value) $("subject").value = "folded paper airplane";
if (!$("material").value) $("material").value = "crisp white printer paper with sharp creases";

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
    if ($("subject").value === "folded paper airplane") {
      $("subject").value = "";
      $("material").value = "";
    }
    $("subject").focus();
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
function syncBackdrop() {
  const opt = $("backdrop").selectedOptions[0];
  viewer.setBackdrop(opt.dataset.color);
}
// Fit the viewport to the chosen frame inside the available stage area.
const wrap = document.querySelector(".viewport-wrap");
function syncAspect() {
  const [aw, ah] = $("aspect").value.split(":").map(Number);
  const cs = getComputedStyle(wrap);
  const availW = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  const availH = mobile
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
new ResizeObserver(syncAspect).observe(wrap);
window.addEventListener("resize", syncAspect);
$("backdrop").addEventListener("change", syncBackdrop);
$("aspect").addEventListener("change", syncAspect);
syncBackdrop();
syncAspect();

// ---- Server config ------------------------------------------------------
let providers = [];
async function loadConfig() {
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    providers = cfg.providers;
    $("accessWrap").hidden = !cfg.requiresAccessCode;
    try {
      $("accessCode").value = localStorage.getItem("studio-access") || "";
    } catch {}
  } catch {
    providers = [];
  }
  const sel = $("provider");
  sel.innerHTML = providers.map((p) => `<option value="${p.id}">${p.label}</option>`).join("");
  if (!providers.length) {
    sel.innerHTML = "<option>No engine configured</option>";
    sel.disabled = true;
    $("generate").disabled = true;
    $("providerHint").textContent =
      "Set OPENAI_API_KEY, GEMINI_API_KEY or REPLICATE_API_TOKEN on the server to enable generation.";
  }
  syncProviderHint();
}
function syncProviderHint() {
  const p = providers.find((x) => x.id === $("provider").value);
  if (p) $("providerHint").textContent = p.description;
}
$("provider").addEventListener("change", syncProviderHint);
loadConfig();

// ---- Generate -----------------------------------------------------------
$("generate").addEventListener("click", async () => {
  showError("");
  const aspect = $("aspect").value;
  const [w, h] = CAPTURE_SIZES[aspect];
  const { beauty, depth } = viewer.capture(w, h);
  const options = {
    subject: $("subject").value,
    material: $("material").value,
    backdrop: $("backdrop").value,
    lighting: $("lighting").value,
    extra: $("extra").value,
  };
  const providerId = $("provider").value;
  const accessCode = $("accessCode").value;
  try {
    localStorage.setItem("studio-access", accessCode);
  } catch {}

  const card = addPendingCard(beauty, aspect, providers.find((p) => p.id === providerId)?.label);
  const btn = $("generate");
  btn.disabled = true;
  btn.textContent = "Developing photo…";
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerId, accessCode, beauty, depth, aspect, options }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    fillCard(card, json.image, beauty, json.prompt);
  } catch (err) {
    card.remove();
    showError(err.message);
    if (!$("gallery").querySelector(".card")) $("gallery").innerHTML = '<p class="empty">Your generated photos will appear here.</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate photo";
  }
});

function addPendingCard(reference, aspect, label) {
  $("gallery").querySelector(".empty")?.remove();
  const card = document.createElement("figure");
  card.className = "card pending";
  card.style.aspectRatio = aspect.replace(":", " / ");
  card.innerHTML = `<img src="${reference}" alt="" class="ghost" /><div class="spinner"></div>
    <figcaption>${label || ""}</figcaption>`;
  $("gallery").prepend(card);
  return card;
}

function fillCard(card, image, reference, prompt) {
  card.classList.remove("pending");
  card.innerHTML = `<img src="${image}" alt="Generated studio photo" />`;
  card.addEventListener("click", () => openLightbox(image, reference, prompt));
  openLightbox(image, reference, prompt);
}

// ---- Lightbox with before/after slider ----------------------------------
function openLightbox(image, reference, prompt) {
  $("lbImg").src = image;
  $("lbRef").src = reference;
  $("lbPrompt").textContent = prompt;
  $("lbDownload").href = image;
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
