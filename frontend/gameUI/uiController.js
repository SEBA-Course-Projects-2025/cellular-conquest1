import gameState from "../gameFunctionality/gameState.js";

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

// execCommand is deprecated, but is used as last resort in case http prohibits copying to clipboard
// execCommand is deprecated, but is used as last resort in case http prohibits copying to clipboard
function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
    console.log("Fallback: Copy successful");
  } catch (err) {
    console.error("Fallback: Copy failed", err);
  }

  document.body.removeChild(textarea);
}
document.getElementById("roomId").addEventListener("click", () => {
  const text = gameState.roomId;

  if (navigator.clipboard && location.protocol === "https:") {
    navigator.clipboard
      .writeText(text)
      .then(showCopyPopup)
      .catch((err) => {
        console.error("Clipboard error:", err);
        fallbackCopy(text);
        showCopyPopup();
      });
  } else {
    fallbackCopy(text);
    showCopyPopup();
  }
});
function showCopyPopup() {
  const popup = document.getElementById("copyPopup");
  popup.classList.add("visible");
  setTimeout(() => popup.classList.remove("visible"), 2000);
}

export function initializeRoomIdCopy() {
  document.getElementById("roomId").addEventListener("click", () => {
    const text = gameState.roomId;
    if (navigator.clipboard && location.protocol === "https:") {
      navigator.clipboard
        .writeText(text)
        .then(showCopyPopup)
        .catch((err) => {
          console.error("Clipboard error:", err);
          fallbackCopy(text);
          showCopyPopup();
        });
    } else {
      fallbackCopy(text);
      showCopyPopup();
    }
  });
}

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
