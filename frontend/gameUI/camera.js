import gameState from "../gameFunctionality/gameState.js";
import { canvas } from "./gameRenderer.js";

const zoomSettings = {
  minRadius: 20,
  maxRadius: 500,
  minCoverage: 1 / 9,
  maxCoverage: 3 / 4,
  zoomStep: 0.1,
  manualZoomThreshold: 100,
  minManualScale: 1,
  maxManualScale: 4,
  smoothness: 0.1,
};

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
    zoomSettings.minRadius,
    zoomSettings.maxRadius,
    r
  );
  const coverage = lerp(
    zoomSettings.minCoverage,
    zoomSettings.maxCoverage,
    normRadius
  );
  return (screenSize * coverage) / (2 * r);
};

export const handleZoomWheel = (e) => {
  const radius = getTotalRadius();
  if (radius < zoomSettings.manualZoomThreshold) return;

  e.preventDefault();
  const factor =
    e.deltaY > 0 ? 1 - zoomSettings.zoomStep : 1 + zoomSettings.zoomStep;
  manualScale = Math.min(
    zoomSettings.maxManualScale,
    Math.max(zoomSettings.minManualScale, manualScale * factor)
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
    (scale - gameState.camera.scale) * zoomSettings.smoothness;

  if (r < zoomSettings.minRadius * 0.5) {
    manualZoom = false;
    manualScale = 1;
  }
};
