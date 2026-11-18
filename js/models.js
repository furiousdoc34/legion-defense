import * as THREE from "../vendor/three.module.js";

const geos = new Map();
const mats = new Map();

function geo(kind, a, b, c) {
  const key = `${kind}:${a}:${b}:${c}`;
  let g = geos.get(key);
  if (g) return g;
  if (kind === "box") g = new THREE.BoxGeometry(a, b, c);
  else if (kind === "sph") g = new THREE.SphereGeometry(a, 12, 10);
  else if (kind === "cyl") g = new THREE.CylinderGeometry(a, b, c, 10);
  else if (kind === "cone") g = new THREE.ConeGeometry(a, b, 8);
  else if (kind === "tor") g = new THREE.TorusGeometry(a, b, 6, 12);
  else g = new THREE.BoxGeometry(a, b, c);
  geos.set(key, g);
  return g;
}

function mat(color, emissive = null, intensity = 0.7, metal = 0.4, rough = 0.48) {
  const key = `${color}|${emissive || ""}|${intensity}|${metal}|${rough}`;
  let m = mats.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    emissive: new THREE.Color(emissive || "#000000"),
    emissiveIntensity: emissive ? intensity : 0,
  });
  mats.set(key, m);
  return m;
}

function mesh(parent, kind, size, pos, color, opt = {}) {
  const m = new THREE.Mesh(geo(kind, size[0], size[1], size[2]), mat(color, opt.e, opt.ei ?? 0.8, opt.metal ?? 0.42, opt.rough ?? 0.46));
  m.position.set(pos[0], pos[1], pos[2]);
  if (opt.rot) m.rotation.set(opt.rot[0], opt.rot[1], opt.rot[2]);
  m.castShadow = opt.shadow !== false;
  m.receiveShadow = true;
  if (opt.name) m.name = opt.name;
  parent.add(m);
  return m;
}

function limb(parent, name, size, pos, color, opt = {}) {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(pos[0], pos[1], pos[2]);
  const m = new THREE.Mesh(geo("box", size[0], size[1], size[2]), mat(color, opt.e, opt.ei ?? 0.5, opt.metal ?? 0.35));
  m.position.y = -size[1] / 2;
  m.castShadow = true;
  pivot.add(m);
  parent.add(pivot);
  return pivot;
}

function swingLegs(g, t, amp = 0.45, speed = 8) {
  const l = g.getObjectByName("legL");
  const r = g.getObjectByName("legR");
  if (l) l.rotation.x = Math.sin(t * speed) * amp;
  if (r) r.rotation.x = Math.sin(t * speed + Math.PI) * amp;
}

function recoil(g) {
  const gun = g.getObjectByName("gun");
  const f = g.userData.flash || 0;
  if (gun) gun.position.z = (gun.userData.baseZ ?? gun.position.z) + f * 0.16;
}

function rememberGun(g) {
  const gun = g.getObjectByName("gun");
  if (gun && gun.userData.baseZ == null) gun.userData.baseZ = gun.position.z;
}

export function makeModel(id) {
  const builders = {
    nyx: nyx,
    holt: holt,
    quill: quill,
    colt: colt,
    sera: sera,
    pylon: pylon,
    vat: vat,
    lance: lance,
    lumen: lumen,
    kite: kite,
    brick: brick,
    whirl: whirl,
    scrap: scrap,
    coil: coil,
    salvo: salvo,
    plate: plate,
    acid: acidMine,
    crack: crackMine,
    saw: sawOrb,
    slick: slick,
    needle: () => gun("#7dff4a", "bio"),
    bloom: () => gun("#ff6a1a", "fire"),
    volley: () => gun("#d45bff", "laser"),
    shard: () => gun("#7ee7ff", "cryo"),
    cyclone: () => gun("#d5deea", "steel"),
    twin: () => gun("#e07bff", "laser"),
    gauss: () => gun("#e8eef8", "steel"),
    skitter: () => skitter(),
    dasher: () => dasher(),
    crackle: () => crackle(),
    shield: () => shieldback(),
    fusil: () => fusilier(),
    mite: () => mite(),
    gnasher: () => gnasher(),
    knox: () => knox(),
    icewidow: () => icewidow(),
    vault: () => vault(),
  };
  const fn = builders[id] || builders.dasher;
  const g = fn();
  g.userData.modelId = id;
  rememberGun(g);
  return g;
}

function nyx() {
  const g = new THREE.Group();
  limb(g, "legL", [0.16, 0.46, 0.16], [-0.12, 0.46, 0], "#16181e");
  limb(g, "legR", [0.16, 0.46, 0.16], [0.12, 0.46, 0], "#16181e");
  mesh(g, "box", [0.16, 0.1, 0.22], [-0.12, 0.05, 0.02], "#0e0f13");
  mesh(g, "box", [0.16, 0.1, 0.22], [0.12, 0.05, 0.02], "#0e0f13");
  mesh(g, "box", [0.42, 0.28, 0.24], [0, 0.62, 0], "#1a1d24");
  mesh(g, "box", [0.48, 0.4, 0.28], [0, 0.98, 0], "#12141a");
  mesh(g, "box", [0.2, 0.16, 0.08], [0, 1.02, 0.12], "#2a2e38");
  mesh(g, "sph", [0.2], [0, 1.42, 0], "#f0c2a8");
  mesh(g, "cone", [0.08, 0.2], [-0.12, 1.66, 0], "#14161c");
  mesh(g, "cone", [0.08, 0.2], [0.12, 1.66, 0], "#14161c");
  mesh(g, "box", [0.34, 0.1, 0.16], [0, 1.44, 0.08], "#ffb020", { e: "#ff9a00", ei: 0.9 });
  mesh(g, "box", [0.08, 0.1, 0.36], [0.28, 0.96, -0.16], "#2a2d33", { name: "gun" });
  mesh(g, "box", [0.06, 0.06, 0.1], [0.28, 0.96, -0.38], "#ffb020", { e: "#ff9a00" });
  g.userData.height = 1.85;
  g.userData.tick = (t) => {
    swingLegs(g, t, 0.25, 3);
    recoil(g);
  };
  return g;
}

function holt() {
  const g = new THREE.Group();
  limb(g, "legL", [0.2, 0.48, 0.2], [-0.14, 0.48, 0], "#8a4a22");
  limb(g, "legR", [0.2, 0.48, 0.2], [0.14, 0.48, 0], "#8a4a22");
  mesh(g, "box", [0.62, 0.5, 0.36], [0, 1.05, 0], "#e07a28");
  mesh(g, "box", [0.7, 0.18, 0.4], [0, 1.28, 0], "#ffb15a");
  mesh(g, "box", [0.28, 0.28, 0.28], [0, 1.58, 0], "#d8dee8");
  mesh(g, "box", [0.3, 0.1, 0.12], [0, 1.58, 0.14], "#1c2430");
  mesh(g, "box", [0.12, 0.14, 0.7], [0.18, 1.05, -0.28], "#4c5562", { name: "gun", metal: 0.7 });
  mesh(g, "cyl", [0.08, 0.1, 0.18], [0.18, 1.05, -0.68], "#ffcf70", { e: "#ff9a3a", ei: 0.6 });
  g.userData.height = 1.9;
  g.userData.tick = (t) => {
    swingLegs(g, t, 0.18, 2.4);
    recoil(g);
  };
  return g;
}

function quill() {
  const g = new THREE.Group();
  limb(g, "legL", [0.14, 0.5, 0.14], [-0.1, 0.5, 0], "#2c3138");
  limb(g, "legR", [0.14, 0.5, 0.14], [0.1, 0.5, 0], "#2c3138");
  mesh(g, "box", [0.46, 0.52, 0.26], [0, 1.02, 0], "#f2c84b");
  mesh(g, "box", [0.18, 0.2, 0.08], [0, 0.92, 0.14], "#fff4c8");
  mesh(g, "sph", [0.18], [0, 1.46, 0], "#f1c7ad");
  mesh(g, "sph", [0.16], [0, 1.62, -0.02], "#f7f7fb");
  mesh(g, "box", [0.22, 0.06, 0.08], [0, 1.48, 0.12], "#203040");
  mesh(g, "box", [0.12, 0.12, 0.28], [0.26, 1.0, -0.12], "#d8ecff", { e: "#7ee7ff", ei: 1, name: "gun" });
  g.userData.height = 1.85;
  g.userData.tick = (t) => {
    swingLegs(g, t, 0.22, 3);
    recoil(g);
    const gun = g.getObjectByName("gun");
    if (gun) gun.material.emissiveIntensity = 0.5 + Math.sin(t * 10) * 0.3;
  };
  return g;
}

function colt() {
  const g = new THREE.Group();
  limb(g, "legL", [0.14, 0.42, 0.14], [-0.1, 0.42, 0], "#6a3a28");
  limb(g, "legR", [0.14, 0.42, 0.14], [0.1, 0.42, 0], "#6a3a28");
  mesh(g, "box", [0.4, 0.36, 0.22], [0, 0.82, 0], "#c4553a");
  mesh(g, "box", [0.46, 0.1, 0.28], [0, 1.02, 0], "#8a3a28");
  mesh(g, "sph", [0.16], [0, 1.22, 0], "#e8b898");
  mesh(g, "box", [0.28, 0.08, 0.28], [0, 1.34, 0], "#6b442c");
  mesh(g, "box", [0.06, 0.08, 0.28], [0.22, 0.86, -0.12], "#ddd", { name: "gun", metal: 0.8 });
  g.userData.height = 1.55;
  g.userData.tick = (t) => {
    swingLegs(g, t, 0.2, 3);
    recoil(g);
  };
  return g;
}

function sera() {
  const g = new THREE.Group();
  limb(g, "legL", [0.12, 0.46, 0.12], [-0.09, 0.46, 0], "#1c4c6a");
  limb(g, "legR", [0.12, 0.46, 0.12], [0.09, 0.46, 0], "#1c4c6a");
  mesh(g, "box", [0.32, 0.4, 0.2], [0, 0.9, 0], "#2f6f8f");
  mesh(g, "sph", [0.15], [0, 1.28, 0], "#f0c2a8");
  mesh(g, "box", [0.26, 0.08, 0.16], [0, 1.3, 0.06], "#b9f6ff", { e: "#7ee7ff", ei: 0.8 });
  mesh(g, "box", [0.06, 0.06, 0.55], [0.12, 0.98, -0.22], "#d7f7ff", { e: "#9aefff", name: "gun" });
  g.userData.height = 1.6;
  g.userData.tick = (t) => {
    swingLegs(g, t, 0.12, 2);
    recoil(g);
  };
  return g;
}

function turret(color, emissive, topKind = "cyl") {
  const g = new THREE.Group();
  mesh(g, "cyl", [0.34, 0.4, 0.28], [0, 0.2, 0], "#2a3140", { metal: 0.6 });
  mesh(g, "cyl", [0.28, 0.28, 0.55], [0, 0.55, 0], color, { e: emissive, ei: 0.35 });
  if (topKind === "dish") mesh(g, "cyl", [0.36, 0.2, 0.12], [0, 0.9, 0], emissive, { e: emissive, ei: 0.8 });
  mesh(g, "box", [0.1, 0.1, 0.45], [0, 0.72, -0.28], "#dfe7f2", { name: "gun", e: emissive, ei: 0.4 });
  g.userData.height = 1.15;
  g.userData.tick = (t) => {
    g.rotation.y = Math.sin(t * 0.8) * 0.15;
    recoil(g);
  };
  return g;
}

function pylon() {
  const g = turret("#3a4660", "#ffe14a");
  mesh(g, "cyl", [0.04, 0.04, 0.9], [0, 1.15, 0], "#d7dde8", { metal: 0.8 });
  mesh(g, "sph", [0.1], [0, 1.62, 0], "#ffe14a", { e: "#ffe14a", ei: 1 });
  g.userData.height = 1.8;
  return g;
}

function vat() {
  const g = new THREE.Group();
  mesh(g, "cyl", [0.38, 0.42, 0.7], [0, 0.4, 0], "#3d6a32");
  mesh(g, "cyl", [0.28, 0.28, 0.2], [0, 0.82, 0], "#8dff4a", { e: "#8dff4a", ei: 0.7 });
  mesh(g, "sph", [0.12], [0.2, 0.7, 0.1], "#b6ff8a", { e: "#8dff4a" });
  g.userData.height = 1.15;
  g.userData.tick = (t) => {
    g.rotation.z = Math.sin(t * 3) * 0.04;
  };
  return g;
}

function lance() {
  const g = turret("#241838", "#d45bff", "dish");
  mesh(g, "box", [0.08, 0.08, 0.7], [0, 0.78, -0.4], "#f3d0ff", { e: "#d45bff", ei: 1, name: "gun" });
  g.userData.height = 1.2;
  return g;
}

function lumen() {
  const g = new THREE.Group();
  limb(g, "legL", [0.14, 0.44, 0.14], [-0.1, 0.44, 0], "#2a2140");
  limb(g, "legR", [0.14, 0.44, 0.14], [0.1, 0.44, 0], "#2a2140");
  mesh(g, "box", [0.42, 0.4, 0.22], [0, 0.86, 0], "#6a4a9a");
  mesh(g, "sph", [0.16], [0, 1.26, 0], "#f0c2a8");
  mesh(g, "box", [0.3, 0.08, 0.16], [0, 1.22, 0.08], "#e7c2ff", { e: "#d45bff" });
  mesh(g, "sph", [0.12], [0, 1.42, -0.02], "#f4f1ea");
  mesh(g, "box", [0.08, 0.1, 0.34], [0.22, 0.9, -0.16], "#f0d8ff", { e: "#d45bff", name: "gun" });
  g.userData.height = 1.6;
  g.userData.tick = (t) => {
    swingLegs(g, t, 0.15, 2.2);
    recoil(g);
  };
  return g;
}

function kite() {
  const g = new THREE.Group();
  limb(g, "legL", [0.12, 0.44, 0.12], [-0.1, 0.44, 0], "#14323a");
  limb(g, "legR", [0.12, 0.44, 0.12], [0.1, 0.44, 0], "#14323a");
  mesh(g, "box", [0.34, 0.36, 0.18], [0, 0.84, 0], "#1f6f86");
  mesh(g, "sph", [0.14], [0, 1.2, 0], "#f0c2a8");
  mesh(g, "box", [0.22, 0.06, 0.22], [0, 1.32, 0], "#083038");
  mesh(g, "box", [0.28, 0.04, 0.08], [0, 1.2, 0.1], "#bff7ff", { e: "#7ee7ff" });
  mesh(g, "box", [0.16, 0.04, 0.16], [0.2, 0.86, -0.08], "#d8fbff", { e: "#7ee7ff", name: "gun" });
  g.userData.height = 1.5;
  g.userData.tick = (t) => {
    swingLegs(g, t, 0.35, 7);
    g.rotation.z = Math.sin(t * 6) * 0.05;
  };
  return g;
}

function brick() {
  const g = new THREE.Group();
  limb(g, "legL", [0.16, 0.42, 0.16], [-0.11, 0.42, 0], "#3a4250");
  limb(g, "legR", [0.16, 0.42, 0.16], [0.11, 0.42, 0], "#3a4250");
  mesh(g, "box", [0.46, 0.4, 0.26], [0, 0.86, 0], "#f2c14a");
  mesh(g, "sph", [0.16], [0, 1.24, 0], "#e8b898");
  mesh(g, "cyl", [0.2, 0.22, 0.16], [0, 1.42, 0], "#ffe56a", { e: "#ffe14a", ei: 0.4 });
  mesh(g, "box", [0.1, 0.1, 0.22], [0.26, 0.9, -0.1], "#fff3b0", { e: "#ffe14a", name: "gun" });
  g.userData.height = 1.6;
  g.userData.tick = (t) => {
    swingLegs(g, t, 0.2, 3);
    recoil(g);
  };
  return g;
}

function whirl() {
  const g = turret("#5c6778", "#f4f7fb", "dish");
  mesh(g, "tor", [0.32, 0.05], [0, 0.78, 0], "#eef3f8", { e: "#ffffff", ei: 0.3, rot: [Math.PI / 2, 0, 0], name: "rotor" });
  g.userData.tick = (t) => {
    const r = g.getObjectByName("rotor");
    if (r) r.rotation.z = t * 8;
    recoil(g);
  };
  return g;
}

function scrap() {
  const g = new THREE.Group();
  mesh(g, "box", [0.7, 0.28, 0.45], [0, 0.24, 0], "#6a5138");
  mesh(g, "cyl", [0.1, 0.12, 0.55], [-0.12, 0.5, -0.1], "#3a3f46", { rot: [0.6, 0, 0], name: "gun" });
  mesh(g, "box", [0.16, 0.22, 0.14], [-0.28, 0.4, 0.08], "#e07a28");
  mesh(g, "box", [0.16, 0.22, 0.14], [0.28, 0.4, 0.08], "#3a6ea5");
  mesh(g, "sph", [0.1], [-0.28, 0.62, 0.08], "#e8b898");
  mesh(g, "sph", [0.1], [0.28, 0.62, 0.08], "#e8b898");
  g.userData.height = 0.9;
  g.userData.tick = (t) => {
    const gun = g.getObjectByName("gun");
    if (gun) gun.rotation.x = 0.6 - (g.userData.flash || 0) * 0.4;
  };
  return g;
}

function coil() {
  const g = turret("#243044", "#7ee7ff");
  mesh(g, "tor", [0.22, 0.05], [0, 0.85, 0], "#9af7ff", { e: "#7ee7ff", ei: 0.9, rot: [Math.PI / 2, 0, 0] });
  mesh(g, "sph", [0.1], [0, 1.05, 0], "#e8fbff", { e: "#bffbff", ei: 1 });
  g.userData.height = 1.3;
  return g;
}

function salvo() {
  const g = turret("#5a2a22", "#ff6a1a");
  mesh(g, "cyl", [0.08, 0.08, 0.4], [-0.12, 0.7, -0.2], "#ddd", { rot: [Math.PI / 2, 0, 0] });
  mesh(g, "cyl", [0.08, 0.08, 0.4], [0.12, 0.7, -0.2], "#ddd", { rot: [Math.PI / 2, 0, 0], name: "gun" });
  g.userData.height = 1.15;
  return g;
}

function plate() {
  const g = new THREE.Group();
  mesh(g, "box", [1.5, 0.7, 0.28], [0, 0.4, 0], "#9aa6b5", { metal: 0.55 });
  mesh(g, "box", [1.5, 0.08, 0.3], [0, 0.78, 0], "#d5deea", { e: "#9eb4c8", ei: 0.2 });
  mesh(g, "box", [0.16, 0.7, 0.3], [-0.62, 0.4, 0], "#66707e");
  mesh(g, "box", [0.16, 0.7, 0.3], [0.62, 0.4, 0], "#66707e");
  g.userData.height = 1;
  return g;
}

function mine(color, emissive) {
  const g = new THREE.Group();
  mesh(g, "cyl", [0.28, 0.32, 0.22], [0, 0.14, 0], "#2c3138", { metal: 0.6 });
  mesh(g, "sph", [0.12], [0, 0.3, 0], color, { e: emissive, ei: 0.9, name: "lamp" });
  g.userData.height = 0.5;
  g.userData.tick = (t) => {
    const lamp = g.getObjectByName("lamp");
    if (lamp) lamp.material.emissiveIntensity = 0.4 + Math.sin(t * 6) * 0.4;
  };
  return g;
}

function acidMine() {
  return mine("#8dff4a", "#8dff4a");
}
function crackMine() {
  return mine("#ff6a1a", "#ff6a1a");
}

function sawOrb() {
  const g = new THREE.Group();
  mesh(g, "sph", [0.28], [0, 0.32, 0], "#c5ceda", { metal: 0.8, rough: 0.25, e: "#ffffff", ei: 0.15 });
  mesh(g, "tor", [0.34, 0.04], [0, 0.32, 0], "#eef2f6", { metal: 0.7, rot: [Math.PI / 2, 0, 0], name: "blade" });
  g.userData.height = 0.7;
  g.userData.tick = (t) => {
    g.rotation.y = t * 6;
  };
  return g;
}

function slick() {
  const g = new THREE.Group();
  const m = mesh(g, "cyl", [0.9, 0.9, 0.06], [0, 0.04, 0], "#1a3a4a", { e: "#7ee7ff", ei: 0.25, rough: 0.2, metal: 0.1 });
  m.material.transparent = true;
  m.material.opacity = 0.85;
  g.userData.height = 0.2;
  return g;
}

function gun(color, element) {
  const g = new THREE.Group();
  mesh(g, "box", [0.16, 0.2, 0.7], [0, 0.7, 0], "#2a3038", { metal: 0.7 });
  mesh(g, "box", [0.1, 0.1, 0.3], [0, 0.84, -0.4], color, { e: color, ei: 0.8 });
  mesh(g, "box", [0.08, 0.22, 0.12], [0, 0.5, 0.1], "#1c2128");
  g.userData.element = element;
  g.userData.height = 1;
  return g;
}

function eye(parent, x, y, z, color = "#ff4455") {
  mesh(parent, "sph", [0.07], [x, y, z], color, { e: color, ei: 1, shadow: false });
}

function skitter() {
  const g = new THREE.Group();
  mesh(g, "sph", [0.32], [0, 0.36, 0], "#e8eef5", { metal: 0.65, rough: 0.3 });
  mesh(g, "sph", [0.16], [0, 0.42, 0.18], "#ff4458", { e: "#ff2a3a", ei: 0.8 });
  eye(g, 0, 0.48, 0.28);
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const z = -0.18 + (i % 3) * 0.18;
    const pivot = new THREE.Group();
    pivot.name = `leg${i}`;
    pivot.position.set(side * 0.12, 0.3, z);
    const leg = new THREE.Mesh(geo("box", 0.05, 0.08, 0.42), mat("#c5ced8", null, 0, 0.6));
    leg.position.set(side * 0.18, -0.08, 0);
    leg.rotation.z = side * 0.5;
    leg.castShadow = true;
    pivot.add(leg);
    g.add(pivot);
  }
  g.userData.height = 0.8;
  g.userData.tick = (t, st) => {
    const moving = !st?.attacking;
    for (let i = 0; i < 6; i++) {
      const leg = g.getObjectByName(`leg${i}`);
      if (leg) leg.rotation.x = Math.sin(t * 14 + i) * (moving ? 0.5 : 0.1);
    }
  };
  return g;
}

function dasher() {
  const g = new THREE.Group();
  limb(g, "legL", [0.1, 0.28, 0.1], [-0.08, 0.28, 0], "#d0d6e0");
  limb(g, "legR", [0.1, 0.28, 0.1], [0.08, 0.28, 0], "#d0d6e0");
  mesh(g, "box", [0.28, 0.28, 0.18], [0, 0.52, 0], "#f2f5f8", { metal: 0.55 });
  mesh(g, "box", [0.16, 0.1, 0.08], [0, 0.48, 0.1], "#ff4458", { e: "#ff2d3c", ei: 0.7 });
  mesh(g, "box", [0.16, 0.12, 0.14], [0, 0.74, 0], "#e6ebf2");
  eye(g, -0.05, 0.76, 0.08);
  eye(g, 0.05, 0.76, 0.08);
  g.userData.height = 0.95;
  g.userData.tick = (t, st) => swingLegs(g, t, st?.attacking ? 0.15 : 0.7, 12);
  return g;
}

function crackle() {
  const g = new THREE.Group();
  mesh(g, "sph", [0.36], [0, 0.4, 0], "#f4f7fb", { metal: 0.4 });
  mesh(g, "sph", [0.12], [0, 0.48, 0.22], "#ff6a1a", { e: "#ff6a1a", ei: 1, name: "lamp" });
  mesh(g, "box", [0.1, 0.18, 0.1], [-0.12, 0.12, 0], "#c5ced8");
  mesh(g, "box", [0.1, 0.18, 0.1], [0.12, 0.12, 0], "#c5ced8");
  g.userData.height = 0.85;
  g.userData.tick = (t) => {
    const lamp = g.getObjectByName("lamp");
    if (lamp) lamp.material.emissiveIntensity = 0.5 + Math.sin(t * 10) * 0.5;
  };
  return g;
}

function shieldback() {
  const g = new THREE.Group();
  limb(g, "legL", [0.12, 0.3, 0.12], [-0.12, 0.3, 0], "#b7c0cc");
  limb(g, "legR", [0.12, 0.3, 0.12], [0.12, 0.3, 0], "#b7c0cc");
  mesh(g, "box", [0.4, 0.36, 0.22], [0, 0.62, 0], "#e7edf4", { metal: 0.5 });
  mesh(g, "box", [0.62, 0.5, 0.08], [0, 0.66, 0.2], "#9eb0c4", { metal: 0.7, name: "shield", e: "#c5d4e4", ei: 0.25 });
  eye(g, 0, 0.78, 0.16);
  g.userData.height = 1.15;
  g.userData.tick = (t, st) => swingLegs(g, t, st?.attacking ? 0.1 : 0.35, 6);
  return g;
}

function fusilier() {
  const g = dasher();
  mesh(g, "box", [0.22, 0.16, 0.16], [0, 0.58, -0.12], "#ff6a1a", { e: "#ff6a1a", ei: 0.35 });
  mesh(g, "cyl", [0.05, 0.05, 0.28], [0.1, 0.62, -0.05], "#ddd", { rot: [Math.PI / 2, 0, 0] });
  g.userData.height = 1;
  return g;
}

function mite() {
  const g = new THREE.Group();
  mesh(g, "cyl", [0.28, 0.32, 0.12], [0, 0.4, 0], "#eef3f8", { metal: 0.7, name: "body" });
  mesh(g, "sph", [0.1], [0, 0.4, 0.18], "#ff4458", { e: "#ff2d3c" });
  mesh(g, "tor", [0.22, 0.03], [0, 0.52, 0], "#d7dee8", { rot: [Math.PI / 2, 0, 0], name: "rotor" });
  g.userData.height = 0.7;
  g.userData.tick = (t) => {
    const r = g.getObjectByName("rotor");
    if (r) r.rotation.z = t * 18;
  };
  return g;
}

function gnasher() {
  const g = new THREE.Group();
  limb(g, "legL", [0.18, 0.36, 0.18], [-0.16, 0.36, 0], "#c5ced8");
  limb(g, "legR", [0.18, 0.36, 0.18], [0.16, 0.36, 0], "#c5ced8");
  mesh(g, "box", [0.55, 0.42, 0.32], [0, 0.78, 0], "#f4f7fb", { metal: 0.45 });
  mesh(g, "box", [0.2, 0.36, 0.2], [-0.38, 0.85, 0], "#dfe6ef");
  mesh(g, "box", [0.2, 0.36, 0.2], [0.38, 0.85, 0], "#dfe6ef");
  mesh(g, "box", [0.28, 0.22, 0.24], [0, 1.12, 0], "#e8eef5");
  mesh(g, "box", [0.2, 0.08, 0.08], [0, 1.05, 0.12], "#ff4458", { e: "#ff2d3c", ei: 0.8 });
  g.userData.height = 1.45;
  g.userData.tick = (t, st) => swingLegs(g, t, st?.attacking ? 0.2 : 0.4, 5);
  return g;
}

function knox() {
  const g = gnasher();
  g.scale.setScalar(1.7);
  g.traverse((o) => {
    if (o.isMesh && o.material && o.material.color) {
      if (o.material.color.getHexString() === "f4f7fb" || o.material.color.getHexString() === "e8eef5") {
        o.material = mat("#ff4a55", "#ff2a36", 0.35, 0.45);
      }
    }
  });
  mesh(g, "box", [0.3, 0.2, 0.2], [0, 1.35, 0.1], "#2a0a10", { e: "#ff4458", ei: 0.6 });
  g.userData.height = 2.3;
  return g;
}

function icewidow() {
  const g = skitter();
  g.scale.setScalar(2.15);
  mesh(g, "sph", [0.22], [0, 0.42, -0.28], "#ff4458", { e: "#ff2a36", ei: 0.5 });
  g.userData.height = 1.5;
  return g;
}

function vault() {
  const g = new THREE.Group();
  limb(g, "legL", [0.16, 0.7, 0.16], [-0.16, 0.7, 0], "#d5dbe4");
  limb(g, "legR", [0.16, 0.7, 0.16], [0.16, 0.7, 0], "#d5dbe4");
  mesh(g, "box", [0.5, 0.4, 0.3], [0, 1.15, 0], "#ff4d58", { e: "#ff2a36", ei: 0.25 });
  mesh(g, "box", [0.28, 0.24, 0.24], [0, 1.5, 0], "#f2f5f8");
  eye(g, -0.07, 1.52, 0.12);
  eye(g, 0.07, 1.52, 0.12);
  mesh(g, "box", [0.12, 0.28, 0.5], [0.28, 1.2, -0.1], "#ffd0a8", { e: "#ff6a1a", ei: 0.4 });
  g.scale.setScalar(1.35);
  g.userData.height = 2.2;
  g.userData.tick = (t, st) => swingLegs(g, t, st?.leaping ? 0.2 : 0.55, 6);
  return g;
}

export const PORTRAIT_IDS = [
  "nyx", "holt", "quill",
  "needle", "bloom", "volley", "shard", "cyclone", "twin", "gauss",
  "colt", "sera", "pylon", "vat", "lance", "lumen", "kite", "brick", "whirl", "scrap", "coil", "salvo",
  "plate", "acid", "crack", "saw", "slick",
  "skitter", "dasher", "crackle", "shield", "fusil", "mite", "gnasher", "knox", "icewidow", "vault",
];
