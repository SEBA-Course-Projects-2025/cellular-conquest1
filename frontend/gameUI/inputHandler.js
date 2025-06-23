import {
  handleFeed,
  handleInput,
  handleSpeedup,
  handleSplit,
} from "../gameFunctionality/eventHandlers.js";
import { canvas } from "./gameRenderer.js";
import gameState from "../gameFunctionality/gameState.js";
import { hideExitPopup, showExitPopup } from "./uiController.js";
import logger from "../gameFunctionality/logger.js";

let keyword = "";

export function initializeInputHandlers() {
  window.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("mousemove", handleMouseMove);
}

export function handleKeyDown(event) {
  if (event.key === "Shift") {
    handleSpeedup();
  } else if (event.key === "w") {
    handleFeed();
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
