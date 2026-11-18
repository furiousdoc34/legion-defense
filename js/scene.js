import * as THREE from "../vendor/three.module.js";
import { ELEMENTS, PODS, REGIONS, WALL_Z, pathPoints, resamplePath } from "./data.js";
import { makeModel } from "./models.js";

const EL = Object.fromEntries(Object.entries(ELEMENTS).map(([k, v]) => [k, v.color]));

export class GameScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(78, 1, 0.1, 120);
    this.camBase = new THREE.Vector3(0, 11, 13.2);
    this.camLook = new THREE.Vector3(0, 0, -3);
    this.world = new THREE.Group();
    this.actors = new THREE.Group();
    this.scene.add(this.world, this.actors);
    this.hemi = new THREE.HemisphereLight("#d7ecff", "#4a6a38", 1.15);
    this.sun = new THREE.DirectionalLight("#fff4dd", 1.45);
    this.sun.position.set(-8, 22, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 2;
    this.sun.shadow.camera.far = 60;
    this.sun.shadow.camera.left = -18;
    this.sun.shadow.camera.right = 18;
    this.sun.shadow.camera.top = 18;
    this.sun.shadow.camera.bottom = -18;
    this.sun.shadow.bias = -0.0008;
    this.glow = new THREE.PointLight("#b14bff", 8, 14, 2);
    this.glow.position.set(0, 1.4, WALL_Z);
    this.fill = new THREE.PointLight("#ffb060", 0, 18, 2);
    this.fill.position.set(-4, 3, -6);
    this.scene.add(this.hemi, this.sun, this.glow, this.fill);
    this.regionId = null;
    this.time = 0;
    this.shake = 0;
    this.enemies = new Map();
    this.traps = new Map();
    this.units = new Map();
    this.shotPool = [];
    this.beamPool = [];
    this.bursts = [];
    this.decor = [];
    this.mode = "preview";
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || 390;
    const h = this.canvas.clientHeight || 700;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  setRegion(id) {
    if (this.regionId === id && this.world.children.length) return;
    this.regionId = id;
    const region = REGIONS.find((r) => r.id === id) || REGIONS[0];
    this.clear(this.world);
    this.scene.background = new THREE.Color(region.sky);
    this.scene.fog = new THREE.Fog(region.fog, 22, 58);
    this.hemi.color.set(region.hemiSky);
    this.hemi.groundColor.set(region.hemiGround);
    this.sun.color.set(region.sun);
    this.fill.color.set(id === "glacier" ? "#b9e6ff" : id === "canyon" ? "#ff8a3a" : "#ffd27a");
    this.fill.intensity = id === "glacier" ? 4 : 6;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(64, 70), new THREE.MeshStandardMaterial({ map: groundTex(region), roughness: 1, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.world.add(ground);

    const path = resamplePath(pathPoints(id), 0.7);
    const road = ribbon(path.pts, id === "canyon" ? 3.3 : 3.05);
    road.receiveShadow = true;
    this.world.add(road);

    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(46, 18), new THREE.MeshBasicMaterial({ map: backdropTex(region), depthWrite: false }));
    backdrop.position.set(0, 8.2, -30);
    this.world.add(backdrop);

    this.dress(region);
    this.buildWall();
  }

  dress(region) {
    const spots = [
      [-4.5, -16], [4.6, -14], [-4.35, -8], [4.45, -5], [-4.3, -1], [4.4, 1.5], [-4.55, -12], [4.35, -10],
    ];
    spots.forEach(([x, z], i) => {
      if (region.id === "glacier") this.world.add(pine(x, z, 1.1 + (i % 3) * 0.25));
      else if (region.id === "canyon") this.world.add(i % 2 ? mesa(x, z) : rock(x, z, "#c47a45"));
      else this.world.add(i % 2 ? tree(x, z) : building(x, z, i));
    });
    if (region.id === "glacier") {
      const river = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 28), new THREE.MeshStandardMaterial({ color: "#b9e7ff", roughness: 0.15, metalness: 0.05, emissive: "#7ec8ea", emissiveIntensity: 0.15 }));
      river.rotation.x = -Math.PI / 2;
      river.position.set(-4.6, 0.03, -8);
      this.world.add(river);
    }
    if (region.id === "canyon") {
      this.world.add(rock(5.2, -3, "#a8643a"));
      this.world.add(debris( -5.4, -4));
    }
    if (region.id === "metro") {
      this.world.add(lampPost(-3.6, -10));
      this.world.add(lampPost(3.8, -2));
    }
    const dust = dustPoints(region);
    this.world.add(dust);
    this.dust = dust;
  }

  buildWall() {
    const base = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.7, 1.5), new THREE.MeshStandardMaterial({ color: "#1b2433", metalness: 0.55, roughness: 0.4 }));
    base.position.set(0, 0.35, WALL_Z + 0.15);
    base.castShadow = true;
    base.receiveShadow = true;
    this.world.add(base);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.16, 1.7), new THREE.MeshStandardMaterial({ color: "#2a3548", metalness: 0.4, roughness: 0.45 }));
    lip.position.set(0, 0.78, WALL_Z + 0.1);
    this.world.add(lip);
    const glowMat = new THREE.MeshStandardMaterial({ color: "#7a2cff", emissive: "#b14bff", emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.2 });
    for (const x of [0, ...PODS]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 1.05, 16), new THREE.MeshStandardMaterial({ color: "#5c677c", metalness: 0.55, roughness: 0.38, emissive: "#1a1030", emissiveIntensity: 0.12 }));
      pod.position.set(x, 1.05, WALL_Z);
      pod.castShadow = true;
      this.world.add(pod);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.055, 8, 20), glowMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 1.58, WALL_Z);
      this.world.add(ring);
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.46, 16), new THREE.MeshStandardMaterial({ color: "#2a2040", emissive: "#b14bff", emissiveIntensity: 0.55, roughness: 0.4 }));
      cap.rotation.x = -Math.PI / 2;
      cap.position.set(x, 1.59, WALL_Z);
      this.world.add(cap);
    }
    const stair = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.9), new THREE.MeshStandardMaterial({ color: "#30384a", metalness: 0.4, roughness: 0.5 }));
    stair.position.set(0, 0.4, WALL_Z + 0.85);
    this.world.add(stair);
    const under = new THREE.PointLight("#ff3ca8", 3.5, 6, 2);
    under.position.set(0, 0.4, WALL_Z + 0.4);
    this.world.add(under);
  }

  showPreview(regionId, captainId) {
    this.mode = "preview";
    this.setRegion(regionId);
    this.clear(this.actors);
    this.enemies.clear();
    this.traps.clear();
    this.units.clear();
    this.decor = [];
    const cap = spawnActor(captainId, this.actors);
    cap.position.set(0, 1.62, WALL_Z);
    cap.userData.preview = true;
    this.decor.push(cap);
    const path = resamplePath(pathPoints(regionId), 0.8);
    for (let i = 0; i < 4; i++) {
      const e = spawnActor(i % 2 ? "skitter" : "dasher", this.actors);
      e.userData.loop = 4 + i * 3.5;
      e.userData.path = path;
      e.userData.lane = (i - 1.5) * 0.7;
      this.decor.push(e);
    }
  }

  beginBattle(regionId, captainId) {
    this.mode = "battle";
    this.setRegion(regionId);
    this.clear(this.actors);
    this.enemies.clear();
    this.traps.clear();
    this.units.clear();
    this.decor = [];
    this.shake = 0;
  }

  sync(battle) {
    const seenU = new Set();
    for (const u of battle.units) {
      seenU.add(u.uid);
      let obj = this.units.get(u.uid);
      if (!obj) {
        const id = u.isCaptain ? battle.loadout.captainId : u.id;
        obj = spawnActor(id, this.actors);
        obj.scale.setScalar(u.isCaptain ? 1.35 : 1.12);
        this.units.set(u.uid, obj);
      }
      const x = u.isCaptain ? 0 : PODS[u.slot] ?? 0;
      obj.position.set(x, 1.62, WALL_Z);
      obj.userData.flash = u.flash || 0;
      let flash = obj.getObjectByName("muzzle");
      if (!flash) {
        flash = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: "#fff6c8" }));
        flash.name = "muzzle";
        flash.position.set(0, 0.95, -0.55);
        obj.add(flash);
      }
      flash.visible = (u.flash || 0) > 0.25;
    }
    for (const [id, obj] of this.units) {
      if (!seenU.has(id)) {
        this.actors.remove(obj);
        this.units.delete(id);
      }
    }

    const seenE = new Set();
    for (const e of battle.enemies) {
      seenE.add(e.id);
      let obj = this.enemies.get(e.id);
      if (!obj) {
        obj = spawnActor(e.type, this.actors);
        obj.traverse((m) => {
          if (m.isMesh && m.material) {
            m.material = m.material.clone();
            m.userData.baseE = m.material.emissiveIntensity || 0;
          }
        });
        if (!e.boss) obj.scale.multiplyScalar(1.28);
        obj.userData.bar = addBar(obj);
        this.enemies.set(e.id, obj);
      }
      obj.position.set(e.x, e.y + (e.flying ? 0 : 0), e.z);
      obj.rotation.y = e.facing || 0;
      obj.userData.state = e;
      const pct = Math.max(0.02, e.hp / e.maxHp);
      const hp = obj.userData.bar.getObjectByName("hp");
      hp.scale.x = pct;
      hp.position.x = -(1 - pct) * 0.42;
      const sh = obj.userData.bar.getObjectByName("sh");
      if (e.maxShield > 0) {
        const sp = Math.max(0.02, e.shield / e.maxShield);
        sh.visible = e.shield > 0;
        sh.scale.x = sp;
        sh.position.x = -(1 - sp) * 0.42;
      } else sh.visible = false;
      const shieldMesh = obj.getObjectByName("shield");
      if (shieldMesh) shieldMesh.visible = e.shield > 0;
      obj.traverse((m) => {
        if (m.isMesh && m.userData.baseE != null) {
          m.material.emissiveIntensity = m.userData.baseE + (e.hitFlash || 0) * 0.85;
        }
      });
    }
    for (const [id, obj] of this.enemies) {
      if (!seenE.has(id)) {
        this.actors.remove(obj);
        this.enemies.delete(id);
      }
    }

    const seenT = new Set();
    for (const t of battle.traps) {
      seenT.add(t.uid);
      let obj = this.traps.get(t.uid);
      if (!obj) {
        obj = spawnActor(t.id, this.actors);
        this.traps.set(t.uid, obj);
      }
      obj.position.set(t.x, 0, t.z);
      if (t.trap === "plate") {
        const pct = Math.max(0.25, t.hp / (t.maxHp || t.hp || 1));
        obj.scale.set(1, 0.45 + 0.55 * Math.min(1, pct), 1);
      }
    }
    for (const [id, obj] of this.traps) {
      if (!seenT.has(id)) {
        this.actors.remove(obj);
        this.traps.delete(id);
      }
    }

    this.syncShots(battle);
    this.syncBeams(battle);
  }

  syncShots(battle) {
    const shots = [...battle.shots, ...battle.rockets.map((r) => ({ ...r, element: "fire", size: 1.1, rocket: true }))];
    while (this.shotPool.length < shots.length) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: "#fff", emissive: "#fff", emissiveIntensity: 1, roughness: 0.2 }));
      m.castShadow = false;
      this.actors.add(m);
      this.shotPool.push(m);
    }
    this.shotPool.forEach((m, i) => {
      const s = shots[i];
      m.visible = !!s;
      if (!s) return;
      const color = EL[s.element] || "#fff";
      m.material.color.set(color);
      m.material.emissive.set(color);
      m.position.set(s.x, s.y || 0.8, s.z);
      const sc = (s.size || 1) * (s.rocket ? 1.4 : 1);
      m.scale.set(s.element === "laser" ? 0.7 : sc, s.element === "laser" ? 0.7 : sc, s.element === "laser" ? 2.4 : sc);
      if (s.element === "laser" || s.rocket) m.lookAt(s.x + (s.vx || 0), s.y || 0.8, s.z + (s.vz || 1));
    });
  }

  syncBeams(battle) {
    while (this.beamPool.length < battle.beams.length) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, opacity: 0.9 }));
      this.actors.add(m);
      this.beamPool.push(m);
    }
    this.beamPool.forEach((m, i) => {
      const b = battle.beams[i];
      m.visible = !!b;
      if (!b) return;
      const enemy = battle.enemies.find((e) => e.id === b.target);
      if (!enemy) {
        m.visible = false;
        return;
      }
      const unit = battle.units.find((u) => u.uid === b.uid);
      const from = muzzleOf(unit);
      const to = new THREE.Vector3(enemy.x, (enemy.y || 0) + 0.6, enemy.z);
      const dir = to.clone().sub(from);
      const len = dir.length() || 1;
      dir.multiplyScalar(1 / len);
      m.position.copy(from).add(to).multiplyScalar(0.5);
      m.scale.set(b.element === "electric" ? 1.6 : 1, len, b.element === "electric" ? 1.6 : 1);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const color = b.element === "electric" ? "#ffe14a" : b.element === "cryo" ? "#bff7ff" : b.element === "bio" ? "#b6ff6a" : "#e7a2ff";
      m.material.color.set(color);
    });
  }

  burst(x, z, y, element, r = 1) {
    const color = EL[element] || "#fff";
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    m.position.set(x, y || 0.4, z);
    this.actors.add(m);
    this.bursts.push({ m, life: 0.35, r });
  }

  consume(events) {
    if (!events) return;
    for (const ev of events) {
      if (ev.t === "boom" || ev.t === "die" || ev.t === "trapBreak") this.burst(ev.x, ev.z, ev.y || 0.4, ev.element || "fire", ev.r || (ev.boss ? 1.8 : 0.8));
      if (ev.t === "wall" || ev.t === "shock") this.shake = Math.min(0.45, this.shake + 0.16);
      if (ev.t === "shock") this.burst(ev.x, ev.z, 0.6, "electric", 1.2);
    }
  }

  update(dt) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w && h && (w !== this._vw || h !== this._vh)) {
      this._vw = w;
      this._vh = h;
      this.resize();
    }
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 0.8);
    const jx = (Math.sin(this.time * 40) * 0.5) * this.shake;
    const jy = (Math.cos(this.time * 33) * 0.35) * this.shake;
    if (this.mode === "preview") {
      this.camera.fov = 74;
      this.camera.position.set(0.2, 7.4, 10.5);
      this.camera.lookAt(0, 1.15, 6.3);
    } else {
      this.camera.fov = 78;
      this.camera.position.set(this.camBase.x + jx, this.camBase.y + jy, this.camBase.z);
      this.camera.lookAt(this.camLook);
    }
    this.camera.updateProjectionMatrix();
    if (this.dust) this.dust.rotation.y = this.time * 0.02;

    if (this.mode === "preview") {
      for (const obj of this.decor) {
        if (obj.userData.preview) {
          obj.userData.tick?.(this.time, {});
          continue;
        }
        obj.userData.loop = (obj.userData.loop + dt * 1.6) % (obj.userData.path.length - 1);
        const p = sample(obj.userData.path, obj.userData.loop, obj.userData.lane);
        obj.position.set(p.x, 0, p.z);
        obj.rotation.y = Math.atan2(p.dx, -p.dz);
        obj.userData.tick?.(this.time, { attacking: false });
      }
    }

    for (const obj of this.units.values()) obj.userData.tick?.(this.time, {});
    for (const obj of this.enemies.values()) obj.userData.tick?.(this.time, obj.userData.state || {});
    for (const obj of this.traps.values()) obj.userData.tick?.(this.time, {});

    for (const b of this.bursts) {
      b.life -= dt;
      const k = 1 - b.life / 0.35;
      b.m.scale.setScalar(1 + k * b.r * 3);
      b.m.material.opacity = Math.max(0, 0.85 * (1 - k));
    }
    this.bursts = this.bursts.filter((b) => {
      if (b.life > 0) return true;
      this.actors.remove(b.m);
      return false;
    });
    this.renderer.render(this.scene, this.camera);
  }

  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
  }

  clear(group) {
    while (group.children.length) group.remove(group.children[0]);
  }
}

function spawnActor(id, parent) {
  const g = makeModel(id);
  parent.add(g);
  return g;
}

function addBar(obj) {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.09, 0.02), new THREE.MeshBasicMaterial({ color: "#1a080c" }));
  const hp = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.06, 0.03), new THREE.MeshBasicMaterial({ color: "#ff4458" }));
  hp.name = "hp";
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.045, 0.03), new THREE.MeshBasicMaterial({ color: "#7eb6ff" }));
  sh.name = "sh";
  sh.position.y = 0.09;
  g.add(bg, hp, sh);
  g.position.y = (obj.userData.height || 1) + 0.25;
  obj.add(g);
  return g;
}

function muzzleOf(unit) {
  if (!unit || unit.isCaptain) return new THREE.Vector3(0, 2.3, WALL_Z - 0.45);
  return new THREE.Vector3(PODS[unit.slot] || 0, 2.15, WALL_Z - 0.4);
}

function sample(path, dist, lane) {
  const pts = path.pts;
  const d = Math.max(0, Math.min(path.length, dist));
  let i = 1;
  while (i < pts.length - 1 && pts[i].d < d) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const t = (d - a.d) / (b.d - a.d || 1);
  const x = a.x + (b.x - a.x) * t;
  const z = a.z + (b.z - a.z) * t;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: x + (-dz / len) * lane, z: z + (dx / len) * lane, dx: dx / len, dz: dz / len };
}

function ribbon(pts, width) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next.x - prev.x;
    let dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const px = -dz * width;
    const pz = dx * width;
    positions.push(pts[i].x + px, 0.04, pts[i].z + pz, pts[i].x - px, 0.04, pts[i].z - pz);
    uvs.push(0, pts[i].d * 0.12, 1, pts[i].d * 0.12);
    if (i > 0) {
      const b = i * 2;
      indices.push(b - 2, b - 1, b, b - 1, b + 1, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: roadTex(), roughness: 0.92, metalness: 0.04, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

function canvasTex(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

function groundTex(region) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = region.ground;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = region.id === "glacier" ? "rgba(255,255,255,0.25)" : region.id === "canyon" ? "rgba(120,60,30,0.25)" : "rgba(40,90,30,0.3)";
      g.fillRect(Math.random() * 256, Math.random() * 256, 3, 2);
    }
    if (region.id === "metro") {
      g.strokeStyle = "rgba(60,50,40,0.25)";
      g.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.moveTo(Math.random() * 256, Math.random() * 256);
        g.lineTo(Math.random() * 256, Math.random() * 256);
        g.stroke();
      }
    }
  }, 6, 6);
}

function roadTex() {
  return canvasTex(128, 256, (g) => {
    g.fillStyle = "#6a7382";
    g.fillRect(0, 0, 128, 256);
    g.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
    g.fillStyle = "#f2c14a";
    for (let y = 10; y < 256; y += 48) g.fillRect(60, y, 8, 22);
  }, 1, 1);
}

function backdropTex(region) {
  return canvasTex(512, 256, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 256);
    if (region.id === "canyon") {
      sky.addColorStop(0, "#f6d7a8");
      sky.addColorStop(0.55, "#f0a36a");
      sky.addColorStop(1, "#e07a45");
    } else if (region.id === "glacier") {
      sky.addColorStop(0, "#f7fbff");
      sky.addColorStop(0.5, "#c5dff5");
      sky.addColorStop(1, "#8fb4d4");
    } else {
      sky.addColorStop(0, "#b9ddf8");
      sky.addColorStop(0.45, "#8ec4ef");
      sky.addColorStop(1, "#6aa7dc");
    }
    g.fillStyle = sky;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = region.id === "canyon" ? "#fff2c9" : "#fff8e0";
    g.beginPath();
    g.arc(380, 54, 26, 0, Math.PI * 2);
    g.fill();
    if (region.id === "metro") {
      g.fillStyle = "#6d89a8";
      for (let i = 0; i < 14; i++) {
        const h = 40 + ((i * 37) % 70);
        g.fillRect(20 + i * 34, 200 - h, 28, h + 56);
      }
      g.fillStyle = "#8fb56a";
      g.fillRect(0, 210, 512, 46);
    } else if (region.id === "glacier") {
      g.fillStyle = "#f4fbff";
      g.beginPath();
      g.moveTo(0, 190);
      g.lineTo(70, 90);
      g.lineTo(140, 180);
      g.lineTo(210, 70);
      g.lineTo(300, 176);
      g.lineTo(380, 100);
      g.lineTo(460, 170);
      g.lineTo(512, 140);
      g.lineTo(512, 256);
      g.lineTo(0, 256);
      g.fill();
      g.fillStyle = "#2f6a45";
      for (let i = 0; i < 10; i++) {
        g.beginPath();
        g.moveTo(30 + i * 48, 230);
        g.lineTo(48 + i * 48, 180);
        g.lineTo(66 + i * 48, 230);
        g.fill();
      }
    } else {
      g.fillStyle = "#c4623a";
      g.beginPath();
      g.moveTo(0, 200);
      g.lineTo(40, 120);
      g.lineTo(120, 150);
      g.lineTo(180, 80);
      g.lineTo(260, 160);
      g.lineTo(340, 90);
      g.lineTo(420, 150);
      g.lineTo(512, 110);
      g.lineTo(512, 256);
      g.lineTo(0, 256);
      g.fill();
      g.fillStyle = "#e7a06a";
      g.fillRect(0, 210, 512, 46);
    }
  });
}

function tree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), new THREE.MeshStandardMaterial({ color: "#6b4a32" }));
  trunk.position.y = 0.4;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshStandardMaterial({ color: "#3e9a45" }));
  leaf.position.y = 1.05;
  trunk.castShadow = leaf.castShadow = true;
  g.add(trunk, leaf);
  g.position.set(x, 0, z);
  return g;
}

function pine(x, z, s) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 6), new THREE.MeshStandardMaterial({ color: "#5a4030" }));
  trunk.position.y = 0.3;
  const a = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.1, 7), new THREE.MeshStandardMaterial({ color: "#1f6b45" }));
  a.position.y = 1;
  const b = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 7), new THREE.MeshStandardMaterial({ color: "#2f8a58" }));
  b.position.y = 1.6;
  g.add(trunk, a, b);
  g.scale.setScalar(s);
  g.position.set(x, 0, z);
  return g;
}

function building(x, z, i) {
  const h = 1.4 + (i % 3) * 0.6;
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.3, h, 1.1), new THREE.MeshStandardMaterial({ color: i % 2 ? "#d7dee8" : "#b9c6d6", roughness: 0.7 }));
  m.position.set(x, h / 2, z);
  m.castShadow = true;
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.05), new THREE.MeshStandardMaterial({ color: "#8fd0ff", emissive: "#7ec8ff", emissiveIntensity: 0.4 }));
  win.position.set(x, h * 0.6, z + 0.56);
  const group = new THREE.Group();
  group.add(m, win);
  return group;
}

function rock(x, z, color) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  m.position.set(x, 0.35, z);
  m.castShadow = true;
  return m;
}

function mesa(x, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 2.4, 6), new THREE.MeshStandardMaterial({ color: "#d07a48", roughness: 0.85 }));
  m.position.set(x, 1.2, z);
  m.castShadow = true;
  return m;
}

function debris(x, z) {
  const g = new THREE.Group();
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.4), new THREE.MeshStandardMaterial({ color: "#8a939e", metalness: 0.6, roughness: 0.4 }));
  a.position.set(0, 0.2, 0);
  a.rotation.y = 0.4;
  const b = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 6, 10), new THREE.MeshStandardMaterial({ color: "#5c656f", metalness: 0.7 }));
  b.position.set(0.4, 0.3, 0.2);
  g.add(a, b);
  g.position.set(x, 0, z);
  return g;
}

function lampPost(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.8, 6), new THREE.MeshStandardMaterial({ color: "#2c3340", metalness: 0.6 }));
  pole.position.y = 0.9;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: "#ffe9a8", emissive: "#ffd56a", emissiveIntensity: 0.8 }));
  lamp.position.y = 1.85;
  g.add(pole, lamp);
  g.position.set(x, 0, z);
  return g;
}

function dustPoints(region) {
  const n = 70;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = 0.4 + Math.random() * 3;
    pos[i * 3 + 2] = -20 + Math.random() * 26;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const color = region.id === "canyon" ? "#ffd2a0" : region.id === "glacier" ? "#ffffff" : "#e7f6c8";
  return new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.08, transparent: true, opacity: 0.6 }));
}
