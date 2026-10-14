import * as THREE from "three";

// A simple folded dart paper plane, used as the starting demo model.
export function createPaperPlane() {
  const N = [0, 0.32, 1.6]; // nose
  const C = [0, 0.32, -1]; // tail, centre fold
  const L = [-0.95, 0.42, -1]; // left wing tip
  const R = [0.95, 0.42, -1]; // right wing tip
  const KL = [-0.025, -0.12, -1]; // keel, left skin
  const KR = [0.025, -0.12, -1]; // keel, right skin
  const NK = [0, 0.3, 1.58];

  const tris = [N, C, L, N, R, C, NK, KL, C, NK, C, KR];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(tris.flat(), 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0xeeece6,
      roughness: 0.7,
      side: THREE.DoubleSide,
      flatShading: true,
    }),
  );
  mesh.rotation.y = -0.5;
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}
