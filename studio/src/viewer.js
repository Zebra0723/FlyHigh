import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Linear depth, normalised to the model's bounds: near = white, far = black.
const depthMaterial = new THREE.ShaderMaterial({
  uniforms: { uNear: { value: 1 }, uFar: { value: 10 } },
  vertexShader: /* glsl */ `
    varying float vDepth;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform float uNear;
    uniform float uFar;
    varying float vDepth;
    void main() {
      float d = clamp((vDepth - uNear) / (uFar - uNear), 0.0, 1.0);
      gl_FragColor = vec4(vec3(1.0 - d), 1.0);
    }`,
  side: THREE.DoubleSide,
});

export class StudioViewer {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.75;
    this.setBackdrop("#f2f2f2");

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000);
    this.camera.position.set(3.2, 2.2, 4.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.5, 0);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 6;
    key.shadow.bias = -0.0005;
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.1, far: 20 });
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xdddddd, 0.4));

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.model = null;
    this.radius = 1;

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setBackdrop(color) {
    this.scene.background = new THREE.Color(color);
  }

  setModel(object) {
    if (this.model) this.scene.remove(this.model);
    this.model = new THREE.Group();
    this.model.add(object);
    object.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.scene.add(this.model);
    this.normalize();
    this.frame();
  }

  // Centre on the origin, scale to ~2 units and rest on the ground.
  normalize() {
    const inner = this.model.children[0];
    inner.position.set(0, 0, 0);
    inner.scale.setScalar(1);
    inner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner);
    const size = box.getSize(new THREE.Vector3());
    const scale = 2 / Math.max(size.x, size.y, size.z || 1e-6);
    inner.scale.setScalar(scale);
    inner.updateMatrixWorld(true);
    box.setFromObject(inner);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.set(-center.x, -box.min.y, -center.z);
    inner.updateMatrixWorld(true);
    box.setFromObject(inner);
    this.radius = box.getBoundingSphere(new THREE.Sphere()).radius;
    this.center = box.getCenter(new THREE.Vector3());
  }

  frame() {
    const dist = this.radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.15;
    const dir = new THREE.Vector3(0.6, 0.62, 0.85).normalize();
    this.controls.target.copy(this.center);
    this.camera.position.copy(this.center).addScaledVector(dir, dist);
    this.camera.near = dist / 100;
    this.camera.far = dist * 100;
    this.camera.updateProjectionMatrix();
  }

  rotateModel(axis) {
    if (!this.model) return;
    const inner = this.model.children[0];
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, axis === "z" ? 1 : 0),
      Math.PI / 2,
    );
    inner.quaternion.premultiply(q);
    this.normalize();
  }

  setMaterialOverride(mode) {
    if (!this.model) return;
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.userData.originalMaterial) o.userData.originalMaterial = o.material;
      if (mode === "clay") {
        o.material = new THREE.MeshStandardMaterial({ color: 0xd9d6d0, roughness: 0.55, metalness: 0 });
      } else {
        o.material = o.userData.originalMaterial;
      }
    });
  }

  setExposure(v) {
    this.renderer.toneMappingExposure = v;
  }

  // Render the current view at an exact output size; returns image data URLs.
  capture(width, height) {
    const r = this.renderer;
    const prevSize = r.getSize(new THREE.Vector2());
    const prevRatio = r.getPixelRatio();
    const prevAspect = this.camera.aspect;

    r.setPixelRatio(1);
    r.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    r.render(this.scene, this.camera);
    // JPEG keeps the upload well under serverless body limits.
    const beauty = r.domElement.toDataURL("image/jpeg", 0.92);

    // Depth pass: tight near/far around the model for maximum contrast.
    const camDist = this.camera.position.distanceTo(this.center);
    depthMaterial.uniforms.uNear.value = Math.max(camDist - this.radius, 0.001);
    depthMaterial.uniforms.uFar.value = camDist + this.radius;
    const prevBg = this.scene.background;
    const prevEnv = this.scene.environment;
    this.scene.background = new THREE.Color(0x000000);
    this.scene.overrideMaterial = depthMaterial;
    this.ground.visible = false;
    const prevTone = r.toneMapping;
    r.toneMapping = THREE.NoToneMapping;
    r.render(this.scene, this.camera);
    const depth = r.domElement.toDataURL("image/png");
    r.toneMapping = prevTone;
    this.ground.visible = true;
    this.scene.overrideMaterial = null;
    this.scene.background = prevBg;
    this.scene.environment = prevEnv;

    r.setPixelRatio(prevRatio);
    r.setSize(prevSize.x, prevSize.y, false);
    this.camera.aspect = prevAspect;
    this.camera.updateProjectionMatrix();
    return { beauty, depth };
  }
}
