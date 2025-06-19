import "./gameUI/mobileControls.js";
import { canvas, resizeCanvas } from "./gameUI/gameRenderer.js";
import { handleKeyDown, handleMouseMove } from "./gameUI/inputHandler.js";
import {
  cancelExitBtn,
  confirmExitBtn,
  hideExitPopup,
} from "./gameUI/uiController.js";
import {
  connectToServer,
  sendLeaveMessage,
} from "./gameFunctionality/communication.js";
import {
  gameLoop,
  handleGameState,
} from "./gameFunctionality/eventHandlers.js";

const init = () => {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  canvas.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("keydown", handleKeyDown);
  cancelExitBtn.addEventListener("click", hideExitPopup);
  confirmExitBtn.addEventListener("click", exitGame);

  connectToServer();
  requestAnimationFrame(gameLoop);
};

const exitGame = () => {
  localStorage.setItem("lastScore", Math.floor(handleGameState.playerScore));
  sendLeaveMessage();
  window.location.href = "web.html";
};

init();
