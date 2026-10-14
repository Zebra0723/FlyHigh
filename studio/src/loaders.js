import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export const SUPPORTED = ["glb", "gltf", "obj", "stl", "fbx", "ply"];

const ext = (name) => name.split(".").pop().toLowerCase();
const base = (url) => decodeURIComponent(url.split(/[\\/]/).pop().split("?")[0]);

const defaultMaterial = () =>
  new THREE.MeshStandardMaterial({ color: 0xcfcac2, roughness: 0.5, metalness: 0.05 });

// Accepts every file the user dropped (main model + textures/.bin/.mtl) and
// resolves cross-file references through blob URLs.
export async function loadModel(fileList) {
  const files = [...fileList];
  const main = SUPPORTED.map((e) => files.find((f) => ext(f.name) === e)).find(Boolean);
  if (!main) throw new Error(`Unsupported file. Use one of: ${SUPPORTED.join(", ")}`);

  const urls = new Map(files.map((f) => [f.name, URL.createObjectURL(f)]));
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (url.startsWith("blob:") || url.startsWith("data:")) return url;
    return urls.get(base(url)) || url;
  });
  const mainUrl = urls.get(main.name);

  try {
    switch (ext(main.name)) {
      case "glb":
      case "gltf": {
        const loader = new GLTFLoader(manager);
        const draco = new DRACOLoader();
        draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
        loader.setDRACOLoader(draco);
        const gltf = await loader.loadAsync(mainUrl);
        return { object: gltf.scene, name: main.name };
      }
      case "obj": {
        const loader = new OBJLoader(manager);
        const mtl = files.find((f) => ext(f.name) === "mtl");
        if (mtl) {
          const materials = await new MTLLoader(manager).loadAsync(urls.get(mtl.name));
          materials.preload();
          loader.setMaterials(materials);
        }
        const obj = await loader.loadAsync(mainUrl);
        if (!mtl) obj.traverse((o) => o.isMesh && (o.material = defaultMaterial()));
        return { object: obj, name: main.name };
      }
      case "stl": {
        const geo = await new STLLoader(manager).loadAsync(mainUrl);
        geo.computeVertexNormals();
        const mat = geo.hasColors
          ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })
          : defaultMaterial();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2; // STL is usually Z-up
        return { object: wrap(mesh), name: main.name };
      }
      case "fbx": {
        const obj = await new FBXLoader(manager).loadAsync(mainUrl);
        return { object: obj, name: main.name };
      }
      case "ply": {
        const geo = await new PLYLoader(manager).loadAsync(mainUrl);
        geo.computeVertexNormals();
        const mat = geo.hasAttribute("color")
          ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })
          : defaultMaterial();
        return { object: new THREE.Mesh(geo, mat), name: main.name };
      }
    }
  } catch (err) {
    throw new Error(`Could not load ${main.name}: ${err.message || err}`);
  }
}

function wrap(obj) {
  const g = new THREE.Group();
  g.add(obj);
  return g;
}
