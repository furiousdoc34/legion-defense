import {
  BASE_WALL,
  CAPTAIN_BY_ID,
  CHIP_BY_ID,
  MAX_LEVEL,
  SLOTS,
  UNIT_BY_ID,
  UNITS,
} from "./data.js";

const COUNT_STATS = new Set(["projectiles", "pierce", "ricochet", "fireAgain", "hitCount", "hp"]);

function num(n, d = 0) {
  return Math.round(n * 10 ** d) / 10 ** d;
}

export function gearLevels(save, captainId = save.captainId) {
  const g = save.gear[captainId];
  let sum = 0;
  for (const slot of SLOTS) sum += g[slot].level;
  return sum;
}

export function equippedChips(save, captainId = save.captainId) {
  const g = save.gear[captainId];
  const list = [];
  for (const slot of SLOTS) {
    const id = g[slot].chip;
    if (id && CHIP_BY_ID[id]) list.push({ slot, chip: CHIP_BY_ID[id] });
  }
  return list;
}

function chipMatches(chip, unit) {
  if (chip.target === "wall") return false;
  if (chip.target === unit.id) return true;
  if (chip.target.startsWith("element:") && chip.target.slice(8) === unit.element) return true;
  return false;
}

export function previewUnit(save, id) {
  const base = UNIT_BY_ID[id];
  const captain = CAPTAIN_BY_ID[save.captainId];
  const level = Math.max(1, Math.min(MAX_LEVEL, save.levels[id] || 1));
  const levelMult = 1 + (level - 1) * 0.12;
  const notes = [];
  const stats = {
    id,
    name: base.name,
    kind: base.kind,
    element: base.element,
    blurb: base.blurb,
    trap: base.trap,
    level,
    range: base.range,
    projectiles: base.projectiles,
    spread: base.spread,
    pierce: base.pierce,
    ricochet: base.ricochet,
    fireAgain: base.fireAgain,
    aoe: base.aoe,
    aoeRadius: base.aoeRadius,
    beam: base.beam,
    beamDuration: base.beamDuration,
    hitCount: base.hitCount,
    slow: base.slow,
    poison: base.poison,
    hp: base.hp,
    size: base.size,
    damage: base.damage * (base.levelStat === "damage" ? 1 : levelMult),
    cooldown: base.cooldown,
  };

  if (base.damage > 0) {
    notes.push({ label: `Armory Lv.${level}`, stat: "damage", text: `×${levelMult.toFixed(2)}` });
  }
  if (base.trap === "plate") {
    stats.hp = Math.round(base.hp * levelMult);
    notes.push({ label: `Armory Lv.${level}`, stat: "hp", text: `×${levelMult.toFixed(2)}` });
  }

  const eb = captain.elementBonus[base.element] || 0;
  if (eb && stats.damage) {
    stats.damage *= 1 + eb;
    notes.push({ label: captain.name, stat: "damage", text: `${base.element} +${Math.round(eb * 100)}%` });
  }
  const flats = captain.elementFlats[base.element] || {};
  for (const [stat, value] of Object.entries(flats)) {
    stats[stat] = (stats[stat] || 0) + value;
    notes.push({ label: captain.name, stat, text: `${stat} +${value}` });
  }

  let dmgPct = 0;
  let cdPct = 0;
  for (const { chip } of equippedChips(save)) {
    if (!chipMatches(chip, base)) continue;
    if (chip.stat === "damage" && chip.mode === "pct") {
      dmgPct += chip.value;
      notes.push({ label: chip.name, stat: "damage", text: `+${Math.round(chip.value * 100)}%` });
    } else if (chip.stat === "cooldown" && chip.mode === "pct") {
      cdPct += chip.value;
      notes.push({ label: chip.name, stat: "cooldown", text: `${Math.round(chip.value * 100)}%` });
    } else if (chip.stat === "hp" && chip.mode === "pct") {
      stats.hp = Math.round(stats.hp * (1 + chip.value));
      notes.push({ label: chip.name, stat: "hp", text: `+${Math.round(chip.value * 100)}%` });
    } else if (chip.mode === "pct") {
      stats[chip.stat] = (stats[chip.stat] || 0) * (1 + chip.value);
      notes.push({ label: chip.name, stat: chip.stat, text: `+${Math.round(chip.value * 100)}%` });
    } else {
      stats[chip.stat] = (stats[chip.stat] || 0) + chip.value;
      notes.push({ label: chip.name, stat: chip.stat, text: `+${chip.value}` });
    }
  }
  if (dmgPct) stats.damage *= 1 + dmgPct;
  if (cdPct) stats.cooldown *= 1 + cdPct;

  const steps = Math.floor((level - 1) / 5);
  if (base.levelStat && steps) {
    const amt = (base.levelStatAmt ?? 1) * steps;
    if (base.levelStat === "damage") stats.damage *= 1 + amt;
    else if (COUNT_STATS.has(base.levelStat) || base.levelStat === "slow" || base.levelStat === "beamDuration") {
      stats[base.levelStat] = (stats[base.levelStat] || 0) + amt;
    } else {
      stats[base.levelStat] = (stats[base.levelStat] || 0) * (1 + amt);
    }
    notes.push({ label: `Mastery ${steps}`, stat: base.levelStat, text: `+${num(amt, 2)}` });
  }

  const weaponId = save.weaponByCaptain[save.captainId];
  if (id === weaponId) {
    const gearPct = 0.02 * gearLevels(save);
    if (gearPct && stats.damage) {
      stats.damage *= 1 + gearPct;
      notes.push({ label: "Gear", stat: "damage", text: `+${Math.round(gearPct * 100)}%` });
    }
    if (captain.cooldownMult !== 1) {
      stats.cooldown *= captain.cooldownMult;
      notes.push({
        label: captain.name,
        stat: "cooldown",
        text: `${Math.round((captain.cooldownMult - 1) * 100)}%`,
      });
    }
  }

  stats.cooldown = Math.max(0.18, stats.cooldown);
  stats.damage = num(stats.damage, 1);
  stats.cooldown = num(stats.cooldown, 2);
  stats.beamDuration = num(stats.beamDuration, 2);
  stats.slow = num(stats.slow, 2);
  stats.aoeRadius = num(stats.aoeRadius, 2);
  stats.range = num(stats.range, 1);
  stats.hp = Math.round(stats.hp);
  stats.projectiles = Math.round(stats.projectiles);
  stats.pierce = Math.round(stats.pierce);
  stats.ricochet = Math.round(stats.ricochet);
  stats.fireAgain = Math.round(stats.fireAgain);
  stats.hitCount = Math.max(1, Math.round(stats.hitCount));
  stats.notes = notes;
  stats.crit = captain.crit;
  return stats;
}

export function wallMax(save) {
  const captain = CAPTAIN_BY_ID[save.captainId];
  let hp = BASE_WALL + (captain.wallHp || 0);
  const notes = [];
  if (captain.wallHp) notes.push({ label: captain.name, text: `+${captain.wallHp} HP` });
  for (const { chip } of equippedChips(save)) {
    if (chip.target === "wall" && chip.stat === "hp") {
      hp += chip.value;
      notes.push({ label: chip.name, text: `+${chip.value} HP` });
    }
  }
  return { hp: Math.round(hp), notes, base: BASE_WALL };
}

export function powerScore(save) {
  const weapon = save.weaponByCaptain[save.captainId];
  let p = 380 + (save.levels[weapon] || 1) * 28 + gearLevels(save) * 46;
  p += equippedChips(save).length * 70;
  p += Math.round(previewUnit(save, weapon).damage);
  return p;
}

export function buildLoadout(save) {
  const weaponId = save.weaponByCaptain[save.captainId];
  const weapon = previewUnit(save, weaponId);
  const captain = CAPTAIN_BY_ID[save.captainId];
  const catalog = {};
  for (const unit of UNITS) catalog[unit.id] = previewUnit(save, unit.id);
  const captainUnit = {
    ...weapon,
    uid: "captain",
    slot: -1,
    isCaptain: true,
    cd: 0.35,
    burstLeft: 0,
    burstGap: 0,
    flash: 0,
  };
  return {
    captainId: save.captainId,
    captainName: captain.name,
    crit: captain.crit,
    wall: wallMax(save).hp,
    catalog,
    units: [captainUnit],
  };
}

export function statRows(stats) {
  const rows = [];
  if (stats.kind === "trap" && stats.trap === "plate") {
    rows.push(["HP", stats.hp]);
  } else if (stats.damage) {
    rows.push(["Damage", stats.damage]);
  }
  if (stats.kind !== "trap" || stats.trap === "mine" || stats.trap === "saw") {
    if (stats.cooldown && stats.trap !== "plate") rows.push(["Cooldown", `${stats.cooldown}s`]);
  }
  if (stats.beam) rows.push(["Hit duration", `${stats.beamDuration}s`]);
  if (stats.beam || stats.hitCount > 1) rows.push(["Hits", stats.hitCount]);
  if (stats.projectiles > 1) rows.push(["Projectiles", stats.projectiles]);
  if (stats.ricochet > 0) rows.push(["Ricochet", stats.ricochet]);
  if (stats.pierce > 0) rows.push(["Penetration", stats.pierce]);
  if (stats.fireAgain > 0) rows.push(["Fire again", stats.fireAgain]);
  if (stats.aoe) rows.push(["Area size", stats.aoeRadius]);
  if (stats.slow > 0 && stats.trap !== "slick") rows.push(["Slow", `${stats.slow}s`]);
  if (stats.trap === "slick") rows.push(["Slow zone", stats.aoeRadius]);
  if (stats.poison > 0) rows.push(["Poison", stats.poison]);
  if (stats.kind !== "trap") rows.push(["Range", stats.range]);
  return rows;
}

export function diffLoadouts(before, after) {
  const rows = [];
  const ids = new Set([...Object.keys(before.catalog), ...Object.keys(after.catalog)]);
  for (const id of ids) {
    const a = before.catalog[id];
    const b = after.catalog[id];
    const changes = [];
    for (const key of ["damage", "cooldown", "projectiles", "ricochet", "pierce", "fireAgain", "hitCount", "beamDuration", "hp", "range", "slow", "aoeRadius"]) {
      if (a[key] !== b[key]) changes.push({ key, from: a[key], to: b[key] });
    }
    if (changes.length) rows.push({ id, name: a.name, element: a.element, changes });
  }
  rows.sort((a, b) => Math.abs((b.changes[0].to || 0) - (b.changes[0].from || 0)) - Math.abs((a.changes[0].to || 0) - (a.changes[0].from || 0)));
  return rows;
}
