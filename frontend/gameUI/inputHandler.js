import {
  handleFeed,
  handleInput,
  handleMasking,
  handleSkinReset,
  handleSpeedup,
  handleSplit,
} from "../gameFunctionality/eventHandlers.js";
import { canvas } from "./gameRenderer.js";
import gameState from "../gameFunctionality/gameState.js";
import { hideExitPopup, showExitPopup } from "./uiController.js";
import logger from "../gameFunctionality/logger.js";
import { copyToClipboard } from "../gameUtils/copyToClipboard.js";

let keyword = "";
let newSkin = null;
export function initializeInputHandlers() {
  window.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("click", handleCanvasClick);
}

export function handleKeyDown(event) {
  if (event.key === "Shift") {
    handleSpeedup();
  } else if (event.key === "w") {
    handleFeed();
  } else if (event.key === "a") {
    if (newSkin) handleMasking(newSkin);
  } else if (event.key === "r") {
    if (newSkin) handleSkinReset();
  } else if (event.key === "Backspace") {
    keyword = "";
  } else if (event.key === "Escape") {
    gameState.inactive = !gameState.inactive;
    if (gameState.inactive) {
      showExitPopup();
    } else {
      hideExitPopup();
    }
  } else if (event.key === " ") {
    handleSplit();
  } else {
    keyword += event.key;
    if (keyword === "logs1") {
      logger.exportAsJSON();
    } else if (keyword === "logs2") {
      logger.exportAsText();
    }
  }
}

export const handleMouseMove = (event) => {
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const worldX =
    gameState.camera.x + (screenX - canvas.width / 2) / gameState.camera.scale;
  const worldY =
    gameState.camera.y + (screenY - canvas.height / 2) / gameState.camera.scale;
  handleInput({ x: worldX, y: worldY });
};

export function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;

  const worldX =
    gameState.camera.x + (screenX - canvas.width / 2) / gameState.camera.scale;
  const worldY =
    gameState.camera.y + (screenY - canvas.height / 2) / gameState.camera.scale;

  for (const player of gameState.players) {
    for (const cell of player.cells ?? []) {
      const dx = cell.x - worldX;
      const dy = cell.y - worldY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < cell.radius) {
        newSkin = gameState.playersSkins.find((p) => p.id === player.id)?.image;
        copyToClipboard(
          () => player.name,
          "Click 'A' to apply the new skin!"
        )();
        return;
      }
    }
  }
}
