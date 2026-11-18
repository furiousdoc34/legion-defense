import * as THREE from "../vendor/three.module.js";
import { PORTRAIT_IDS, makeModel } from "./models.js";

const ENEMIES = new Set(["skitter", "dasher", "crackle", "shield", "fusil", "mite", "gnasher", "knox", "icewidow", "vault"]);

export function renderPortraits() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(128, 160, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#fffaf2", "#445566", 1.6));
  const sun = new THREE.DirectionalLight("#fff3d6", 2.1);
  sun.position.set(3, 5, 2);
  scene.add(sun);
  const rim = new THREE.DirectionalLight("#7ad0ff", 0.6);
  rim.position.set(-3, 2, -2);
  scene.add(rim);
  const cam = new THREE.PerspectiveCamera(26, 128 / 160, 0.1, 30);
  const urls = {};
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  for (const id of PORTRAIT_IDS) {
    const model = makeModel(id);
    scene.add(model);
    const box = new THREE.Box3().setFromObject(model);
    box.getCenter(center);
    box.getSize(size);
    const dist = Math.max(size.x, size.y, size.z) * 1.45 + 0.35;
    const front = ENEMIES.has(id) ? 1 : -1;
    cam.position.set(center.x + dist * 0.42, center.y + size.y * 0.12, center.z + dist * front);
    cam.lookAt(center.x, center.y + size.y * 0.05, center.z);
    renderer.render(scene, cam);
    urls[id] = renderer.domElement.toDataURL("image/png");
    scene.remove(model);
  }
  renderer.dispose();
  return urls;
}
