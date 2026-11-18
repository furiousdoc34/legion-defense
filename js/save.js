import {
  CAPTAINS,
  CHEST_TIERS,
  MEAT_CAP,
  MEAT_COST,
  MEAT_MS,
  REGIONS,
  STARTER_BAG,
  STARTER_GEAR,
  UNITS,
  fragCost,
  gearCost,
  goldCost,
  victoryGold,
} from "./data.js";

export const KEY = "nova-bastion-v1";

function memoryStore() {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
}

function store() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* private mode */
  }
  return memoryStore();
}

export function fresh() {
  const levels = {};
  const frags = {};
  for (const u of UNITS) {
    levels[u.id] = 1;
    frags[u.id] = 8;
  }
  const gear = {};
  for (const c of CAPTAINS) {
    gear[c.id] = JSON.parse(JSON.stringify(STARTER_GEAR[c.id]));
  }
  return {
    v: 1,
    gold: 3600,
    gems: 48,
    meat: 36,
    meatAt: Date.now(),
    captainId: "nyx",
    weaponByCaptain: { nyx: "volley", holt: "cyclone", quill: "gauss" },
    levels,
    frags,
    gear,
    bag: [...STARTER_BAG],
    stages: {},
    chests: {},
    stage: 1,
    hard: false,
    speed: 1,
    muted: false,
    vip: false,
    claims: { supplyAt: 0, dinerAt: 0, crateAt: 0, signalAt: 0 },
    seenIntro: false,
  };
}

function normalize(data) {
  const base = fresh();
  const save = { ...base, ...data };
  save.levels = { ...base.levels, ...(data.levels || {}) };
  save.frags = { ...base.frags, ...(data.frags || {}) };
  save.gear = { ...base.gear, ...(data.gear || {}) };
  for (const c of CAPTAINS) {
    save.gear[c.id] = { ...base.gear[c.id], ...(data.gear?.[c.id] || {}) };
    for (const slot of Object.keys(base.gear[c.id])) {
      save.gear[c.id][slot] = { ...base.gear[c.id][slot], ...(data.gear?.[c.id]?.[slot] || {}) };
    }
  }
  save.weaponByCaptain = { ...base.weaponByCaptain, ...(data.weaponByCaptain || {}) };
  save.claims = { ...base.claims, ...(data.claims || {}) };
  save.stages = { ...(data.stages || {}) };
  save.chests = { ...(data.chests || {}) };
  save.bag = Array.isArray(data.bag) ? data.bag : [...STARTER_BAG];
  save.vip = false;
  return save;
}

export function load() {
  try {
    const raw = store().getItem(KEY);
    if (!raw) return fresh();
    return normalize(JSON.parse(raw));
  } catch {
    return fresh();
  }
}

export function persist(save) {
  store().setItem(KEY, JSON.stringify(save));
}

export function regen(save, now = Date.now()) {
  if (save.meat >= MEAT_CAP) {
    save.meatAt = now;
    return save;
  }
  const gained = Math.floor((now - save.meatAt) / MEAT_MS);
  if (gained > 0) {
    save.meat = Math.min(MEAT_CAP, save.meat + gained);
    save.meatAt += gained * MEAT_MS;
  }
  return save;
}

export function meatLabel(save, now = Date.now()) {
  regen(save, now);
  if (save.meat >= MEAT_CAP) return `${save.meat}/${MEAT_CAP}`;
  const next = MEAT_MS - (now - save.meatAt);
  const m = Math.max(0, Math.ceil(next / 60000));
  return `${save.meat}/${MEAT_CAP} · ${m}m`;
}

export function stageRecord(save, stage) {
  return save.stages[String(stage)] || { stars: 0, hardStars: 0 };
}

export function starsOf(save, stage, hard = false) {
  const rec = stageRecord(save, stage);
  return hard ? rec.hardStars || 0 : rec.stars || 0;
}

export function bestStars(save, stage) {
  const rec = stageRecord(save, stage);
  return Math.max(rec.stars || 0, rec.hardStars || 0);
}

export function cleared(save, stage, hard = false) {
  return starsOf(save, stage, hard) > 0;
}

export function unlocked(save, stage) {
  if (stage <= 1) return true;
  return cleared(save, stage - 1, false);
}

export function actStars(save, actIndex) {
  let s = 0;
  for (let i = 1; i <= 10; i++) s += starsOf(save, actIndex * 10 + i, false);
  return s;
}

export function totalStars(save) {
  return REGIONS.reduce((n, r) => n + actStars(save, r.actIndex), 0);
}

function grantFrags(save, count, rolls, rng = Math.random) {
  const ids = Object.keys(save.levels);
  const got = [];
  for (let i = 0; i < rolls; i++) {
    const id = ids[Math.floor(rng() * ids.length)];
    save.frags[id] = (save.frags[id] || 0) + count;
    got.push({ id, count });
  }
  return got;
}

export function grantVictory(save, { stage, hard, stars }) {
  const gold = victoryGold(stage, hard, stars);
  const gems = stars >= 3 ? 3 : stars === 2 ? 1 : 0;
  save.gold += gold;
  save.gems += gems;
  const frags = grantFrags(save, 1 + stars, 2);
  const rec = stageRecord(save, stage);
  if (hard) rec.hardStars = Math.max(rec.hardStars || 0, stars);
  else rec.stars = Math.max(rec.stars || 0, stars);
  save.stages[String(stage)] = rec;
  if (!hard && stars > 0 && stage < 30 && unlocked(save, stage + 1)) {
    /* next stage already opens via cleared() */
  }
  if (!hard && stage === save.stage && stage < 30) save.stage = stage + 1;
  persist(save);
  return { gold, gems, frags, stars };
}

export function grantDefeat(save, { stage, hard }) {
  const gold = Math.round(victoryGold(stage, hard, 1) * 0.22);
  save.gold += gold;
  const frags = grantFrags(save, 1, 1);
  persist(save);
  return { gold, gems: 0, frags };
}

export function spendMeat(save, amount = MEAT_COST) {
  regen(save);
  if (save.meat < amount) return false;
  save.meat -= amount;
  if (save.meat >= MEAT_CAP) save.meatAt = Date.now();
  persist(save);
  return true;
}

export function fastRaid(save, stage, hard) {
  if (!cleared(save, stage, hard)) return { ok: false, reason: "Clear this difficulty first." };
  if (!spendMeat(save)) return { ok: false, reason: "Not enough meat." };
  const gold = Math.round(victoryGold(stage, hard, Math.max(1, starsOf(save, stage, hard))) * 0.8);
  save.gold += gold;
  const frags = grantFrags(save, 2, 1);
  persist(save);
  return { ok: true, gold, frags };
}

export function upgradeUnit(save, id) {
  const level = save.levels[id] || 1;
  if (level >= 20) return { ok: false, reason: "Max level." };
  const gold = goldCost(level);
  const frags = fragCost(level);
  if (save.gold < gold) return { ok: false, reason: "Not enough gold." };
  if ((save.frags[id] || 0) < frags) return { ok: false, reason: "Not enough fragments." };
  save.gold -= gold;
  save.frags[id] -= frags;
  save.levels[id] = level + 1;
  persist(save);
  return { ok: true, level: save.levels[id] };
}

export function upgradeGear(save, captainId, slot) {
  const piece = save.gear[captainId][slot];
  if (piece.level >= 20) return { ok: false, reason: "Max level." };
  const cost = gearCost(piece.level);
  if (save.gold < cost) return { ok: false, reason: "Not enough gold." };
  save.gold -= cost;
  piece.level += 1;
  persist(save);
  return { ok: true };
}

export function socketChip(save, captainId, slot, chipId) {
  const piece = save.gear[captainId][slot];
  if (chipId) {
    const idx = save.bag.indexOf(chipId);
    if (idx < 0) return { ok: false, reason: "Chip is not in the bag." };
    save.bag.splice(idx, 1);
  }
  if (piece.chip) save.bag.push(piece.chip);
  piece.chip = chipId || null;
  persist(save);
  return { ok: true };
}

export function setWeapon(save, captainId, weaponId) {
  save.weaponByCaptain[captainId] = weaponId;
  persist(save);
}

export function setCaptain(save, captainId) {
  save.captainId = captainId;
  persist(save);
}

export function claimChest(save, actIndex, tier) {
  const key = `${actIndex}-${tier}`;
  if (save.chests[key]) return { ok: false, reason: "Already opened." };
  if (actStars(save, actIndex) < tier) return { ok: false, reason: "Not enough stars." };
  const spec = CHEST_TIERS.find((t) => t.stars === tier);
  save.gold += spec.gold;
  save.gems += spec.gems;
  const frags = grantFrags(save, spec.frags, 1);
  save.chests[key] = true;
  persist(save);
  return { ok: true, gold: spec.gold, gems: spec.gems, frags };
}

function claimTimed(save, field, ms, grant) {
  const now = Date.now();
  if (now - save.claims[field] < ms) {
    const left = ms - (now - save.claims[field]);
    return { ok: false, reason: `Ready in ${Math.ceil(left / 60000)}m.` };
  }
  save.claims[field] = now;
  const reward = grant(save);
  persist(save);
  return { ok: true, ...reward };
}

export function claimSupply(save) {
  return claimTimed(save, "supplyAt", 4 * 3600 * 1000, (s) => {
    s.gold += 1200;
    s.meat = Math.min(MEAT_CAP + 10, s.meat + 8);
    s.gems += 5;
    return { gold: 1200, meat: 8, gems: 5, title: "Supply drop" };
  });
}

export function claimDiner(save) {
  return claimTimed(save, "dinerAt", 30 * 60 * 1000, (s) => {
    s.meat = Math.min(MEAT_CAP + 12, s.meat + 6);
    return { meat: 6, title: "Diner rations" };
  });
}

export function claimCrate(save) {
  return claimTimed(save, "crateAt", 20 * 60 * 1000, (s) => {
    s.gold += 800;
    return { gold: 800, title: "Coin crate" };
  });
}

export function claimSignal(save) {
  return claimTimed(save, "signalAt", 8 * 3600 * 1000, (s) => {
    s.gems += 15;
    const frags = grantFrags(s, 6, 2);
    return { gems: 15, frags, title: "Free signal pack" };
  });
}

export function readyIn(save, field, ms, now = Date.now()) {
  const left = ms - (now - save.claims[field]);
  return left <= 0 ? 0 : left;
}

export { MEAT_COST };
