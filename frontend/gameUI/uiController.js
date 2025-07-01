import gameState from "../gameFunctionality/gameState.js";
import { copyToClipboard } from "../gameUtils/copyToClipboard.js";
import {
  SPEED_BAR_CONFIG,
  ERROR_POPUP_CONFIG,
  UI_MESSAGES,
  ELEMENT_IDS,
} from "../gameConfig/uiConfig.js";

export const playerNameElement = document.getElementById(
  ELEMENT_IDS.PLAYER_NAME
);
export const playerScoreElement = document.getElementById(
  ELEMENT_IDS.PLAYER_SCORE
);
export const leaderboardList = document.getElementById(ELEMENT_IDS.LEADERBOARD);
export const cancelExitBtn = document.getElementById(ELEMENT_IDS.CANCEL_EXIT);
export const confirmExitBtn = document.getElementById(ELEMENT_IDS.CONFIRM_EXIT);

const exitPopup = document.getElementById(ELEMENT_IDS.EXIT_POPUP);
const deathPopup = document.getElementById(ELEMENT_IDS.DEATH_POPUP);
const finalScoreSpan = document.getElementById(ELEMENT_IDS.FINAL_SCORE);
const rulesPopup = document.getElementById("rulesPopup");
const rulesBtn = document.getElementById("rulesBtn");
const closeRulesBtn = document.getElementById("closeRules");

let hideTimeout;

rulesBtn.addEventListener("click", showRulesPopup);
closeRulesBtn.addEventListener("click", hideRulesPopup);

rulesPopup.addEventListener("click", (e) => {
  if (e.target === rulesPopup || e.target.classList.contains("blur")) {
    hideRulesPopup();
  }
});

export function showGameError(message) {
  clearTimeout(hideTimeout);
  const popup = document.getElementById(ELEMENT_IDS.ERROR_POPUP);
  popup.classList.add(ERROR_POPUP_CONFIG.CLASS_VISIBLE);
  popup.innerText = message;
  setTimeout(() => {
    popup.classList.remove(ERROR_POPUP_CONFIG.CLASS_VISIBLE);
  }, ERROR_POPUP_CONFIG.TIMEOUT_MS);
}

export function updateSpeedBar(speedBars) {
  document.getElementById(ELEMENT_IDS.SPEED_BAR).style.width =
    (speedBars / SPEED_BAR_CONFIG.MAX_SEGMENTS) * 100 + "%";
}

document.getElementById(ELEMENT_IDS.ROOM_ID).addEventListener(
  "click",
  copyToClipboard(() => gameState.roomId, UI_MESSAGES.ROOM_ID_COPIED)
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

export function showRulesPopup() {
  rulesPopup.classList.remove("hidden");
}

export function hideRulesPopup() {
  rulesPopup.classList.add("hidden");
}
