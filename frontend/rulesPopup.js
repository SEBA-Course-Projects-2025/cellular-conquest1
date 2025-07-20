const rulesPopup = document.getElementById("rulesPopup");
const rulesBtn = document.getElementById("rulesBtn");
const closeRulesBtn = document.getElementById("closeRules");

rulesBtn.addEventListener("click", showRulesPopup);
closeRulesBtn.addEventListener("click", hideRulesPopup);

rulesPopup.addEventListener("click", (e) => {
  if (e.target === rulesPopup || e.target.classList.contains("blur")) {
    hideRulesPopup();
  }
});

function showRulesPopup() {
  rulesPopup.classList.remove("hidden");
}

function hideRulesPopup() {
  rulesPopup.classList.add("hidden");
}
