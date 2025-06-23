import gameState from "../gameFunctionality/gameState.js";
import { canvas } from "./gameRenderer.js";

// zoomOutThreshold: minimum size to enable manual scroll zoom
// zoomStep: how much to zoom per scroll/auto-adjust step
const zoomSettings = {
  zoomOutThreshold: 100,
  zoomStep: 0.1,
  minScale: 1,
  maxScale: 2,
};

let manualZoomApplied = false;

const clampScale = (scale) =>
  Math.max(zoomSettings.minScale, Math.min(zoomSettings.maxScale, scale));

const getTotalRadius = () => {
  const player = gameState.players.find((p) => p.id === gameState.playerId);
  return player?.cells.reduce((sum, cell) => sum + (cell.radius || 1), 0) || 0;
};

export const handleZoomWheel = (event) => {
  event.preventDefault();
  const totalRadius = getTotalRadius();

  if (totalRadius < zoomSettings.zoomOutThreshold) return;

  const zoomFactor =
    event.deltaY > 0 ? 1 - zoomSettings.zoomStep : 1 + zoomSettings.zoomStep;
  gameState.camera.scale = clampScale(gameState.camera.scale * zoomFactor);
  manualZoomApplied = true;
};

canvas.addEventListener("wheel", handleZoomWheel);

export const updateCamera = () => {
  const player = gameState.players.find((p) => p.id === gameState.playerId);
  if (!player?.cells.length) return;

  let totalWeight = 0,
    weightedX = 0,
    weightedY = 0;

  for (const cell of player.cells) {
    const weight = cell.radius || 1;
    weightedX += cell.x * weight;
    weightedY += cell.y * weight;
    totalWeight += weight;
  }

  gameState.camera.x = weightedX / totalWeight;
  gameState.camera.y = weightedY / totalWeight;

  if (!manualZoomApplied || totalWeight < zoomSettings.zoomOutThreshold) {
    if (totalWeight < zoomSettings.zoomOutThreshold) manualZoomApplied = false;

    const targetScale = clampScale(300 / totalWeight);
    const diff = targetScale - gameState.camera.scale;

    gameState.camera.scale =
      Math.abs(diff) <= zoomSettings.zoomStep
        ? targetScale
        : gameState.camera.scale + Math.sign(diff) * zoomSettings.zoomStep;
  }
};
