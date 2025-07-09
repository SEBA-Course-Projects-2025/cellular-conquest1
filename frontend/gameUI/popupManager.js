const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

const rulesPopup = document.getElementById("rulesPopup");
const rulesBtn = document.getElementById("rulesBtn");
const closeRulesBtn = document.getElementById("closeRules");

rulesBtn.addEventListener("click", () => togglePopup(rulesPopup));
closeRulesBtn.addEventListener("click", () => hidePopup(rulesPopup));
rulesPopup.addEventListener("click", (e) => {
  if (e.target.classList.contains("blur")) {
    hidePopup(rulesPopup);
  }
});

const playerInfo = document.getElementById("playerInfo");
const playerInfoBtn = document.getElementById("playerInfoBtn");

playerInfoBtn.addEventListener("click", () => togglePopup(playerInfo));
playerInfo.addEventListener("click", (e) => {
  if (e.target === playerInfo) {
    hidePopup(playerInfo);
  }
});

const leaderboard = document.getElementById("leaderboard");
const leaderboardBtn = document.getElementById("leaderboardBtn");

leaderboardBtn.addEventListener("click", () => togglePopup(leaderboard));
leaderboard.addEventListener("click", (e) => {
  if (e.target === leaderboard) {
    hidePopup(leaderboard);
  }
});

function togglePopup(popup) {
  const isCurrentlyVisible = !popup.classList.contains("hidden");
  if (isTouch) hideAllPopups();
  popup.classList.toggle("hidden", isCurrentlyVisible);
}

function hidePopup(popup) {
  popup.classList.add("hidden");
}

function hideAllPopups() {
  [playerInfo, leaderboard, rulesPopup].forEach((p) =>
    p.classList.add("hidden")
  );
}
