import gameState from "../gameFunctionality/gameState.js";
import { canvas } from "./gameRenderer.js";
import { ZOOM_CONFIG } from "../gameConfig.js";

let manualZoom = false;
let manualScale = 1;

const lerpClamp = (min, max, val) =>
  Math.min(1, Math.max(0, (val - min) / (max - min)));

const lerp = (a, b, t) => a + t * (b - a);

const getTotalRadius = () =>
  gameState.players
    .find((p) => p.id === gameState.playerId)
    ?.cells.reduce((sum, c) => sum + (c.radius || 1), 0) || 0;

const getTargetScale = (r) => {
  const screenSize = Math.min(canvas.width, canvas.height);
  const normRadius = lerpClamp(
    ZOOM_CONFIG.MIN_RADIUS,
    ZOOM_CONFIG.MAX_RADIUS,
    r
  );
  const coverage = lerp(
    ZOOM_CONFIG.MIN_COVERAGE,
    ZOOM_CONFIG.MAX_COVERAGE,
    normRadius
  );
  return (screenSize * coverage) / (2 * r);
};

export const handleZoomWheel = (e) => {
  const radius = getTotalRadius();
  if (radius < ZOOM_CONFIG.MANUAL_ZOOM_THRESHOLD) return;

  e.preventDefault();
  const factor =
    e.deltaY > 0 ? 1 - ZOOM_CONFIG.ZOOM_STEP : 1 + ZOOM_CONFIG.ZOOM_STEP;
  manualScale = Math.min(
    ZOOM_CONFIG.MAX_MANUAL_SCALE,
    Math.max(ZOOM_CONFIG.MIN_MANUAL_SCALE, manualScale * factor)
  );
  manualZoom = true;
};

canvas.addEventListener("wheel", handleZoomWheel);

export const updateCamera = () => {
  const player = gameState.players.find((p) => p.id === gameState.playerId);
  if (!player?.cells.length) return;

  let x = 0,
    y = 0,
    weight = 0;
  for (const c of player.cells) {
    const r = c.radius || 1;
    x += c.x * r;
    y += c.y * r;
    weight += r;
  }

  gameState.camera.x = x / weight;
  gameState.camera.y = y / weight;

  const r = getTotalRadius();
  let scale = getTargetScale(r);
  if (manualZoom) scale *= manualScale;

  gameState.camera.scale +=
    (scale - gameState.camera.scale) * ZOOM_CONFIG.SMOOTHNESS;

  if (r < ZOOM_CONFIG.MIN_RADIUS * 0.5) {
    manualZoom = false;
    manualScale = 1;
  }
};
