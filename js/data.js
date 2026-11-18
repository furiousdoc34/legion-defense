/** Nova Bastion — original definitions. Inspired by the wall-defense loop, not its names or art. */

export const ELEMENTS = {
  steel: { id: "steel", name: "Steel", color: "#d5deea", hot: "#f4f7fb" },
  laser: { id: "laser", name: "Laser", color: "#d45bff", hot: "#7af6ff" },
  electric: { id: "electric", name: "Electric", color: "#ffe14a", hot: "#fff6b0" },
  fire: { id: "fire", name: "Fire", color: "#ff6a1a", hot: "#ffd0a0" },
  cryo: { id: "cryo", name: "Cryo", color: "#7ee7ff", hot: "#e8fbff" },
  bio: { id: "bio", name: "Bio", color: "#8dff4a", hot: "#d8ffb0" },
};

export const SLOTS = ["head", "chest", "gloves", "legs", "boots", "ring"];
export const SLOT_LABEL = {
  head: "Head",
  chest: "Chest",
  gloves: "Gloves",
  legs: "Legs",
  boots: "Boots",
  ring: "Ring",
};

const D = {
  damage: 0,
  cooldown: 1,
  range: 30,
  projectiles: 1,
  spread: 0.22,
  pierce: 0,
  ricochet: 0,
  fireAgain: 0,
  aoe: false,
  aoeRadius: 1.2,
  beam: false,
  beamDuration: 0,
  hitCount: 1,
  slow: 0,
  poison: 0,
  trap: null,
  hp: 0,
  levelStat: null,
  levelStatAmt: 1,
  size: 1,
};

function u(partial) {
  return { ...D, ...partial };
}

export const WEAPONS = [
  u({
    id: "needle",
    name: "Venom Needle",
    kind: "weapon",
    element: "bio",
    blurb: "A piercing bio dart that keeps leaking after it passes through.",
    damage: 46,
    cooldown: 0.85,
    pierce: 2,
    poison: 8,
    levelStat: "pierce",
  }),
  u({
    id: "bloom",
    name: "Solar Bloom",
    kind: "weapon",
    element: "fire",
    blurb: "A plasma blossom that scorches a patch of road.",
    damage: 74,
    cooldown: 1.35,
    aoe: true,
    aoeRadius: 1.7,
    levelStat: "aoeRadius",
    levelStatAmt: 0.15,
  }),
  u({
    id: "volley",
    name: "Prism Volley",
    kind: "weapon",
    element: "laser",
    blurb: "Six neon slugs from a short shotgun barrel.",
    damage: 16,
    cooldown: 1.05,
    projectiles: 6,
    spread: 0.34,
    levelStat: "projectiles",
  }),
  u({
    id: "shard",
    name: "Frost Shard",
    kind: "weapon",
    element: "cryo",
    blurb: "Splinters of ice that glue boots to the road.",
    damage: 38,
    cooldown: 0.95,
    projectiles: 3,
    spread: 0.28,
    slow: 1.3,
    levelStat: "slow",
    levelStatAmt: 0.2,
  }),
  u({
    id: "cyclone",
    name: "Iron Cyclone",
    kind: "weapon",
    element: "steel",
    blurb: "A spinning drum that fires, then fires again.",
    damage: 52,
    cooldown: 1.25,
    fireAgain: 1,
    levelStat: "fireAgain",
  }),
  u({
    id: "twin",
    name: "Twin Prism",
    kind: "weapon",
    element: "laser",
    blurb: "Paired beams that punch through and bounce onward.",
    damage: 44,
    cooldown: 1.05,
    pierce: 1,
    ricochet: 2,
    levelStat: "ricochet",
  }),
  u({
    id: "gauss",
    name: "Gauss Spitter",
    kind: "weapon",
    element: "steel",
    blurb: "A impatient coil gun. Short cooldown, sharp needles.",
    damage: 30,
    cooldown: 0.7,
    pierce: 1,
    levelStat: "pierce",
  }),
];

export const DEFENDERS = [
  u({
    id: "colt",
    name: "Colt Voss",
    kind: "defender",
    element: "steel",
    blurb: "A road-worn gunslinger who fans the hammer.",
    damage: 36,
    cooldown: 0.78,
    projectiles: 1,
    levelStat: "projectiles",
  }),
  u({
    id: "sera",
    name: "Sera Frost",
    kind: "defender",
    element: "cryo",
    blurb: "A patient sniper. One shot, then the target forgets how to run.",
    damage: 96,
    cooldown: 1.75,
    slow: 1.6,
    range: 36,
    levelStat: "slow",
    levelStatAmt: 0.25,
  }),
  u({
    id: "pylon",
    name: "Storm Pylon",
    kind: "defender",
    element: "electric",
    blurb: "A mast that throws a crackling chain into the pack.",
    damage: 42,
    cooldown: 1.15,
    ricochet: 2,
    levelStat: "ricochet",
  }),
  u({
    id: "vat",
    name: "Spore Vat",
    kind: "defender",
    element: "bio",
    blurb: "A bubbling barrel. The puddle keeps working after the splash.",
    damage: 28,
    cooldown: 1.05,
    aoe: true,
    aoeRadius: 1.55,
    poison: 10,
    levelStat: "aoeRadius",
    levelStatAmt: 0.12,
  }),
  u({
    id: "lance",
    name: "Ion Lance",
    kind: "defender",
    element: "laser",
    blurb: "A held beam. Longer contact means more ticks.",
    damage: 18,
    cooldown: 1.35,
    beam: true,
    beamDuration: 0.62,
    hitCount: 4,
    levelStat: "beamDuration",
    levelStatAmt: 0.12,
  }),
  u({
    id: "lumen",
    name: "Prof. Lumen",
    kind: "defender",
    element: "laser",
    blurb: "A field scholar with a pulsing prism rifle.",
    damage: 34,
    cooldown: 1.1,
    beam: true,
    beamDuration: 0.48,
    hitCount: 3,
    levelStat: "hitCount",
  }),
  u({
    id: "kite",
    name: "Kite",
    kind: "defender",
    element: "cryo",
    blurb: "Throws frost stars and never seems to stand still.",
    damage: 34,
    cooldown: 0.72,
    projectiles: 2,
    spread: 0.3,
    slow: 0.8,
    levelStat: "projectiles",
  }),
  u({
    id: "brick",
    name: "Brick Watts",
    kind: "defender",
    element: "electric",
    blurb: "Yellow hardhat, long cable, bolts that hunt the next chassis.",
    damage: 30,
    cooldown: 0.9,
    ricochet: 3,
    levelStat: "ricochet",
  }),
  u({
    id: "whirl",
    name: "Whirl Spire",
    kind: "defender",
    element: "steel",
    blurb: "A tornado drill that chews a whole file of machines.",
    damage: 26,
    cooldown: 1.3,
    aoe: true,
    aoeRadius: 1.8,
    fireAgain: 1,
    levelStat: "aoeRadius",
    levelStatAmt: 0.15,
  }),
  u({
    id: "scrap",
    name: "Scrap Crew",
    kind: "defender",
    element: "fire",
    blurb: "Two techs and a mortar. The shell lands late and loud.",
    damage: 88,
    cooldown: 1.9,
    aoe: true,
    aoeRadius: 1.65,
    levelStat: "aoeRadius",
    levelStatAmt: 0.12,
  }),
  u({
    id: "coil",
    name: "Arc Coil",
    kind: "defender",
    element: "electric",
    blurb: "A tesla drum. One zap becomes a conversation.",
    damage: 48,
    cooldown: 1.15,
    ricochet: 2,
    levelStat: "ricochet",
  }),
  u({
    id: "salvo",
    name: "Salvo Nest",
    kind: "defender",
    element: "fire",
    blurb: "Twin launch tubes. Both believe in overkill.",
    damage: 58,
    cooldown: 1.55,
    projectiles: 2,
    spread: 0.36,
    aoe: true,
    aoeRadius: 1.15,
    levelStat: "projectiles",
  }),
];

export const TRAPS = [
  u({
    id: "plate",
    name: "Bulwark Plate",
    kind: "trap",
    element: "steel",
    blurb: "A slab dropped on the road. Machines have to break it.",
    trap: "plate",
    hp: 900,
    damage: 0,
    levelStat: "hp",
    levelStatAmt: 120,
  }),
  u({
    id: "acid",
    name: "Acid Bloom",
    kind: "trap",
    element: "bio",
    blurb: "A mine that opens into a green burn.",
    trap: "mine",
    damage: 240,
    cooldown: 8,
    aoe: true,
    aoeRadius: 1.7,
    poison: 14,
    levelStat: "damage",
  }),
  u({
    id: "crack",
    name: "Crack Charge",
    kind: "trap",
    element: "fire",
    blurb: "A loud mine. The pack regrets walking together.",
    trap: "mine",
    damage: 380,
    cooldown: 8.5,
    aoe: true,
    aoeRadius: 1.9,
    levelStat: "damage",
  }),
  u({
    id: "saw",
    name: "Saw Orb",
    kind: "trap",
    element: "steel",
    blurb: "A bladed ball that patrols the lane.",
    trap: "saw",
    damage: 42,
    cooldown: 0.35,
    levelStat: "damage",
  }),
  u({
    id: "slick",
    name: "Slick Pool",
    kind: "trap",
    element: "cryo",
    blurb: "Oil and frost. Legs spin, progress does not.",
    trap: "slick",
    damage: 8,
    cooldown: 0.5,
    slow: 0.45,
    aoeRadius: 1.7,
    levelStat: "aoeRadius",
    levelStatAmt: 0.12,
  }),
];

export const UNITS = [...WEAPONS, ...DEFENDERS, ...TRAPS];
export const UNIT_BY_ID = Object.fromEntries(UNITS.map((x) => [x.id, x]));

export const CAPTAINS = [
  {
    id: "nyx",
    name: "Nyx Vale",
    title: "Night Operative",
    blurb: "Black tactical suit, cat-ear comms band, amber goggles. She makes lasers rude and crits common.",
    weapon: "volley",
    crit: 0.14,
    cooldownMult: 0.92,
    wallHp: 0,
    elementBonus: { laser: 0.22 },
    elementFlats: {},
    color: "#14161c",
    accent: "#ffb020",
  },
  {
    id: "holt",
    name: "Marshal Holt",
    title: "Bastion Veteran",
    blurb: "Orange plate and a patient cannon. The wall stands taller when he signs the watch bill.",
    weapon: "cyclone",
    crit: 0.04,
    cooldownMult: 1,
    wallHp: 800,
    elementBonus: { steel: 0.2, fire: 0.1 },
    elementFlats: {},
    color: "#e07020",
    accent: "#ffd27a",
  },
  {
    id: "quill",
    name: "Dr. Ivo Quill",
    title: "Field Scholar",
    blurb: "White hair, yellow coat, an arc gauntlet. Electricity leaves his line and looks for friends.",
    weapon: "gauss",
    crit: 0.06,
    cooldownMult: 1,
    wallHp: 0,
    elementBonus: { electric: 0.24, bio: 0.08 },
    elementFlats: { electric: { ricochet: 1 } },
    color: "#f0c14a",
    accent: "#7ee7ff",
  },
];

export const CAPTAIN_BY_ID = Object.fromEntries(CAPTAINS.map((c) => [c.id, c]));

export const CHIPS = [
  { id: "lumen-dmg", name: "Lumen Lens", target: "lumen", stat: "damage", value: 0.24, mode: "pct", text: "Prof. Lumen damage +24%" },
  { id: "colt-proj", name: "Colt Cylinder", target: "colt", stat: "projectiles", value: 1, mode: "flat", text: "Colt Voss projectiles +1" },
  { id: "kite-cd", name: "Kite Wrap", target: "kite", stat: "cooldown", value: -0.15, mode: "pct", text: "Kite cooldown −15%" },
  { id: "lance-beam", name: "Lance Coil", target: "lance", stat: "beamDuration", value: 0.35, mode: "flat", text: "Ion Lance hit duration +0.35s" },
  { id: "sera-dmg", name: "Sera Glass", target: "sera", stat: "damage", value: 0.18, mode: "pct", text: "Sera Frost damage +18%" },
  { id: "laser-all", name: "Prism Ring", target: "element:laser", stat: "damage", value: 0.08, mode: "pct", text: "All Laser damage +8%" },
  { id: "scrap-dmg", name: "Scrap Stamp", target: "scrap", stat: "damage", value: 0.2, mode: "pct", text: "Scrap Crew damage +20%" },
  { id: "salvo-proj", name: "Salvo Rack", target: "salvo", stat: "projectiles", value: 1, mode: "flat", text: "Salvo Nest projectiles +1" },
  { id: "wall-hp", name: "Keep Stone", target: "wall", stat: "hp", value: 400, mode: "flat", text: "Wall HP +400" },
  { id: "cyclone-again", name: "Cyclone Drum", target: "cyclone", stat: "fireAgain", value: 1, mode: "flat", text: "Iron Cyclone fire again +1" },
  { id: "plate-hp", name: "Plate Rivet", target: "plate", stat: "hp", value: 0.25, mode: "pct", text: "Bulwark Plate HP +25%" },
  { id: "steel-all", name: "Steel Band", target: "element:steel", stat: "damage", value: 0.1, mode: "pct", text: "All Steel damage +10%" },
  { id: "brick-rico", name: "Brick Spark", target: "brick", stat: "ricochet", value: 1, mode: "flat", text: "Brick Watts ricochet +1" },
  { id: "coil-dmg", name: "Coil Core", target: "coil", stat: "damage", value: 0.22, mode: "pct", text: "Arc Coil damage +22%" },
  { id: "pylon-range", name: "Pylon Mast", target: "pylon", stat: "range", value: 0.1, mode: "pct", text: "Storm Pylon range +10%" },
  { id: "vat-dmg", name: "Vat Seal", target: "vat", stat: "damage", value: 0.18, mode: "pct", text: "Spore Vat damage +18%" },
  { id: "gauss-cd", name: "Gauss Spring", target: "gauss", stat: "cooldown", value: -0.1, mode: "pct", text: "Gauss Spitter cooldown −10%" },
  { id: "elec-all", name: "Arc Ring", target: "element:electric", stat: "damage", value: 0.08, mode: "pct", text: "All Electric damage +8%" },
  { id: "whirl-aoe", name: "Whirl Vane", target: "whirl", stat: "aoeRadius", value: 0.2, mode: "pct", text: "Whirl Spire area size +20%" },
  { id: "needle-pierce", name: "Needle Bore", target: "needle", stat: "pierce", value: 1, mode: "flat", text: "Venom Needle penetration +1" },
  { id: "bloom-dmg", name: "Bloom Dish", target: "bloom", stat: "damage", value: 0.15, mode: "pct", text: "Solar Bloom damage +15%" },
  { id: "acid-dmg", name: "Acid Amp", target: "acid", stat: "damage", value: 0.2, mode: "pct", text: "Acid Bloom damage +20%" },
  { id: "shard-slow", name: "Shard Dew", target: "shard", stat: "slow", value: 0.4, mode: "flat", text: "Frost Shard slow +0.4s" },
  { id: "crack-dmg", name: "Crack Fuse", target: "crack", stat: "damage", value: 0.15, mode: "pct", text: "Crack Charge damage +15%" },
  { id: "saw-dmg", name: "Saw Tooth", target: "saw", stat: "damage", value: 0.16, mode: "pct", text: "Saw Orb damage +16%" },
];

export const CHIP_BY_ID = Object.fromEntries(CHIPS.map((c) => [c.id, c]));

export const STARTER_GEAR = {
  nyx: {
    head: { level: 3, chip: "lumen-dmg" },
    chest: { level: 2, chip: "colt-proj" },
    gloves: { level: 2, chip: "kite-cd" },
    legs: { level: 2, chip: "lance-beam" },
    boots: { level: 1, chip: "sera-dmg" },
    ring: { level: 2, chip: "laser-all" },
  },
  holt: {
    head: { level: 2, chip: "scrap-dmg" },
    chest: { level: 3, chip: "salvo-proj" },
    gloves: { level: 2, chip: "wall-hp" },
    legs: { level: 2, chip: "cyclone-again" },
    boots: { level: 1, chip: "plate-hp" },
    ring: { level: 3, chip: "steel-all" },
  },
  quill: {
    head: { level: 3, chip: "brick-rico" },
    chest: { level: 2, chip: "coil-dmg" },
    gloves: { level: 2, chip: "pylon-range" },
    legs: { level: 1, chip: "vat-dmg" },
    boots: { level: 2, chip: "gauss-cd" },
    ring: { level: 3, chip: "elec-all" },
  },
};

export const STARTER_BAG = ["whirl-aoe", "needle-pierce", "bloom-dmg", "acid-dmg", "shard-slow", "crack-dmg", "saw-dmg"];

export const REGIONS = [
  {
    id: "metro",
    name: "Metro Scar",
    act: "Act 1",
    actIndex: 0,
    blurb: "Cracked city road, lamps, and grass pushing through the asphalt.",
    sky: "#8ec4ef",
    fog: "#b7d4ee",
    ground: "#6ea84a",
    road: "#4a5160",
    sun: "#fff1d0",
    hemiSky: "#cfe7ff",
    hemiGround: "#3e6a32",
    enemyBias: ["dasher", "dasher", "skitter", "crackle", "shield", "fusil"],
    boss: "knox",
  },
  {
    id: "glacier",
    name: "Glacier Line",
    act: "Act 2",
    actIndex: 1,
    blurb: "Snow, pines, and a frozen river beside the pass.",
    sky: "#d5e9f7",
    fog: "#e7f2fb",
    ground: "#e7f4ff",
    road: "#c5d5e4",
    sun: "#f7fbff",
    hemiSky: "#f4fbff",
    hemiGround: "#8fb4c8",
    enemyBias: ["skitter", "skitter", "mite", "shield", "dasher", "gnasher"],
    boss: "icewidow",
  },
  {
    id: "canyon",
    name: "Rust Canyon",
    act: "Act 3",
    actIndex: 2,
    blurb: "Red sand, mesas, and the bones of old machines.",
    sky: "#f0b27a",
    fog: "#f3c79a",
    ground: "#e0a15a",
    road: "#c9844a",
    sun: "#ffe0b0",
    hemiSky: "#ffd2a0",
    hemiGround: "#a85a32",
    enemyBias: ["fusil", "shield", "crackle", "dasher", "mite", "gnasher", "skitter"],
    boss: "vault",
  },
];

export const STAGE_NAMES = [
  "Gate Crash", "Lamp Alley", "Overpass", "Market Rift", "Bus Yard",
  "Canal Steps", "Billboard", "Depot", "Last Tram", "Knox Arrival",
  "Pine Gate", "Frozen Ford", "Switchback", "White Signal", "Ice Teeth",
  "Cable Car", "Glacier Cut", "Snow Blind", "High Camp", "Widow's Span",
  "Mesa Mouth", "Wreck Mile", "Sun Kiln", "Dust Funnel", "Rail Bones",
  "Red Overlook", "Tank Grave", "Echo Gulch", "Last Pump", "Vault's Leap",
];

export function regionForStage(stage) {
  if (stage <= 10) return REGIONS[0];
  if (stage <= 20) return REGIONS[1];
  return REGIONS[2];
}

export function stageInfo(stage) {
  const region = regionForStage(stage);
  return {
    id: stage,
    name: STAGE_NAMES[stage - 1],
    region,
    indexInAct: ((stage - 1) % 10) + 1,
  };
}

export const ENEMIES = {
  skitter: {
    id: "skitter",
    name: "Skitter",
    blurb: "A small spider bot. Fast legs, thin armor.",
    hp: 78,
    dmg: 26,
    speed: 2.35,
    bp: 14,
    shield: 0,
    rangeStop: 0,
    atkCd: 0.7,
    flying: false,
    explode: false,
    radius: 0.48,
  },
  dasher: {
    id: "dasher",
    name: "Dasher",
    blurb: "A sprinter frame. It only knows the wall.",
    hp: 64,
    dmg: 32,
    speed: 3.45,
    bp: 13,
    shield: 0,
    rangeStop: 0,
    atkCd: 0.65,
    flying: false,
    explode: false,
    radius: 0.42,
  },
  crackle: {
    id: "crackle",
    name: "Crackle",
    blurb: "A round boomer. Dies loud, on purpose.",
    hp: 110,
    dmg: 300,
    speed: 2.05,
    bp: 16,
    shield: 0,
    rangeStop: 0,
    atkCd: 9,
    flying: false,
    explode: true,
    radius: 0.5,
  },
  shield: {
    id: "shield",
    name: "Shieldback",
    blurb: "A walking barricade. Break the plate first.",
    hp: 240,
    dmg: 42,
    speed: 1.25,
    bp: 18,
    shield: 200,
    rangeStop: 0,
    atkCd: 1.1,
    flying: false,
    explode: false,
    radius: 0.62,
  },
  fusil: {
    id: "fusil",
    name: "Fusilier",
    blurb: "Stops short and throws rockets at the keep.",
    hp: 150,
    dmg: 78,
    speed: 1.7,
    bp: 16,
    shield: 0,
    rangeStop: 8.2,
    atkCd: 2.15,
    flying: false,
    explode: false,
    shotSpeed: 7,
    radius: 0.48,
  },
  mite: {
    id: "mite",
    name: "Hovermite",
    blurb: "A disc with a mean little gun. Ignores the road.",
    hp: 96,
    dmg: 40,
    speed: 2.5,
    bp: 15,
    shield: 0,
    rangeStop: 7.4,
    atkCd: 1.35,
    flying: true,
    explode: false,
    shotSpeed: 9,
    radius: 0.42,
  },
  gnasher: {
    id: "gnasher",
    name: "Gnasher",
    blurb: "A heavy ape frame. Slow, rude, hard to tip over.",
    hp: 820,
    dmg: 95,
    speed: 1.12,
    bp: 28,
    shield: 80,
    rangeStop: 0,
    atkCd: 1.25,
    flying: false,
    explode: false,
    radius: 0.78,
  },
  knox: {
    id: "knox",
    name: "Knox",
    blurb: "Boss. A red bruiser that shocks the wall from down the road.",
    hp: 26,
    dmg: 120,
    speed: 1.05,
    bp: 40,
    shield: 400,
    rangeStop: 0,
    atkCd: 1.4,
    flying: false,
    explode: false,
    boss: true,
    shock: 3.2,
    shockDmg: 70,
    radius: 1.1,
  },
  icewidow: {
    id: "icewidow",
    name: "Icewidow",
    blurb: "Boss. A glacier spider that sheds skitters as it walks.",
    hp: 30,
    dmg: 100,
    speed: 1.15,
    bp: 40,
    shield: 0,
    rangeStop: 0,
    atkCd: 1.05,
    flying: false,
    explode: false,
    boss: true,
    summon: 7.5,
    radius: 1.25,
  },
  vault: {
    id: "vault",
    name: "Vault",
    blurb: "Boss. A leaper. The landing is the weapon.",
    hp: 28,
    dmg: 140,
    speed: 1.35,
    bp: 40,
    shield: 150,
    rangeStop: 0,
    atkCd: 1.2,
    flying: false,
    explode: false,
    boss: true,
    leap: 4.2,
    radius: 1.05,
  },
};

export const BASE_WALL = 4800;
export const MEAT_COST = 5;
export const MEAT_CAP = 50;
export const MEAT_MS = 6 * 60 * 1000;
export const MAX_LEVEL = 20;
export const BP_MAX = 210;

const GOLD_PRESET = [0, 500, 900, 1500, 2200, 3000, 3500, 4500, 5500, 7000, 8200, 9500, 11500, 13500, 15000];

export function goldCost(level) {
  if (level < GOLD_PRESET.length) return GOLD_PRESET[level];
  return Math.round(15000 * Math.pow(1.12, level - 14));
}

export function fragCost(level) {
  return level >= 3 ? level : 0;
}

export function gearCost(level) {
  return 250 + level * 200;
}

export function victoryGold(stage, hard, stars) {
  const base = 140 + stage * 48;
  const diff = hard ? 1.65 : 1;
  const star = 1 + 0.28 * (stars - 1);
  return Math.round(base * diff * star);
}

export const SHOP = [
  { id: "vip-month", name: "Signal VIP · 30 days", price: "₱299", detail: "Double clear rewards and unlock 3× battle speed.", tag: "VIP" },
  { id: "vip-life", name: "Lifetime Keep Key", price: "₱1,490", detail: "Permanent VIP, 5× battle speed, and a monthly gem crate.", tag: "VIP" },
  { id: "no-ads", name: "Quiet Frequency", price: "₱249", detail: "Removes simulated signals. 2× speed stays free.", tag: "Pass" },
  { id: "starter", name: "Gate Crate", price: "₱299", detail: "8,000 gold, 200 gems, 30 meat.", tag: "Bundle" },
  { id: "captain", name: "Watch Bundle", price: "₱499", detail: "Chip pack, 4,000 gold, and 80 gems.", tag: "Bundle" },
  { id: "mega", name: "Depot Bundle", price: "₱999", detail: "20,000 gold, 400 gems, 40 meat, fragment chest.", tag: "Bundle" },
  { id: "ultimate", name: "Bastion Ultimate", price: "₱2,490", detail: "The large crate: gold, gems, meat, and a VIP month.", tag: "Bundle" },
];

export const CHEST_TIERS = [
  { stars: 10, gold: 1800, gems: 40, frags: 12 },
  { stars: 20, gold: 3600, gems: 70, frags: 18 },
  { stars: 30, gold: 7000, gems: 110, frags: 28 },
];

export function pathPoints(regionId) {
  if (regionId === "glacier") {
    return [
      { x: 1.6, z: -23.5 },
      { x: 1.7, z: -16 },
      { x: 0.2, z: -9 },
      { x: -1.3, z: -2.5 },
      { x: 0.2, z: 4 },
      { x: 0.15, z: 7.4 },
    ];
  }
  if (regionId === "canyon") {
    return [
      { x: -0.8, z: -23.5 },
      { x: 1.3, z: -16.5 },
      { x: -1.6, z: -9.5 },
      { x: 0.9, z: -2 },
      { x: -0.2, z: 4.2 },
      { x: 0, z: 7.4 },
    ];
  }
  return [
    { x: 0.4, z: -23.5 },
    { x: -1.5, z: -15 },
    { x: 1.15, z: -7.5 },
    { x: -0.6, z: -1 },
    { x: 0.35, z: 4.5 },
    { x: 0.1, z: 7.4 },
  ];
}

export function resamplePath(points, step = 0.8) {
  const out = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.round(len / step));
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  let dist = 0;
  const withD = [{ ...out[0], d: 0 }];
  for (let i = 1; i < out.length; i++) {
    dist += Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z);
    withD.push({ ...out[i], d: dist });
  }
  return { pts: withD, length: dist };
}

export function pointAt(path, dist, lane = 0) {
  const pts = path.pts;
  const d = Math.max(0, Math.min(path.length, dist));
  let i = 1;
  while (i < pts.length - 1 && pts[i].d < d) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const span = b.d - a.d || 1;
  const t = (d - a.d) / span;
  const x = a.x + (b.x - a.x) * t;
  const z = a.z + (b.z - a.z) * t;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len;
  const pz = dx / len;
  return { x: x + px * lane * 0.92, z: z + pz * lane * 0.92, dx: dx / len, dz: dz / len };
}

export const PODS = [-3.55, -1.75, 1.75, 3.55];
export const WALL_Z = 7.15;
