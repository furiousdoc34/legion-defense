# Nova Bastion

A portrait sci-fi wall-defense game. Captains and defenders hold a keep at the bottom of the road while the Hollow Circuit walks up it. Original names, characters, and art.

Play it on a phone, in portrait. On a computer the game sits in a phone-width column.

## Play

After this repo is on `main` and GitHub Pages is set to **GitHub Actions**, the game is at:

**https://furiousdoc34.github.io/legion-defense/**

One-time setup if the site is not live yet: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow in `.github/workflows/pages.yml` publishes the site on every push to `main`.

Locally:

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/` and use a narrow window (around 390×844) or a phone.

## What you can do

- 30 stages across three regions: Metro Scar, Glacier Line, and Rust Canyon. Each stage is 20 waves, with a boss on wave 20.
- Battle Points pause the fight for one of three skill cards. Cards deploy a defender or trap, or upgrade damage, cooldown, hits, size, projectiles, ricochet, penetration, fire again, or beam duration.
- Six elements with their own shots: Steel, Laser, Electric, Fire, Cryo, Bio. Crits show as larger orange numbers.
- Armory levels for weapons, defenders, and traps, paid in gold and fragments.
- Three captains (Nyx Vale, Marshal Holt, Dr. Ivo Quill). Each has a weapon, innate bonuses, and six gear slots with chips that change defender stats. Switching captains shows the stat change before you confirm.
- Gold, gems, and meat. Meat regenerates. Supply drops, diner rations, and coin crates are free. Star chests sit on the campaign map. Fast Raid repeats a clear. Normal and Hard are separate.
- Shop prices are shown in PHP and marked coming soon. Nothing is charged.
- Battle speed is 1× and 2× for free. 3× and 5× wait on the Keep Key.
- Progress is stored in `localStorage` on this device.

Stars: 1 for a clear, 2 if the wall is still at 50% or more, 3 if it is never hit.

## Tests

```bash
node tests/sim.test.mjs
```

The simulation checks that a stage can be won, that a wall with no damage falls, and that swapping captains changes weapon and defender numbers.

## Wrapping later

The site is a static PWA-style page (`manifest.webmanifest`, portrait, `viewport-fit=cover`) so it can sit in WKWebView or Capacitor for an App Store build. There is no service worker, so updates are not stuck in a cache.

Russo One and Nunito are bundled under the SIL Open Font License. Three.js is bundled under the MIT license.
