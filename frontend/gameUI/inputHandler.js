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
import { INPUT, DEV_KEYWORDS, UI } from "../gameConfig.js";

let keyword = "";
let newSkin = null;

export function initializeInputHandlers() {
  window.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("click", handleCanvasClick);
}

export function handleKeyDown(event) {
  const code = event.code;
  const key = event.key;

  if (key === INPUT.KEYS.SPEEDUP) {
    handleSpeedup();
  } else if (code === INPUT.CODES.FEED) {
    handleFeed();
  } else if (code === INPUT.CODES.MASK_SKIN && newSkin) {
    handleMasking(newSkin);
  } else if (code === INPUT.CODES.RESET_SKIN && newSkin) {
    handleSkinReset();
  } else if (code === INPUT.CODES.CLEAR_KEYWORD) {
    keyword = "";
  } else if (code === INPUT.CODES.TOGGLE_PAUSE) {
    gameState.inactive = !gameState.inactive;
    gameState.inactive ? showExitPopup() : hideExitPopup();
  } else if (code === INPUT.CODES.SPLIT) {
    handleSplit();
  } else {
    keyword += key;
    if (keyword === DEV_KEYWORDS.EXPORT_JSON) {
      logger.exportAsJSON();
    } else if (keyword === DEV_KEYWORDS.EXPORT_TEXT) {
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
        copyToClipboard(() => player.name, UI.MESSAGES.SKIN_COPY_TOOLTIP)();
        return;
      }
    }
  }
}
