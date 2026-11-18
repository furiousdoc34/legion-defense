import { Battle, starsFor } from "./battle.js";
import {
  CAPTAINS,
  CAPTAIN_BY_ID,
  CHEST_TIERS,
  CHIP_BY_ID,
  DEFENDERS,
  ELEMENTS,
  ENEMIES,
  MEAT_COST,
  REGIONS,
  SHOP,
  SLOTS,
  SLOT_LABEL,
  STAGE_NAMES,
  TRAPS,
  UNIT_BY_ID,
  WEAPONS,
  fragCost,
  gearCost,
  goldCost,
  stageInfo,
  victoryGold,
} from "./data.js";
import {
  actStars,
  claimChest,
  claimCrate,
  claimDiner,
  claimSignal,
  claimSupply,
  cleared,
  fastRaid,
  grantDefeat,
  grantVictory,
  load,
  meatLabel,
  persist,
  readyIn,
  regen,
  setCaptain,
  setWeapon,
  socketChip,
  spendMeat,
  starsOf,
  totalStars,
  unlocked,
  upgradeGear,
  upgradeUnit,
} from "./save.js";
import { buildLoadout, diffLoadouts, powerScore, previewUnit, statRows, wallMax } from "./stats.js";
import { blip, boom, setMuted, shootSound, uiTick } from "./audio.js";

let save;
let scene;
let portraits;
let screen = "hub";
let battle = null;
let ended = false;
let armoryTab = "weapon";
let armoryId = "volley";
let gearSlot = "head";
let pickedCard = 0;
let signalUsed = false;
let lastShot = 0;

const $ = (id) => document.getElementById(id);

export function boot(opts) {
  scene = opts.scene;
  portraits = opts.portraits;
  save = load();
  regen(save);
  setMuted(!!save.muted);
  $("app").addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);
  show("hub");
  if (!save.seenIntro) openWelcome();
  else if (readyIn(save, "supplyAt", 4 * 3600 * 1000) === 0) openSupply();
  return { frame };
}

export function frame(dt) {
  if (screen === "battle" && battle) {
    const spd = battle.offer || battle.paused || battle.result ? 0 : liveSpeed();
    const events = battle.update(dt * spd);
    scene.sync(battle);
    scene.consume(events);
    for (const ev of events) {
      if (ev.t === "dmg") floatDmg(ev);
      if (ev.t === "wall") flashWall();
      if (ev.t === "boom") boom();
      if (ev.t === "shot") {
        const now = performance.now();
        if (now - lastShot > 70) {
          shootSound(ev.element);
          lastShot = now;
        }
      }
      if (ev.t === "wave") banner(ev.wave === 20 ? "BOSS WAVE" : `Wave ${ev.wave}`);
    }
    if (!ended && battle.result === "win") finish(true);
    else if (!ended && battle.result === "lose") finish(false);
    else if (battle.offer && !$("skill-modal")) openSkills();
    syncHud();
  }
  scene.update(dt);
}

function liveSpeed() {
  const s = save.speed || 1;
  if ((s === 3 || s === 5) && !save.vip) return 2;
  return s;
}

function show(next) {
  screen = next;
  closeModal();
  $("hud").innerHTML = "";
  $("fx").innerHTML = "";
  if (next === "hub") renderHub();
  else if (next === "map") renderMap();
  else if (next === "armory") renderArmory();
  else if (next === "captain") renderCaptain();
  else if (next === "shop") renderShop();
  else $("ui").innerHTML = "";
}

function onClick(e) {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const id = el.dataset.id;
  if (act === "goto") return show(id);
  if (act === "diff") {
    save.hard = id === "1";
    persist(save);
    uiTick();
    return renderHub();
  }
  if (act === "fight") return startBattle();
  if (act === "raid") return doRaid();
  if (act === "stage") {
    const n = Number(id);
    if (!unlocked(save, n)) return toast("Clear the previous stage first.");
    save.stage = n;
    persist(save);
    return show("hub");
  }
  if (act === "tab") {
    armoryTab = id;
    const list = id === "weapon" ? WEAPONS : id === "defender" ? DEFENDERS : TRAPS;
    armoryId = list[0].id;
    return renderArmory();
  }
  if (act === "unit") {
    armoryId = id;
    return renderArmory();
  }
  if (act === "upgrade") return doUpgrade(id);
  if (act === "gear") {
    gearSlot = id;
    return renderCaptain();
  }
  if (act === "gear-up") return doGear();
  if (act === "chip") return doChip(id);
  if (act === "unstow") return doChip("");
  if (act === "weapon") {
    setWeapon(save, save.captainId, id);
    uiTick();
    return renderCaptain();
  }
  if (act === "ask-cap") return askCaptain(id);
  if (act === "confirm-cap") {
    setCaptain(save, id);
    closeModal();
    toast(`${CAPTAIN_BY_ID[id].name} takes the wall.`);
    return renderCaptain();
  }
  if (act === "speed") return cycleSpeed();
  if (act === "pause") return openPause();
  if (act === "resume") return closeModal();
  if (act === "retreat") return confirmRetreat();
  if (act === "do-retreat") {
    battle = null;
    closeModal();
    return show("hub");
  }
  if (act === "mute") {
    save.muted = !save.muted;
    setMuted(save.muted);
    persist(save);
    return openPause();
  }
  if (act === "pick") {
    pickedCard = Number(id);
    return paintSkillPick();
  }
  if (act === "confirm-skill") return confirmSkill();
  if (act === "reroll-dice") return reroll("dice");
  if (act === "reroll-gem") return reroll("gem");
  if (act === "signal") return playSignal();
  if (act === "claim-win") {
    closeModal();
    battle = null;
    return show("hub");
  }
  if (act === "retry") {
    closeModal();
    battle = null;
    return startBattle();
  }
  if (act === "supply") return openSupply();
  if (act === "take-supply") return take("supply");
  if (act === "diner") return take("diner");
  if (act === "crate") return take("crate");
  if (act === "shop-free") return take("signal");
  if (act === "buy") return toast("Coming soon — payments are not wired yet, so nothing was charged.");
  if (act === "chest") return takeChest(el.dataset.actIndex, Number(el.dataset.tier));
  if (act === "close") return closeModal();
  if (act === "welcome") return takeWelcome();
  if (act === "reset") return confirmReset();
  if (act === "do-reset") {
    localStorage.removeItem("nova-bastion-v1");
    save = load();
    closeModal();
    return show("hub");
  }
  if (act === "help") return openHelp();
}

function onKey(e) {
  if (screen !== "battle" || !battle) return;
  if (e.key === " " || e.key === "Escape") {
    if (battle.offer) return;
    if ($("modal").classList.contains("open")) closeModal();
    else openPause();
  }
  if (battle.offer && ["1", "2", "3"].includes(e.key)) {
    pickedCard = Number(e.key) - 1;
    confirmSkill();
  }
}

function startBattle() {
  if (screen === "battle") return;
  if (!unlocked(save, save.stage)) return toast("Clear the previous stage first.");
  regen(save);
  if (save.meat < MEAT_COST) return toast("Not enough meat. The diner restocks often.");
  if (!spendMeat(save)) return toast("Not enough meat.");
  const loadout = buildLoadout(save);
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  battle = new Battle({ stage: save.stage, hard: !!save.hard, loadout, seed });
  ended = false;
  signalUsed = false;
  pickedCard = 0;
  scene.beginBattle(battle.info.region.id, save.captainId);
  screen = "battle";
  $("ui").innerHTML = "";
  closeModal();
  renderHud();
  banner(`${battle.info.region.name} · ${battle.info.name}`);
  blip(520, 0.08, "square", 0.04);
}

function doRaid() {
  const res = fastRaid(save, save.stage, !!save.hard);
  if (!res.ok) return toast(res.reason);
  toast(`Fast Raid paid ${nfmt(res.gold)} gold.`);
  renderHub();
}

function renderHub() {
  const info = stageInfo(save.stage);
  scene.showPreview(info.region.id, save.captainId);
  const stars = starsOf(save, save.stage, !!save.hard);
  const done = cleared(save, save.stage, !!save.hard);
  const cap = CAPTAIN_BY_ID[save.captainId];
  $("ui").innerHTML = `
    <header class="top">
      <div class="brand">NOVA BASTION</div>
      ${resources()}
    </header>
    <div class="freebies">
      ${freeBtn("supply", "Supply", readyIn(save, "supplyAt", 4 * 3600 * 1000))}
      ${freeBtn("diner", "Diner", readyIn(save, "dinerAt", 30 * 60 * 1000))}
      ${freeBtn("crate", "Coins", readyIn(save, "crateAt", 20 * 60 * 1000))}
      <button class="mini" data-act="help">?</button>
    </div>
    <div class="spacer"></div>
    <section class="stage-card">
      <div class="actline"><span>${info.region.act}</span><span>${info.region.name}</span></div>
      <div class="who">${face(save.captainId, "tiny")} <b>${cap.name}</b> on watch</div>
      <h1>${esc(info.name)}</h1>
      <div class="stage-no">Stage ${save.stage} / 30</div>
      ${starRow(stars)}
      <div class="rewards">
        <span>1★ ${nfmt(victoryGold(save.stage, save.hard, 1))}</span>
        <span>2★ ${nfmt(victoryGold(save.stage, save.hard, 2))}</span>
        <span>3★ ${nfmt(victoryGold(save.stage, save.hard, 3))}</span>
      </div>
      <div class="diff">
        <button data-act="diff" data-id="0" class="${save.hard ? "" : "on"}">Normal</button>
        <button data-act="diff" data-id="1" class="${save.hard ? "on" : ""}">Hard</button>
      </div>
      <div class="fightrow">
        <button class="btn gold" data-act="raid" ${done ? "" : "disabled"}>Fast Raid<span>${MEAT_COST} meat</span></button>
        <button class="btn green" data-act="fight">Battle<span>${MEAT_COST} meat</span></button>
      </div>
    </section>
    ${nav("hub")}`;
}

function renderMap() {
  scene.showPreview(stageInfo(save.stage).region.id, save.captainId);
  const blocks = REGIONS.map((r) => {
    const stars = actStars(save, r.actIndex);
    const chests = CHEST_TIERS.map((t) => {
      const key = `${r.actIndex}-${t.stars}`;
      const open = !!save.chests[key];
      const ready = stars >= t.stars && !open;
      return `<button class="chest ${open ? "open" : ""} ${ready ? "ready" : ""}" data-act="chest" data-act-index="${r.actIndex}" data-tier="${t.stars}" ${open ? "disabled" : ""}>${t.stars}★</button>`;
    }).join("");
    const stages = Array.from({ length: 10 }, (_, i) => {
      const n = r.actIndex * 10 + i + 1;
      const st = Math.max(starsOf(save, n, false), starsOf(save, n, true));
      const lock = !unlocked(save, n);
      return `<button class="node ${n === save.stage ? "sel" : ""} ${lock ? "lock" : ""}" data-act="stage" data-id="${n}">
        <b>${n}</b><small>${esc(STAGE_NAMES[n - 1])}</small>${starRow(st, true)}
      </button>`;
    }).join("");
    return `<section class="act"><header><h2>${r.act} · ${r.name}</h2><span>${stars}/30</span></header><div class="chests">${chests}</div><div class="nodes">${stages}</div></section>`;
  }).join("");
  $("ui").innerHTML = `<div class="sheet full"><header class="top"><div class="brand">CAMPAIGN</div>${resources()}</header><div class="scroll">${blocks}<p class="fine">Stars count on Normal. Hard pays more gold when you raid or clear.</p></div>${nav("map")}</div>`;
}

function renderArmory() {
  const list = armoryTab === "weapon" ? WEAPONS : armoryTab === "defender" ? DEFENDERS : TRAPS;
  if (!list.some((u) => u.id === armoryId)) armoryId = list[0].id;
  const stats = previewUnit(save, armoryId);
  const cost = goldCost(stats.level);
  const fr = fragCost(stats.level);
  const maxed = stats.level >= 20;
  const grid = list.map((u) => {
    const s = previewUnit(save, u.id);
    return `<button class="card ${u.id === armoryId ? "sel" : ""}" data-act="unit" data-id="${u.id}">${face(u.id)}<b>${esc(u.name)}</b><small>Lv.${s.level} · ${ELEMENTS[u.element].name}</small></button>`;
  }).join("");
  const rows = statRows(stats).map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");
  const notes = stats.notes.slice(0, 4).map((n) => `<li>${esc(n.label)} · ${esc(n.text)}</li>`).join("");
  $("ui").innerHTML = `<div class="sheet full">
    <header class="top"><div class="brand">ARMORY</div>${resources()}</header>
    <div class="tabs">
      <button data-act="tab" data-id="weapon" class="${armoryTab === "weapon" ? "on" : ""}">Weapons</button>
      <button data-act="tab" data-id="defender" class="${armoryTab === "defender" ? "on" : ""}">Defenders</button>
      <button data-act="tab" data-id="trap" class="${armoryTab === "trap" ? "on" : ""}">Traps</button>
    </div>
    <div class="arm">
      <div class="grid">${grid}</div>
      <div class="detail">
        <div class="detail-h">${face(armoryId, "mid")}<div><h2>${esc(stats.name)}</h2><p>${esc(stats.blurb)}</p><em class="el el-${stats.element}">${ELEMENTS[stats.element].name} · Lv.${stats.level}</em></div></div>
        <div class="stats">${rows}</div>
        <ul class="notes">${notes}</ul>
        <div class="have">Fragments ${save.frags[armoryId] || 0}${fr ? ` · need ${fr}` : ""}</div>
        <button class="btn green wide" data-act="upgrade" data-id="${armoryId}" ${maxed ? "disabled" : ""}>${maxed ? "Max level" : `Upgrade · ${nfmt(cost)} gold${fr ? ` · ${fr} frag` : ""}`}</button>
      </div>
    </div>
    ${nav("armory")}
  </div>`;
}

function renderCaptain() {
  const cap = CAPTAIN_BY_ID[save.captainId];
  const gear = save.gear[save.captainId];
  const piece = gear[gearSlot];
  const chip = piece.chip ? CHIP_BY_ID[piece.chip] : null;
  const wall = wallMax(save);
  const weapon = save.weaponByCaptain[save.captainId];
  const innate = [
    `Crit chance ${Math.round(cap.crit * 100)}% on every shot from the wall`,
    ...Object.entries(cap.elementBonus).map(([el, v]) => `${capNameEl(el)} damage +${Math.round(v * 100)}%`),
    ...Object.entries(cap.elementFlats).flatMap(([el, flats]) => Object.entries(flats).map(([stat, v]) => `${capNameEl(el)} ${stat} +${v}`)),
    cap.wallHp ? `Wall HP +${cap.wallHp}` : null,
    cap.cooldownMult !== 1 ? `Signature weapon cooldown ${Math.round((cap.cooldownMult - 1) * 100)}%` : null,
  ].filter(Boolean);
  const chips = SLOTS.map((s) => gear[s].chip).filter(Boolean).map((id) => CHIP_BY_ID[id].text);
  const compare = ["lumen", "scrap", "coil", "colt"].map((id) => {
    const bits = CAPTAINS.map((c) => {
      const copy = structuredClone(save);
      copy.captainId = c.id;
      const dmg = previewUnit(copy, id).damage;
      const mark = c.id === save.captainId ? "now" : "";
      const short = c.id === "quill" ? "Quill" : c.name.split(" ")[0];
      return `<span class="${mark}">${short} ${dmg}</span>`;
    }).join("");
    return `<div class="cmp"><b>${esc(UNIT_BY_ID[id].name)}</b>${bits}</div>`;
  }).join("");
  const othersWall = CAPTAINS.map((c) => {
    const copy = structuredClone(save);
    copy.captainId = c.id;
    const short = c.id === "quill" ? "Quill" : c.name.split(" ")[0];
    return `<span class="${c.id === save.captainId ? "now" : ""}">${short} ${wallMax(copy).hp}</span>`;
  }).join("");
  $("ui").innerHTML = `<div class="sheet full">
    <header class="top"><div class="brand">CAPTAINS</div>${resources()}</header>
    <div class="scroll cap-scroll">
      <div class="cap-pick">
        ${CAPTAINS.map((c) => `<button class="capbtn ${c.id === save.captainId ? "on" : ""}" data-act="ask-cap" data-id="${c.id}">${face(c.id)}<b>${esc(c.name)}</b><small>${esc(c.title)}</small></button>`).join("")}
      </div>
      <div class="hero">
        ${face(save.captainId, "hero")}
        <div>
          <h2>${esc(cap.name)}</h2>
          <p>${esc(cap.blurb)}</p>
          <div class="power">Power ${nfmt(powerScore(save))}</div>
          <div class="wallline">Wall ${nfmt(wall.hp)} HP</div>
        </div>
      </div>
      <h3>Attributes</h3>
      <ul class="attr">${innate.map((t) => `<li>${esc(t)}</li>`).join("")}${chips.map((t) => `<li class="chip">${esc(t)}</li>`).join("")}</ul>
      <h3>How this watch changes the line</h3>
      <div class="cmps">${compare}<div class="cmp"><b>Wall HP</b>${othersWall}</div></div>
      <h3>Weapon</h3>
      <div class="weapons">${WEAPONS.map((w) => `<button class="wpn ${w.id === weapon ? "on" : ""}" data-act="weapon" data-id="${w.id}">${face(w.id)}<small>${esc(w.name)}</small></button>`).join("")}</div>
      <h3>Gear</h3>
      <div class="gears">
        ${SLOTS.map((s) => {
          const ch = gear[s].chip ? CHIP_BY_ID[gear[s].chip] : null;
          return `<button class="gear ${s === gearSlot ? "on" : ""}" data-act="gear" data-id="${s}"><small>${SLOT_LABEL[s]} · Lv.${gear[s].level}</small><b>${ch ? esc(ch.name) : "Empty"}</b></button>`;
        }).join("")}
      </div>
      <div class="detail slim">
        <p>${chip ? esc(chip.text) : "This slot has no chip. Socket one from the bag."}</p>
        <div class="row">
          <button class="btn gold" data-act="gear-up">Upgrade ${SLOT_LABEL[gearSlot]} · ${nfmt(gearCost(piece.level))} gold</button>
          ${chip ? `<button class="btn ghost" data-act="unstow">Stow chip</button>` : ""}
        </div>
      </div>
      <h3>Chip bag</h3>
      <div class="bag">${save.bag.map((cid) => {
        const c = CHIP_BY_ID[cid];
        return `<button class="chipbtn" data-act="chip" data-id="${cid}"><b>${esc(c.name)}</b><small>${esc(c.text)}</small></button>`;
      }).join("") || "<p class='fine'>Bag empty.</p>"}</div>
    </div>
    ${nav("captain")}
  </div>`;
}

function renderShop() {
  const items = SHOP.map((s) => `<article class="offer"><div class="tag">${esc(s.tag)}</div><h3>${esc(s.name)}</h3><p>${esc(s.detail)}</p><button class="btn gold" data-act="buy" data-id="${s.id}">${esc(s.price)} · Coming soon</button></article>`).join("");
  $("ui").innerHTML = `<div class="sheet full">
    <header class="top"><div class="brand">SUPPLY</div>${resources()}</header>
    <div class="scroll">
      <article class="offer free">
        <div class="tag">Free</div>
        <h3>Signal pack</h3>
        <p>A simulated sponsor signal. 15 gems and fragments. No real ads, no charge.</p>
        <button class="btn green" data-act="shop-free">Claim free pack</button>
      </article>
      ${items}
      <p class="fine">Prices are shown in Philippine pesos for the future shop. Nothing here spends real money yet. 2× battle speed is free. 3× and 5× unlock with a Keep Key.</p>
      <button class="btn ghost" data-act="reset">Reset this device</button>
    </div>
    ${nav("shop")}
  </div>`;
}

function renderHud() {
  const info = battle.info;
  $("hud").innerHTML = `
    <div class="bhud">
      <button class="speed" data-act="speed" id="speed-btn">${liveSpeed()}×</button>
      <div class="bmid">
        <div class="breg">${esc(info.region.name)}</div>
        <div class="bwave">Wave <b id="wave-num">0</b>/20</div>
        <div class="btimer" id="timer">00:00</div>
      </div>
      <button class="pause" data-act="pause">II</button>
      <div class="bp-wrap"><span>Battle Points</span><div class="bp"><i id="bp-fill"></i></div></div>
      <div class="banner" id="banner"></div>
      <div class="skills" id="skill-pips"></div>
      <div class="hp-wrap"><span class="heart">♥</span><div class="hp"><i id="hp-fill"></i></div><b id="hp-num">0</b></div>
    </div>`;
}

function syncHud() {
  if (!battle || !$("hp-fill")) return;
  const pct = Math.max(0, battle.hp / battle.maxHp);
  $("hp-fill").style.width = `${pct * 100}%`;
  $("hp-num").textContent = Math.ceil(battle.hp);
  $("bp-fill").style.width = `${Math.min(100, (battle.bp / battle.bpMax) * 100)}%`;
  $("wave-num").textContent = String(battle.wave);
  $("timer").textContent = clock(battle.time);
  const btn = $("speed-btn");
  if (btn) btn.textContent = `${liveSpeed()}×`;
  const pips = $("skill-pips");
  if (pips) {
    pips.innerHTML = battle.skills.slice(-6).map((s) => `<i title="${esc(s)}"></i>`).join("");
  }
}

function openSkills() {
  pickedCard = 0;
  const cards = battle.offer.map((c, i) => cardHtml(c, i)).join("");
  $("modal").innerHTML = `<div class="skill-modal" id="skill-modal">
    <h2>Select skill</h2>
    <div class="cards" id="skill-cards">${cards}</div>
    <div class="rerolls">
      <button class="btn gold" data-act="reroll-dice">Refresh<span id="dice-n">${battle.dice} dice</span></button>
      <button class="btn ghost" data-act="reroll-gem">Reroll<span>12 gems</span></button>
      <button class="btn ghost" data-act="signal" ${signalUsed ? "disabled" : ""}>Signal<span>+2 dice</span></button>
    </div>
    <button class="btn green battlego" data-act="confirm-skill">Battle</button>
  </div>`;
  $("modal").classList.add("open");
  paintSkillPick();
}

function cardHtml(c, i) {
  const img = c.kind === "wall" ? face("plate") : face(c.unitId);
  return `<button class="skill ${c.kind === "upgrade" ? "up" : ""}" data-act="pick" data-id="${i}" id="card-${i}">
    <em>${c.kind === "deploy" ? "Deploy" : c.kind === "wall" ? "Keep" : "Upgrade"}</em>
    ${img}<b>${esc(c.title)}</b><strong>${esc(c.detail)}</strong>
  </button>`;
}

function paintSkillPick() {
  for (let i = 0; i < 3; i++) {
    const node = $(`card-${i}`);
    if (node) node.classList.toggle("sel", i === pickedCard);
  }
}

function confirmSkill() {
  if (!battle?.offer) return;
  battle.pick(pickedCard);
  uiTick();
  closeModal();
}

function reroll(kind) {
  if (!battle?.offer) return;
  if (kind === "gem") {
    if (save.gems < 12) return toast("Not enough gems.");
    save.gems -= 12;
    persist(save);
    battle.reroll("gem");
  } else {
    const res = battle.reroll("dice");
    if (!res.ok) return toast(res.reason);
  }
  openSkills();
}

function playSignal() {
  if (signalUsed) return;
  signalUsed = true;
  $("modal").insertAdjacentHTML("beforeend", `<div class="signal-mask" id="sig">Receiving a supply signal…</div>`);
  setTimeout(() => {
    if (!battle) return;
    battle.reroll("grant");
    $("sig")?.remove();
    toast("Signal clear. +2 refresh dice.");
    if (battle.offer) openSkills();
  }, 1600);
}

function openPause() {
  if (!battle) return;
  battle.paused = true;
  const types = battle.enemyTypes().map((id) => {
    const e = ENEMIES[id];
    return `<div class="intel">${face(id, "tiny")}<div><b>${esc(e.name)}</b><small>${esc(e.blurb)}</small></div></div>`;
  }).join("");
  const skills = battle.skills.length ? battle.skills.map((s) => `<li>${esc(s)}</li>`).join("") : "<li>No battle bonuses yet.</li>";
  $("modal").innerHTML = `<div class="panel pause-panel">
    <h2>Hold</h2>
    <p>${esc(battle.info.name)} · ${battle.hard ? "Hard" : "Normal"} · ${liveSpeed()}×</p>
    <h3>On the road</h3>
    <div class="intels">${types}</div>
    <h3>Battle bonuses</h3>
    <ul class="attr">${skills}</ul>
    <div class="row">
      <button class="btn green" data-act="resume">Resume</button>
      <button class="btn ghost" data-act="mute">${save.muted ? "Sound on" : "Mute"}</button>
      <button class="btn gold" data-act="retreat">Retreat</button>
    </div>
  </div>`;
  $("modal").classList.add("open");
}

function confirmRetreat() {
  $("modal").innerHTML = `<div class="panel"><h2>Retreat?</h2><p>The meat is already spent. Stars stay where they were.</p><div class="row"><button class="btn gold" data-act="do-retreat">Leave</button><button class="btn ghost" data-act="resume">Stay</button></div></div>`;
}

function finish(win) {
  if (ended) return;
  ended = true;
  battle.paused = false;
  const stars = win ? starsFor(battle.hp, battle.maxHp) : 0;
  const reward = win
    ? grantVictory(save, { stage: battle.stage, hard: battle.hard, stars })
    : grantDefeat(save, { stage: battle.stage, hard: battle.hard });
  const pct = Math.round((battle.hp / battle.maxHp) * 100);
  const fragMap = new Map();
  for (const f of reward.frags || []) fragMap.set(f.id, (fragMap.get(f.id) || 0) + f.count);
  const fragLine = [...fragMap].map(([id, count]) => `${UNIT_BY_ID[id].name} +${count}`).join(", ");
  $("modal").innerHTML = `<div class="panel result ${win ? "win" : "lose"}">
    <h2>${win ? "VICTORY" : "DEFEAT"}</h2>
    ${win ? starRow(stars) : `<p class="broke">The keep was breached on wave ${battle.wave}.</p>`}
    <p>${win ? `Wall held at ${pct}%. ${stars === 3 ? "Untouched." : stars === 2 ? "Over half the wall still stands." : "A clear, with scars."}` : "Consolation crate from the depot."}</p>
    <div class="loot">
      <div><b>${nfmt(reward.gold)}</b><small>gold</small></div>
      <div><b>${reward.gems || 0}</b><small>gems</small></div>
      <div><b>${(reward.frags || []).reduce((s, f) => s + f.count, 0)}</b><small>fragments</small></div>
    </div>
    <p class="fine">${esc(fragLine)}</p>
    <div class="row">
      <button class="btn green" data-act="claim-win">${win ? "Claim" : "Back"}</button>
      <button class="btn gold" data-act="retry">Retry · ${MEAT_COST}</button>
    </div>
  </div>`;
  $("modal").classList.add("open");
  blip(win ? 660 : 140, 0.15, "square", 0.05);
}

function askCaptain(id) {
  if (id === save.captainId) return renderCaptain();
  const before = buildLoadout(save);
  const copy = structuredClone(save);
  copy.captainId = id;
  const after = buildLoadout(copy);
  const rows = diffLoadouts(before, after)
    .map((row) => ({ ...row, score: Math.abs((row.changes.find((c) => c.key === "damage")?.to || 0) - (row.changes.find((c) => c.key === "damage")?.from || 0)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const lines = rows.map((row) => {
    const d = row.changes.find((c) => c.key === "damage") || row.changes[0];
    return `<li><b>${esc(row.name)}</b> ${d.key} ${d.from} → ${d.to}</li>`;
  }).join("");
  const w0 = UNIT_BY_ID[save.weaponByCaptain[save.captainId]].name;
  const w1 = UNIT_BY_ID[save.weaponByCaptain[id]].name;
  $("modal").innerHTML = `<div class="panel">
    <h2>Switch to ${esc(CAPTAIN_BY_ID[id].name)}?</h2>
    <p>Weapon ${esc(w0)} → ${esc(w1)}</p>
    <p>Wall ${nfmt(before.wall)} → ${nfmt(after.wall)} HP</p>
    <ul class="attr">${lines}</ul>
    <div class="row">
      <button class="btn green" data-act="confirm-cap" data-id="${id}">Switch</button>
      <button class="btn ghost" data-act="close">Stay</button>
    </div>
  </div>`;
  $("modal").classList.add("open");
}

function doUpgrade(id) {
  const res = upgradeUnit(save, id);
  if (!res.ok) return toast(res.reason);
  uiTick();
  toast(`${UNIT_BY_ID[id].name} is now Lv.${res.level}.`);
  renderArmory();
}

function doGear() {
  const res = upgradeGear(save, save.captainId, gearSlot);
  if (!res.ok) return toast(res.reason);
  uiTick();
  renderCaptain();
}

function doChip(id) {
  const res = socketChip(save, save.captainId, gearSlot, id || null);
  if (!res.ok) return toast(res.reason);
  uiTick();
  renderCaptain();
}

function takeChest(actIndex, tier) {
  const res = claimChest(save, Number(actIndex), tier);
  if (!res.ok) return toast(res.reason);
  toast(`Chest opened: ${nfmt(res.gold)} gold, ${res.gems} gems.`);
  renderMap();
}

function take(kind) {
  const fn = { supply: claimSupply, diner: claimDiner, crate: claimCrate, signal: claimSignal }[kind];
  const res = fn(save);
  if (!res.ok) return toast(res.reason);
  closeModal();
  toast(rewardText(res));
  if (screen !== "battle") show(screen);
}

function takeWelcome() {
  save.seenIntro = true;
  const res = claimSupply(save);
  save.seenIntro = true;
  persist(save);
  closeModal();
  toast(res.ok ? rewardText(res) : "Welcome to the wall.");
  renderHub();
}

function openWelcome() {
  $("modal").innerHTML = `<div class="panel welcome">
    <h2>NOVA BASTION</h2>
    <p>The Hollow Circuit is walking the road. Your captain fires alone until a skill card calls someone else onto the wall. Fill the battle bar, pick one card, and keep the keep's HP above zero.</p>
    <p>A supply drop is waiting: gold, meat, and gems. 2× speed is free.</p>
    <button class="btn green wide" data-act="welcome">Take the drop</button>
  </div>`;
  $("modal").classList.add("open");
}

function openSupply() {
  $("modal").innerHTML = `<div class="panel"><h2>Supply drop</h2><p>1,200 gold, 8 meat, 5 gems. It comes back every few hours.</p><button class="btn green wide" data-act="take-supply">Take it</button></div>`;
  $("modal").classList.add("open");
}

function openHelp() {
  $("modal").innerHTML = `<div class="panel"><h2>How the wall works</h2>
    <ul class="attr">
      <li>20 waves. Wave 20 is a boss. Lose the wall, lose the stage.</li>
      <li>1 star for a clear, 2 if at least half the wall remains, 3 if it is never hit.</li>
      <li>Battle Points pause the fight and offer 3 cards: a new defender, a trap, or an upgrade.</li>
      <li>Armory levels and captain chips stick. Battle cards do not.</li>
      <li>Switch captains to move weapon, crit, element bonuses, and the six chips.</li>
      <li>Fast Raid repeats a clear for meat. Hard pays more and hits harder.</li>
    </ul>
    <button class="btn green wide" data-act="close">Got it</button></div>`;
  $("modal").classList.add("open");
}

function confirmReset() {
  $("modal").innerHTML = `<div class="panel"><h2>Reset progress?</h2><p>Gold, stars, levels, and captains on this device go back to the first drop.</p><div class="row"><button class="btn gold" data-act="do-reset">Reset</button><button class="btn ghost" data-act="close">Cancel</button></div></div>`;
  $("modal").classList.add("open");
}

function cycleSpeed() {
  const order = [1, 2, 3, 5];
  const idx = Math.max(0, order.indexOf(save.speed || 1));
  const next = order[(idx + 1) % order.length];
  if (next > 2) {
    toast("3× and 5× ride with a Keep Key. Payments are coming soon. 2× stays free.");
    save.speed = 2;
  } else save.speed = next;
  persist(save);
  syncHud();
  if (battle?.paused) openPause();
}

function floatDmg(ev) {
  const p = scene.project(ev.x, ev.y, ev.z);
  const el = document.createElement("div");
  el.className = `dmg ${ev.crit ? "crit" : ""} el-${ev.element || "steel"}`;
  el.textContent = ev.crit ? `${ev.amount}!` : String(ev.amount);
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y}px`;
  $("fx").appendChild(el);
  while ($("fx").children.length > 36) $("fx").firstChild.remove();
  setTimeout(() => el.remove(), 700);
}

function flashWall() {
  $("app").classList.add("hit");
  setTimeout(() => $("app").classList.remove("hit"), 160);
}

function banner(text) {
  const el = $("banner");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}

function closeModal() {
  if (battle) battle.paused = false;
  $("modal").classList.remove("open");
  $("modal").innerHTML = "";
}

function toast(text) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  $("toast").appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function resources() {
  regen(save);
  return `<div class="res"><span class="pill meat">${meatLabel(save)}</span><span class="pill gem">${save.gems}</span><span class="pill gold">${nfmt(save.gold)}</span></div>`;
}

function nav(active) {
  const items = [["shop", "Shop"], ["captain", "Captain"], ["hub", "Battle"], ["armory", "Armory"], ["map", "Map"]];
  return `<nav class="nav">${items.map(([id, label]) => `<button data-act="goto" data-id="${id}" class="${active === id ? "on" : ""}">${label}</button>`).join("")}</nav>`;
}

function starRow(n, mini = false) {
  return `<div class="stars ${mini ? "mini" : ""}">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}">★</i>`).join("")}</div>`;
}

function face(id, cls = "") {
  const src = portraits[id] || "";
  return `<img class="face ${cls}" alt="" src="${src}" />`;
}

function freeBtn(act, label, left) {
  const ready = left <= 0;
  const m = Math.ceil(left / 60000);
  return `<button class="mini ${ready ? "ready" : ""}" data-act="${act}">${label}<small>${ready ? "Ready" : `${m}m`}</small></button>`;
}

function rewardText(res) {
  const bits = [];
  if (res.gold) bits.push(`${nfmt(res.gold)} gold`);
  if (res.meat) bits.push(`${res.meat} meat`);
  if (res.gems) bits.push(`${res.gems} gems`);
  if (res.frags) bits.push("fragments");
  return `${res.title || "Reward"}: ${bits.join(", ")}`;
}

function capNameEl(el) {
  return ELEMENTS[el]?.name || el;
}

function clock(t) {
  const s = Math.floor(t);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function nfmt(n) {
  return Math.round(n).toLocaleString("en-US");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
