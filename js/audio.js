let ctx;
let muted = false;

function ac() {
  if (!ctx) ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setMuted(v) {
  muted = v;
}

export function blip(freq = 440, dur = 0.06, type = "square", gain = 0.04) {
  if (muted) return;
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch {
    /* autoplay */
  }
}

export function shootSound(element) {
  const map = { laser: 740, electric: 180, fire: 120, cryo: 520, bio: 240, steel: 360 };
  blip(map[element] || 400, 0.05, element === "electric" ? "sawtooth" : "square", 0.03);
}

export function boom() {
  blip(90, 0.12, "sawtooth", 0.05);
}

export function uiTick() {
  blip(620, 0.04, "square", 0.03);
}
