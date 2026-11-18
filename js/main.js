import { renderPortraits } from "./portraits.js";
import { GameScene } from "./scene.js";
import { boot } from "./ui.js";

const canvas = document.getElementById("gl");
const portraits = renderPortraits();
const scene = new GameScene(canvas);
const game = boot({ scene, portraits });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.12, (now - last) / 1000);
  last = now;
  game.frame(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener("resize", () => scene.resize());
if (window.visualViewport) window.visualViewport.addEventListener("resize", () => scene.resize());
document.getElementById("boot")?.remove();
