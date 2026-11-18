import assert from "node:assert/strict";
import { Battle, starsFor } from "../js/battle.js";
import { fresh, grantVictory, load, persist, upgradeUnit } from "../js/save.js";
import { buildLoadout, previewUnit, wallMax } from "../js/stats.js";

globalThis.localStorage = {
  _m: new Map(),
  getItem(k) {
    return this._m.has(k) ? this._m.get(k) : null;
  },
  setItem(k, v) {
    this._m.set(k, String(v));
  },
  removeItem(k) {
    this._m.delete(k);
  },
};

function auto(battle, limit = 25000) {
  let n = 0;
  while (!battle.result && n < limit) {
    if (battle.offer) {
      const deploy = battle.offer.findIndex((c) => c.kind === "deploy");
      const dmg = battle.offer.findIndex((c) => c.stat === "damage");
      battle.pick(deploy >= 0 && battle.units.length < 3 ? deploy : dmg >= 0 ? dmg : 0);
    }
    battle.update(0.1);
    n++;
  }
  return n;
}

const nyx = fresh();
nyx.captainId = "nyx";
const holt = fresh();
holt.captainId = "holt";
const lumenNyx = previewUnit(nyx, "lumen").damage;
const lumenHolt = previewUnit(holt, "lumen").damage;
assert.ok(lumenNyx > lumenHolt, `Lumen should hit harder for Nyx (${lumenNyx} vs ${lumenHolt})`);
const scrapNyx = previewUnit(nyx, "scrap").damage;
const scrapHolt = previewUnit(holt, "scrap").damage;
assert.ok(scrapHolt > scrapNyx, `Scrap should hit harder for Holt (${scrapHolt} vs ${scrapNyx})`);
assert.equal(previewUnit(nyx, "volley").name, "Prism Volley");
assert.equal(previewUnit(holt, "cyclone").name, "Iron Cyclone");
assert.ok(wallMax(holt).hp > wallMax(nyx).hp, "Holt keeps a thicker wall");
assert.ok(previewUnit(nyx, "colt").projectiles >= previewUnit(holt, "colt").projectiles);

const quill = fresh();
quill.captainId = "quill";
assert.ok(previewUnit(quill, "coil").damage > previewUnit(nyx, "coil").damage);
assert.ok(previewUnit(quill, "brick").ricochet > previewUnit(nyx, "brick").ricochet);

const save = fresh();
persist(save);
const loaded = load();
assert.equal(loaded.gold, save.gold);
assert.equal(loaded.captainId, "nyx");
const up = upgradeUnit(loaded, "volley");
assert.equal(up.ok, true);
assert.equal(load().levels.volley, 2);

assert.equal(starsFor(100, 100), 3);
assert.equal(starsFor(50, 100), 2);
assert.equal(starsFor(49, 100), 1);

const win = new Battle({ stage: 1, hard: false, loadout: buildLoadout(fresh()), seed: 2 });
const steps = auto(win);
assert.equal(win.result, "win", `stage 1 should be winnable (steps ${steps}, hp ${win.hp}, wave ${win.wave})`);
assert.ok(win.skills.length > 0, "skill cards should have been offered");
assert.ok(win.units.length > 1, "a defender should have joined");

const weak = buildLoadout(fresh());
for (const u of weak.units) u.damage = 0;
weak.catalog = Object.fromEntries(Object.entries(weak.catalog).map(([k, v]) => [k, { ...v, damage: 0, hp: 10 }]));
const lose = new Battle({ stage: 1, hard: false, loadout: weak, seed: 2 });
auto(lose, 8000);
assert.equal(lose.result, "lose", `zero damage should lose (wave ${lose.wave}, hp ${lose.hp})`);

const mid = new Battle({ stage: 12, hard: false, loadout: buildLoadout(fresh()), seed: 3 });
assert.equal(mid.info.region.id, "glacier");
assert.ok(mid.enemyTypes().includes("icewidow") || mid.waves[19].some((s) => s.type === "icewidow"));

const late = new Battle({ stage: 30, hard: true, loadout: buildLoadout(fresh()), seed: 4 });
assert.equal(late.info.region.id, "canyon");
assert.ok(late.waves[19].some((s) => s.type === "vault"));

const farm = fresh();
grantVictory(farm, { stage: 1, hard: false, stars: 3 });
assert.equal(load().stages["1"].stars, 3);
assert.ok(load().gold > 3600);

console.log("sim ok", {
  stage1Steps: steps,
  stage1Hp: Math.round(win.hp),
  stars: starsFor(win.hp, win.maxHp),
  skills: win.skills.length,
  lumen: [lumenNyx, lumenHolt],
  scrap: [scrapNyx, scrapHolt],
  wall: [wallMax(nyx).hp, wallMax(holt).hp],
});
