import {
  BP_MAX,
  DEFENDERS,
  ENEMIES,
  PODS,
  TRAPS,
  UNIT_BY_ID,
  WALL_Z,
  pathPoints,
  pointAt,
  resamplePath,
  stageInfo,
} from "./data.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pressure(stage, wave, hard) {
  const warm = wave <= 4 ? 0.5 + wave * 0.07 : 0.78 + (wave - 4) * 0.05;
  const growth = Math.pow(1.07, stage - 1) * (1 + (stage - 1) * 0.018);
  const eased = wave <= 4 ? Math.min(growth, 1 + stage * 0.055) : growth;
  return warm * eased * (hard ? 1.45 : 1);
}

function dmgMult(stage, hard) {
  return Math.pow(1.028, stage - 1) * (hard ? 1.26 : 1);
}

export function starsFor(hp, max) {
  if (hp >= max - 0.01) return 3;
  if (hp >= max * 0.5) return 2;
  return 1;
}

function rollType(region, wave, rng) {
  const bag = region.enemyBias;
  if (wave % 5 === 0) {
    const elite = ["gnasher", "shield", "fusil", "crackle"];
    return elite[Math.floor(rng() * elite.length)];
  }
  return bag[Math.floor(rng() * bag.length)];
}

export function buildWaves(stage, hard, rng) {
  const info = stageInfo(stage);
  const waves = [];
  for (let w = 1; w <= 20; w++) {
    const mult = pressure(stage, w, hard);
    if (w === 20) {
      const bossId = info.region.boss;
      const pack = [];
      const adds = stage < 8 ? 3 : 4;
      for (let i = 0; i < adds; i++) {
        const id = info.region.enemyBias[i % info.region.enemyBias.length];
        pack.push(makeSpawn(id, mult * 0.8, stage));
      }
      pack.push(makeSpawn(bossId, mult, stage, true));
      waves.push(pack);
      continue;
    }
    let count = w <= 2 ? 4 : Math.min(14, Math.round(3 + w * 0.42 + Math.max(0, stage - 6) * 0.07));
    if (w % 5 === 0) count = Math.max(3, Math.round(count * 0.62));
    const pack = [];
    for (let i = 0; i < count; i++) {
      const id = w % 5 === 0 && i === 0 ? rollType(info.region, w, rng) : info.region.enemyBias[Math.floor(rng() * info.region.enemyBias.length)];
      const elite = w % 5 === 0 && i === 0;
      pack.push(makeSpawn(elite && id === "gnasher" ? id : id, mult * (elite ? 1.35 : 1), stage));
    }
    waves.push(pack);
  }
  return waves;
}

function makeSpawn(id, mult, stage, boss = false) {
  const spec = ENEMIES[id];
  const scale = boss ? mult * (spec.hp < 40 ? 1 : 1) : mult;
  const hpBase = spec.boss ? spec.hp * 78 * scale : spec.hp * scale;
  return {
    type: id,
    hp: Math.round(hpBase),
    shield: Math.round((spec.shield || 0) * (spec.boss ? Math.pow(1.08, stage / 4) : mult * 0.65 + 0.35)),
    dmg: Math.round(spec.dmg * dmgMult(stage, false) * (spec.boss ? 1.15 : 1)),
  };
}

const LANES = [-1.15, -0.4, 0.35, 1.1, -0.8, 0.7, 0];

export class Battle {
  constructor({ stage, hard, loadout, seed = 1 }) {
    this.stage = stage;
    this.hard = !!hard;
    this.loadout = loadout;
    this.rng = mulberry32(seed);
    this.cardRng = mulberry32((seed + 0x9e3779b9) >>> 0);
    this.info = stageInfo(stage);
    this.path = resamplePath(pathPoints(this.info.region.id));
    this.maxHp = loadout.wall;
    this.hp = this.maxHp;
    this.time = 0;
    this.wave = 0;
    this.waves = buildWaves(stage, this.hard, this.rng);
    this.queue = [];
    this.spawnCd = 1.2;
    this.nextWave = 1.1;
    this.enemies = [];
    this.shots = [];
    this.beams = [];
    this.rockets = [];
    this.traps = [];
    this.units = loadout.units.map((u) => ({ ...u }));
    this.bp = 120;
    this.bpMax = BP_MAX;
    this.offer = null;
    this.dice = 10;
    this.paused = false;
    this.result = null;
    this.skills = [];
    this.seq = 1;
    this.events = [];
    this.dmgScale = dmgMult(stage, this.hard);
    this.kills = 0;
    this.wallEverHit = false;
  }

  update(dt) {
    this.events = [];
    if (this.result || this.paused || this.offer) return this.events;
    let left = Math.min(dt, 0.35);
    while (left > 0) {
      const h = Math.min(0.05, left);
      this.step(h);
      left -= h;
      if (this.result || this.offer || this.paused) break;
    }
    return this.events;
  }

  step(dt) {
    this.time += dt;
    this.spawn(dt);
    for (const u of this.units) {
      u.flash = Math.max(0, (u.flash || 0) - dt * 4);
      this.tickUnit(u, dt);
    }
    for (const t of this.traps) this.tickTrap(t, dt);
    this.tickShots(dt);
    this.tickBeams(dt);
    this.tickRockets(dt);
    this.tickEnemies(dt);
    this.separate();
    this.dots(dt);
    this.checkEnd();
  }

  spawn(dt) {
    if (this.queue.length) {
      this.spawnCd -= dt;
      if (this.spawnCd <= 0) {
        this.spawnCd = 0.38;
        const spec = this.queue.shift();
        this.addEnemy(spec);
      }
      return;
    }
    if (this.wave >= 20) return;
    const quiet = this.enemies.length === 0;
    this.nextWave -= dt;
    if (quiet) this.nextWave = Math.min(this.nextWave, 2.4);
    if (this.nextWave > 0) return;
    this.wave += 1;
    this.queue = this.waves[this.wave - 1].map((s) => ({ ...s }));
    this.spawnCd = 0.15;
    this.nextWave = this.wave === 20 ? 99 : 8.4;
    this.events.push({ t: "wave", wave: this.wave, boss: this.wave === 20 });
  }

  addEnemy(spec) {
    const def = ENEMIES[spec.type];
    const lane = LANES[this.seq % LANES.length];
    const p = pointAt(this.path, 0, lane);
    const e = {
      id: this.seq++,
      type: spec.type,
      name: def.name,
      hp: spec.hp,
      maxHp: spec.hp,
      shield: spec.shield || 0,
      maxShield: spec.shield || 0,
      dmg: Math.round(spec.dmg * (this.hard ? 1.32 : 1)),
      speed: def.speed * (0.92 + this.rng() * 0.16),
      bp: def.bp,
      pathDist: 0,
      lane,
      x: p.x,
      z: p.z,
      y: def.flying ? 1.55 : 0,
      flying: !!def.flying,
      radius: def.radius,
      rangeStop: def.rangeStop || 0,
      atkCd: 0.4 + this.rng() * 0.4,
      atkEvery: def.atkCd,
      explode: !!def.explode,
      boss: !!def.boss,
      shotSpeed: def.shotSpeed || 0,
      slowT: 0,
      poisonT: 0,
      poisonDps: 0,
      freezeT: 0,
      hitFlash: 0,
      alive: true,
      attacking: false,
      shockT: def.shock ? 1.2 : 0,
      shockEvery: def.shock || 0,
      shockDmg: Math.round((def.shockDmg || 0) * this.dmgScale),
      summonT: def.summon ? 2 : 0,
      summonEvery: def.summon || 0,
      leapT: def.leap ? 1.6 : 0,
      leapEvery: def.leap || 0,
      leaping: 0,
    };
    this.enemies.push(e);
    this.events.push({ t: "spawn", id: e.id, type: e.type, boss: e.boss });
  }

  tickUnit(u, dt) {
    if (u.burstLeft > 0) {
      u.burstGap -= dt;
      if (u.burstGap <= 0) {
        this.fire(u);
        u.burstLeft -= 1;
        u.burstGap = 0.11;
      }
      return;
    }
    u.cd -= dt;
    if (u.cd > 0) return;
    const target = this.acquire(u);
    if (!target) return;
    u.cd = u.cooldown;
    u.burstLeft = 1 + (u.fireAgain || 0);
    u.burstGap = 0;
    u.aim = target.id;
  }

  acquire(u) {
    let best = null;
    let bestD = -1;
    const origin = this.muzzle(u);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - origin.x;
      const dz = e.z - origin.z;
      const dist = Math.hypot(dx, dz);
      if (dist > u.range) continue;
      if (e.pathDist > bestD) {
        bestD = e.pathDist;
        best = e;
      }
    }
    return best;
  }

  muzzle(u) {
    if (u.isCaptain) return { x: 0, z: WALL_Z - 0.2, y: 1.35 };
    const x = PODS[u.slot] ?? 0;
    return { x, z: WALL_Z - 0.15, y: 1.25 };
  }

  fire(u) {
    const target = this.enemies.find((e) => e.alive && e.id === u.aim) || this.acquire(u);
    if (!target) {
      u.burstLeft = 0;
      return;
    }
    u.flash = 1;
    this.events.push({ t: "shot", unit: u.uid, element: u.element, slot: u.slot, captain: !!u.isCaptain });
    if (u.beam) {
      this.beams.push({
        uid: u.uid,
        slot: u.slot,
        captain: !!u.isCaptain,
        target: target.id,
        left: u.beamDuration,
        tick: 0,
        every: Math.max(0.08, u.beamDuration / Math.max(1, u.hitCount)),
        damage: u.damage,
        element: u.element,
        slow: u.slow,
        poison: u.poison,
        owner: u,
        size: u.size || 1,
      });
      return;
    }
    const n = Math.max(1, u.projectiles || 1);
    for (let i = 0; i < n; i++) {
      const origin = this.muzzle(u);
      const spread = (i - (n - 1) / 2) * (u.spread || 0.2) * (u.size ? 1 : 1);
      const tx = target.x + spread;
      const tz = target.z;
      const dx = tx - origin.x;
      const dz = tz - origin.z;
      const len = Math.hypot(dx, dz) || 1;
      const speed = 16;
      this.shots.push({
        x: origin.x,
        z: origin.z,
        y: origin.y,
        vx: (dx / len) * speed,
        vz: (dz / len) * speed,
        damage: u.damage,
        element: u.element,
        pierce: u.pierce || 0,
        ricochet: u.ricochet || 0,
        aoe: u.aoe ? (u.aoeRadius || 1.2) * (u.size || 1) : 0,
        slow: u.slow || 0,
        poison: u.poison || 0,
        hit: new Set(),
        owner: u,
        life: 2.4,
        size: u.size || 1,
        target: u.pierce ? 0 : target.id,
        homing: !u.pierce,
      });
    }
  }

  tickShots(dt) {
    for (const s of this.shots) {
      s.life -= dt;
      if (s.homing && s.target) {
        const e = this.enemies.find((x) => x.alive && x.id === s.target);
        if (e) {
          const dx = e.x - s.x;
          const dz = e.z - s.z;
          const len = Math.hypot(dx, dz) || 1;
          const speed = Math.hypot(s.vx, s.vz) || 16;
          s.vx = (dx / len) * speed;
          s.vz = (dz / len) * speed;
        }
      }
      s.x += s.vx * dt;
      s.z += s.vz * dt;
      let hit = null;
      let hitD = (0.55 * s.size) ** 2;
      for (const e of this.enemies) {
        if (!e.alive || s.hit.has(e.id)) continue;
        const d2 = (e.x - s.x) ** 2 + (e.z - s.z) ** 2;
        const r = e.radius + 0.28 * s.size;
        if (d2 < r * r && d2 < hitD * 4) {
          hit = e;
          hitD = d2;
        }
      }
      if (hit) this.onShotHit(s, hit);
    }
    this.shots = this.shots.filter((s) => s.life > 0 && s.z > -30 && s.z < 12);
  }

  onShotHit(s, enemy) {
    s.hit.add(enemy.id);
    this.hurt(enemy, s.damage, s.owner, s.element);
    if (s.slow) enemy.slowT = Math.max(enemy.slowT, s.slow);
    if (s.poison) {
      enemy.poisonT = Math.max(enemy.poisonT, 2.4);
      enemy.poisonDps = Math.max(enemy.poisonDps, s.poison);
    }
    if (s.aoe) this.splash(enemy, s.aoe, s.damage * 0.65, s.owner, s.element, s.slow);
    if (s.ricochet > 0) {
      const next = this.nearest(enemy, 4.2, s.hit);
      if (next) {
        s.ricochet -= 1;
        s.damage *= 0.75;
        s.target = next.id;
        s.homing = true;
        s.life = Math.max(s.life, 0.6);
        const dx = next.x - s.x;
        const dz = next.z - s.z;
        const len = Math.hypot(dx, dz) || 1;
        const speed = 15;
        s.vx = (dx / len) * speed;
        s.vz = (dz / len) * speed;
        return;
      }
    }
    if (s.pierce > 0) {
      s.pierce -= 1;
      s.homing = false;
      return;
    }
    s.life = 0;
  }

  splash(origin, radius, damage, owner, element, slow) {
    for (const e of this.enemies) {
      if (!e.alive || e === origin) continue;
      const d = Math.hypot(e.x - origin.x, e.z - origin.z);
      if (d <= radius + e.radius) {
        this.hurt(e, damage, owner, element);
        if (slow) e.slowT = Math.max(e.slowT, slow * 0.6);
      }
    }
    this.events.push({ t: "boom", x: origin.x, z: origin.z, y: origin.y || 0.4, element, r: radius });
  }

  nearest(from, radius, skip) {
    let best = null;
    let bestD = radius;
    for (const e of this.enemies) {
      if (!e.alive || skip.has(e.id)) continue;
      const d = Math.hypot(e.x - from.x, e.z - from.z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  tickBeams(dt) {
    for (const b of this.beams) {
      b.left -= dt;
      b.tick -= dt;
      const e = this.enemies.find((x) => x.alive && x.id === b.target);
      if (!e) {
        b.left = 0;
        continue;
      }
      if (b.tick <= 0) {
        b.tick = b.every;
        this.hurt(e, b.damage, b.owner, b.element);
        if (b.slow) e.slowT = Math.max(e.slowT, b.slow);
        if (b.poison) {
          e.poisonT = Math.max(e.poisonT, 2);
          e.poisonDps = Math.max(e.poisonDps, b.poison);
        }
      }
      this.events.push({
        t: "beam",
        element: b.element,
        x: e.x,
        z: e.z,
        y: e.y + 0.6,
        slot: b.slot,
        captain: b.captain,
      });
    }
    this.beams = this.beams.filter((b) => b.left > 0);
  }

  hurt(enemy, amount, owner, element) {
    if (!enemy.alive || amount <= 0) return;
    let dmg = amount;
    let crit = false;
    const chance = owner?.crit || this.loadout.crit || 0;
    if (this.rng() < chance) {
      dmg *= 2;
      crit = true;
    }
    dmg = Math.max(1, Math.round(dmg));
    if (enemy.shield > 0) {
      const use = Math.min(enemy.shield, dmg);
      enemy.shield -= use;
      dmg -= use;
      if (enemy.shield <= 0) this.events.push({ t: "break", id: enemy.id, x: enemy.x, z: enemy.z });
    }
    enemy.hp -= dmg;
    enemy.hitFlash = 1;
    this.events.push({
      t: "dmg",
      x: enemy.x,
      z: enemy.z,
      y: (enemy.y || 0) + 1.15,
      amount: dmg,
      crit,
      element,
    });
    if (enemy.hp <= 0) this.kill(enemy);
  }

  kill(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;
    enemy.hp = 0;
    this.kills += 1;
    this.bp += enemy.bp;
    this.events.push({ t: "die", id: enemy.id, x: enemy.x, z: enemy.z, y: enemy.y || 0, boss: enemy.boss, type: enemy.type });
    if (this.bp >= this.bpMax && !this.offer && !this.result) {
      this.bp -= this.bpMax;
      this.openOffer();
    }
  }

  tickEnemies(dt) {
    const end = this.path.length - 0.15;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 3);
      e.slowT = Math.max(0, e.slowT - dt);
      e.freezeT = Math.max(0, e.freezeT - dt);
      if (e.boss) this.bossTick(e, dt);
      const block = this.blockerAt(e);
      let speed = e.speed;
      if (e.slowT > 0) speed *= 0.52;
      if (e.freezeT > 0) speed = 0;
      if (e.leaping > 0) {
        e.leaping -= dt;
        e.pathDist += 7.5 * dt;
      } else if (block) {
        e.attacking = true;
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          e.atkCd = e.atkEvery;
          block.hp -= e.dmg;
          this.events.push({ t: "chip", x: block.x, z: block.z, amount: e.dmg });
          if (block.hp <= 0) {
            block.alive = false;
            this.events.push({ t: "trapBreak", id: block.id, x: block.x, z: block.z });
          }
        }
      } else if (e.rangeStop && this.path.length - e.pathDist <= e.rangeStop) {
        e.attacking = true;
        this.shootWall(e, dt);
      } else if (e.pathDist >= end) {
        e.attacking = true;
        e.pathDist = end;
        this.meleeWall(e, dt);
      } else {
        e.attacking = false;
        e.pathDist += speed * dt;
      }
      const p = pointAt(this.path, e.pathDist, e.lane);
      if (e.leaping > 0) {
        const air = Math.sin((1 - e.leaping / 0.45) * Math.PI);
        e.y = air * 2.4;
      } else {
        e.y = e.flying ? 1.55 + Math.sin(this.time * 4 + e.id) * 0.12 : 0;
      }
      e.x = p.x;
      e.z = p.z;
      e.facing = Math.atan2(p.dx, p.dz);
    }
    this.enemies = this.enemies.filter((e) => e.alive);
    this.traps = this.traps.filter((t) => t.alive);
  }

  blockerAt(e) {
    let best = null;
    for (const t of this.traps) {
      if (!t.alive || t.trap !== "plate") continue;
      if (e.pathDist >= t.pathDist - 0.55) continue;
      if (!best || t.pathDist < best.pathDist) best = t;
    }
    if (best && best.pathDist - e.pathDist < 0.85) return best;
    return null;
  }

  meleeWall(e, dt) {
    if (e.explode) {
      this.damageWall(e.dmg, e.x, WALL_Z, "fire");
      e.alive = false;
      this.events.push({ t: "boom", x: e.x, z: WALL_Z, y: 0.6, element: "fire", r: 1.4 });
      return;
    }
    e.atkCd -= dt;
    if (e.atkCd <= 0) {
      e.atkCd = e.atkEvery;
      this.damageWall(e.dmg, e.x, e.z, "steel");
    }
  }

  shootWall(e, dt) {
    e.atkCd -= dt;
    if (e.atkCd > 0) return;
    e.atkCd = e.atkEvery;
    this.rockets.push({
      x: e.x,
      z: e.z,
      y: e.flying ? e.y : 0.8,
      dmg: e.dmg,
      speed: e.shotSpeed || 7,
    });
    this.events.push({ t: "rocket", x: e.x, z: e.z });
  }

  tickRockets(dt) {
    for (const r of this.rockets) {
      const dx = 0 - r.x;
      const dz = WALL_Z - r.z;
      const len = Math.hypot(dx, dz) || 1;
      r.x += (dx / len) * r.speed * dt;
      r.z += (dz / len) * r.speed * dt;
      r.y += (0.6 - r.y) * dt;
      if (r.z >= WALL_Z - 0.3) {
        r.dead = true;
        this.damageWall(r.dmg, r.x, WALL_Z, "fire");
        this.events.push({ t: "boom", x: r.x, z: WALL_Z, y: 0.7, element: "fire", r: 0.8 });
      }
    }
    this.rockets = this.rockets.filter((r) => !r.dead);
  }

  bossTick(e, dt) {
    if (e.shockEvery) {
      e.shockT -= dt;
      if (e.shockT <= 0) {
        e.shockT = e.shockEvery;
        this.damageWall(Math.round(e.shockDmg), e.x, e.z, "electric");
        this.events.push({ t: "shock", x: e.x, z: e.z });
      }
    }
    if (e.summonEvery) {
      e.summonT -= dt;
      if (e.summonT <= 0) {
        e.summonT = e.summonEvery;
        const mult = pressure(this.stage, this.wave || 20, this.hard);
        this.addEnemy(makeSpawn("skitter", mult * 0.7, this.stage));
        const baby = this.enemies[this.enemies.length - 1];
        baby.pathDist = Math.max(0, e.pathDist - 0.4);
        baby.lane = e.lane + (this.rng() - 0.5);
      }
    }
    if (e.leapEvery && e.leaping <= 0 && e.pathDist < this.path.length - 1.2) {
      e.leapT -= dt;
      if (e.leapT <= 0) {
        e.leapT = e.leapEvery;
        e.leaping = 0.45;
        this.events.push({ t: "leap", id: e.id });
      }
    }
    if (e.leaping > 0 && e.leaping < dt + 0.02) {
      this.splash(e, 1.8, Math.round(e.dmg * 0.45), null, "fire", 0);
    }
  }

  damageWall(amount, x, z, element) {
    if (this.result) return;
    const dmg = Math.max(1, Math.round(amount));
    this.hp -= dmg;
    this.wallEverHit = true;
    this.events.push({ t: "wall", amount: dmg, x, z, element, hp: Math.max(0, this.hp) });
    if (this.hp <= 0) {
      this.hp = 0;
      this.result = "lose";
      this.offer = null;
      this.events.push({ t: "lose" });
    }
  }

  tickTrap(trap, dt) {
    if (!trap.alive) return;
    trap.cd -= dt;
    if (trap.trap === "saw") {
      trap.phase = (trap.phase || 0) + dt * 0.55;
      const span = 6;
      const base = trap.pathDist;
      const dist = base + Math.sin(trap.phase) * span;
      const p = pointAt(this.path, dist, 0);
      trap.x = p.x;
      trap.z = p.z;
      if (trap.cd <= 0) {
        trap.cd = trap.cooldown;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - trap.x, e.z - trap.z) < 0.85) this.hurt(e, trap.damage, trap, trap.element);
        }
      }
    } else if (trap.trap === "slick") {
      for (const e of this.enemies) {
        if (!e.alive || e.flying) continue;
        if (Math.hypot(e.x - trap.x, e.z - trap.z) < trap.aoeRadius) {
          e.slowT = Math.max(e.slowT, 0.35);
          if (trap.cd <= 0) this.hurt(e, trap.damage, trap, "cryo");
        }
      }
      if (trap.cd <= 0) trap.cd = trap.cooldown;
    } else if (trap.trap === "mine" && trap.cd <= 0) {
      for (const e of this.enemies) {
        if (!e.alive || e.flying) continue;
        if (Math.hypot(e.x - trap.x, e.z - trap.z) < 1.15) {
          this.splash(e, trap.aoeRadius || 1.6, trap.damage, trap, trap.element, 0);
          this.hurt(e, trap.damage, trap, trap.element);
          if (trap.poison) {
            for (const o of this.enemies) {
              if (!o.alive) continue;
              if (Math.hypot(o.x - trap.x, o.z - trap.z) < (trap.aoeRadius || 1.6)) {
                o.poisonT = Math.max(o.poisonT, 2.6);
                o.poisonDps = Math.max(o.poisonDps, trap.poison);
              }
            }
          }
          trap.cd = trap.cooldown;
          this.events.push({ t: "boom", x: trap.x, z: trap.z, y: 0.3, element: trap.element, r: trap.aoeRadius });
          break;
        }
      }
    }
  }

  dots(dt) {
    for (const e of this.enemies) {
      if (!e.alive || e.poisonT <= 0) continue;
      e.poisonT -= dt;
      e.dotAcc = (e.dotAcc || 0) + dt;
      if (e.dotAcc >= 0.5) {
        e.dotAcc = 0;
        this.hurt(e, e.poisonDps, { crit: 0 }, "bio");
      }
    }
  }

  separate() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.flying !== b.flying) continue;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const d2 = dx * dx + dz * dz;
        const min = 0.7;
        if (d2 > 0 && d2 < min * min) {
          const d = Math.sqrt(d2);
          const push = ((min - d) * 0.18) / d;
          a.x += dx * push;
          b.x -= dx * push;
        }
      }
    }
  }

  checkEnd() {
    if (this.result) return;
    this.enemies = this.enemies.filter((e) => e.alive);
    if (this.wave >= 20 && this.queue.length === 0 && this.enemies.length === 0 && this.rockets.length === 0) {
      this.result = "win";
      this.offer = null;
      this.events.push({ t: "win", stars: starsFor(this.hp, this.maxHp), hp: this.hp, max: this.maxHp });
    }
  }

  openOffer() {
    this.offer = this.rollCards();
    this.events.push({ t: "skill" });
  }

  rollCards() {
    const cards = [];
    const used = new Set();
    const defenders = this.units.filter((u) => !u.isCaptain);
    const pool = [];
    if (defenders.length < 4) {
      for (const d of DEFENDERS) {
        if (this.units.some((u) => u.id === d.id)) continue;
        pool.push({ kind: "deploy", unitId: d.id, weight: defenders.length === 0 ? 8 : 4 });
      }
    }
    if (this.traps.length < 3) {
      for (const tr of TRAPS) {
        if (this.traps.some((t) => t.id === tr.id)) continue;
        pool.push({ kind: "deploy", unitId: tr.id, weight: 2.4 });
      }
    }
    for (const u of this.units) {
      pool.push({ kind: "upgrade", uid: u.uid, unitId: u.id, stat: "damage", weight: 5 });
      pool.push({ kind: "upgrade", uid: u.uid, unitId: u.id, stat: "cooldown", weight: 3.2 });
      if (u.beam) {
        pool.push({ kind: "upgrade", uid: u.uid, unitId: u.id, stat: "hitCount", weight: 3 });
        pool.push({ kind: "upgrade", uid: u.uid, unitId: u.id, stat: "beamDuration", weight: 2.6 });
      }
      pool.push({ kind: "upgrade", uid: u.uid, unitId: u.id, stat: "size", weight: 2 });
      if (!u.beam) pool.push({ kind: "upgrade", uid: u.uid, unitId: u.id, stat: "projectiles", weight: 2.4 });
      pool.push({ kind: "upgrade", uid: u.uid, unitId: u.id, stat: "ricochet", weight: 2.2 });
      pool.push({ kind: "upgrade", uid: u.uid, unitId: u.id, stat: "pierce", weight: 2 });
      pool.push({ kind: "upgrade", uid: u.uid, unitId: u.id, stat: "fireAgain", weight: 2 });
    }
    pool.push({ kind: "wall", stat: "hp", weight: 1.6 });
    const needDeploy = defenders.length < 4;
    let guard = 0;
    while (cards.length < 3 && guard < 40) {
      guard++;
      const card = this.weighted(pool, this.cardRng);
      const key = `${card.kind}:${card.unitId || "wall"}:${card.stat || ""}:${card.uid || ""}`;
      if (used.has(key)) continue;
      used.add(key);
      cards.push(this.describe(card));
    }
    if (needDeploy && !cards.some((c) => c.kind === "deploy" && UNIT_BY_ID[c.unitId].kind === "defender")) {
      const options = pool.filter((p) => p.kind === "deploy" && UNIT_BY_ID[p.unitId].kind === "defender");
      if (options.length) cards[0] = this.describe(options[Math.floor(this.cardRng() * options.length)]);
    }
    return cards;
  }

  weighted(pool, rng = this.rng) {
    let sum = 0;
    for (const p of pool) sum += p.weight;
    let r = rng() * sum;
    for (const p of pool) {
      r -= p.weight;
      if (r <= 0) return p;
    }
    return pool[pool.length - 1];
  }

  describe(card) {
    if (card.kind === "wall") {
      return {
        kind: "wall",
        stat: "hp",
        title: "Keep plating",
        detail: "Wall HP +650",
        element: "steel",
        name: "Bastion",
      };
    }
    const spec = UNIT_BY_ID[card.unitId];
    if (card.kind === "deploy") {
      return {
        kind: "deploy",
        unitId: card.unitId,
        title: spec.name,
        detail: spec.kind === "trap" ? "Trap joins the battle" : "Joins the battle",
        element: spec.element,
        name: spec.name,
        blurb: spec.blurb,
      };
    }
    const labels = {
      damage: "Damage +60%",
      cooldown: "Cooldown −25%",
      hitCount: "Hit count +5",
      beamDuration: "Hit duration +0.45s",
      size: "Projectile size +100%",
      projectiles: "Projectiles +2",
      ricochet: "Ricochet +2",
      pierce: "Penetration +1",
      fireAgain: "Fire again +2",
    };
    return {
      kind: "upgrade",
      uid: card.uid,
      unitId: card.unitId,
      stat: card.stat,
      title: spec.name,
      detail: labels[card.stat],
      element: spec.element,
      name: spec.name,
    };
  }

  pick(index) {
    if (!this.offer || this.result) return;
    const card = this.offer[index];
    if (!card) return;
    this.apply(card);
    this.skills.push(`${card.title}: ${card.detail}`);
    this.offer = null;
  }

  reroll(pay) {
    if (!this.offer && pay !== "grant") return { ok: false, reason: "No skill offer." };
    if (pay === "dice") {
      if (this.dice <= 0) return { ok: false, reason: "No refresh dice." };
      this.dice -= 1;
    } else if (pay === "gem") {
      /* caller spent the gems */
    } else if (pay === "grant") {
      this.dice += 2;
      if (this.offer) this.offer = this.rollCards();
      return { ok: true, dice: this.dice, offer: this.offer };
    } else {
      return { ok: false, reason: "Cannot reroll." };
    }
    this.offer = this.rollCards();
    return { ok: true, dice: this.dice, offer: this.offer };
  }

  apply(card) {
    if (card.kind === "wall") {
      this.maxHp += 650;
      this.hp += 650;
      this.events.push({ t: "fortify" });
      return;
    }
    if (card.kind === "deploy") {
      const stats = { ...this.loadout.catalog[card.unitId] };
      const spec = UNIT_BY_ID[card.unitId];
      if (spec.kind === "trap") {
        const slot = this.traps.length;
        const dist = [10, 16, 21][slot] || 12;
        const p = pointAt(this.path, Math.min(this.path.length - 2, dist), 0);
        this.traps.push({
          ...stats,
          uid: `trap-${this.seq++}`,
          alive: true,
          maxHp: stats.hp,
          cd: spec.trap === "mine" ? 0.6 : 0,
          pathDist: Math.min(this.path.length - 2, dist),
          x: p.x,
          z: p.z,
          phase: this.rng() * 3,
          crit: this.loadout.crit,
        });
      } else {
        const slot = this.units.filter((u) => !u.isCaptain).length;
        if (slot >= 4) return;
        this.units.push({
          ...stats,
          uid: `def-${this.seq++}`,
          slot,
          isCaptain: false,
          cd: 0.25,
          burstLeft: 0,
          burstGap: 0,
          flash: 0,
          crit: this.loadout.crit,
        });
      }
      this.events.push({ t: "deploy", unitId: card.unitId });
      return;
    }
    const u = this.units.find((x) => x.uid === card.uid);
    if (!u) return;
    if (card.stat === "damage") u.damage = Math.round(u.damage * 1.6 * 10) / 10;
    else if (card.stat === "cooldown") u.cooldown = Math.max(0.18, Math.round(u.cooldown * 0.75 * 100) / 100);
    else if (card.stat === "hitCount") u.hitCount += 5;
    else if (card.stat === "beamDuration") u.beamDuration = Math.round((u.beamDuration + 0.45) * 100) / 100;
    else if (card.stat === "size") u.size = Math.min(3, (u.size || 1) * 2);
    else if (card.stat === "projectiles") u.projectiles += 2;
    else if (card.stat === "ricochet") u.ricochet += 2;
    else if (card.stat === "pierce") u.pierce += 1;
    else if (card.stat === "fireAgain") u.fireAgain += 2;
  }

  enemyTypes() {
    const set = new Set();
    for (const wave of this.waves) for (const s of wave) set.add(s.type);
    return [...set];
  }
}
