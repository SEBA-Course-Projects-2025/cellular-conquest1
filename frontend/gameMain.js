import { connectToServer, sendLeaveMessage } from "./gameCommunication.js";
import {
  cancelExitBtn,
  canvas,
  confirmExitBtn,
  handleKeyDown,
  handleMouseMove,
  hideExitPopup,
  resizeCanvas,
} from "./gameUI.js";
import gameState from "./gameState.js";
import { gameLoop } from "./gameLogic.js";
import "./gameMobileUI.js";

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
  localStorage.setItem("lastScore", Math.floor(gameState.playerScore));
  sendLeaveMessage();
  window.location.href = "web.html";
};

init();
