import gameState from "../gameFunctionality/gameState.js";
import { copyToClipboard } from "../gameUtils/copyToClipboard.js";
import { UI } from "../gameConfig.js";
const { ELEMENT_IDS, ERROR_POPUP, MESSAGES, SPEED_BAR } = UI;

export const playerNameElement = document.getElementById(
  ELEMENT_IDS.PLAYER_NAME
);
export const playerScoreElement = document.getElementById(
  ELEMENT_IDS.PLAYER_SCORE
);
export const playerInfoBtn = document.getElementById("playerInfoBtn");
export const leaderboardBtn = document.getElementById("leaderboardBtn");
export const enemiesDefeated = document.getElementById(ELEMENT_IDS.DEFEATED);
export const leaderboardList = document.getElementById(ELEMENT_IDS.LEADERBOARD);
export const cancelExitBtn = document.getElementById(ELEMENT_IDS.CANCEL_EXIT);
export const confirmExitBtn = document.getElementById(ELEMENT_IDS.CONFIRM_EXIT);

const exitPopup = document.getElementById(ELEMENT_IDS.EXIT_POPUP);
const deathPopup = document.getElementById(ELEMENT_IDS.DEATH_POPUP);
const finalScoreSpan = document.getElementById(ELEMENT_IDS.FINAL_SCORE);

let hideTimeout;

export function showGameError(message) {
  clearTimeout(hideTimeout);
  const popup = document.getElementById(ELEMENT_IDS.ERROR_POPUP);
  popup.classList.add(ERROR_POPUP.CLASS_VISIBLE);
  popup.innerText = message;
  setTimeout(() => {
    popup.classList.remove(ERROR_POPUP.CLASS_VISIBLE);
  }, ERROR_POPUP.TIMEOUT_MS);
}

export function updateSpeedBar(speedBars) {
  document.getElementById(ELEMENT_IDS.SPEED_BAR).style.width =
    (speedBars / SPEED_BAR.MAX_SEGMENTS) * 100 + "%";
}

document.getElementById(ELEMENT_IDS.ROOM_ID).addEventListener(
  "click",
  copyToClipboard(() => gameState.roomId, MESSAGES.ROOM_ID_COPIED)
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
