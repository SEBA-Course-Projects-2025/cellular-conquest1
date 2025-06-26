import gameState from "../gameFunctionality/gameState.js";
import { copyToClipboard } from "../gameUtils/copyToClipboard.js";

export const playerNameElement = document.getElementById("playerName");
export const playerScoreElement = document.getElementById("playerScore");
export const leaderboardList = document.getElementById("leaderboardList");
export const cancelExitBtn = document.getElementById("cancelExit");
export const confirmExitBtn = document.getElementById("confirmExit");

const exitPopup = document.getElementById("exitPopup");
const deathPopup = document.getElementById("deathPopup");
const finalScoreSpan = document.getElementById("finalScore");

let hideTimeout;

export function showGameError(message) {
  clearTimeout(hideTimeout);
  const popup = document.getElementById("errorPopup");
  popup.classList.add("visible");
  popup.innerText = message;
  setTimeout(() => {
    popup.classList.remove("visible");
  }, 2000);
}

export function updateSpeedBar(speedBars) {
  document.getElementById("speedBarFill").style.width =
    (speedBars / 5) * 100 + "%";
}

document.getElementById("roomId").addEventListener(
  "click",
  copyToClipboard(() => gameState.roomId)
);

export function showDeathPopup(score) {
  finalScoreSpan.textContent = score;
  deathPopup.classList.remove("hidden");
  gameState.inactive = true;
}

export const hideExitPopup = () => {
  exitPopup.classList.add("hidden");
  gameState.inactive = false;
};

export function showExitPopup() {
  exitPopup.classList.remove("hidden");
}
