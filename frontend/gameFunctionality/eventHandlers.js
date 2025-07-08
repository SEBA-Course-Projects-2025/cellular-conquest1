import { render } from "../gameUI/gameRenderer.js";
import {
  enemiesDefeated,
  leaderboardBtn,
  leaderboardList,
  playerInfoBtn,
  playerNameElement,
  playerScoreElement,
  showDeathPopup,
  updateSpeedBar,
} from "../gameUI/uiController.js";
import { updateCamera } from "../gameUI/camera.js";
import {
  sendFeedMessage,
  sendInput,
  sendSpeedupMessage,
  sendSplitMessage,
} from "./communication.js";
import gameState from "./gameState.js";
import { copyToClipboard } from "../gameUtils/copyToClipboard.js";
import {
  LOCAL_STORAGE_KEYS,
  LEADERBOARD,
  SPEEDUP_CONFIG,
  UI,
} from "../gameConfig.js";
const { ELEMENT_IDS, MESSAGES } = UI;

export const gameLoop = () => {
  const dt = gameState.dt;

  render(dt);

  requestAnimationFrame(gameLoop);
};

export const handlePlayerData = (data) => {
  gameState.playerId = data.id;
  gameState.playerName = data.nickname;
  gameState.roomId = data.roomId;
  if (data.currentImages !== undefined)
    gameState.playersSkins = data.currentImages;
  gameState.updatePlayerSkin(
    gameState.playerId,
    localStorage.getItem(LOCAL_STORAGE_KEYS.CUSTOM_SKIN)
  );
  if (data.width !== undefined) gameState.worldSize.width = data.width;
  if (data.height !== undefined) gameState.worldSize.height = data.height;

  playerNameElement.textContent = gameState.playerName;

  console.log(`Joined as ${gameState.playerName} (ID: ${gameState.playerId})`);
};

export const handleGameState = (data) => {
  gameState.players = data.visiblePlayers;
  gameState.food = data.visibleFood;
  gameState.bushes = data.visibleBushes || [];
  gameState.dt = data.timestamp - gameState.lastTimestamp;
  gameState.lastTimestamp = data.timestamp;
  gameState.bushIds = data.playerInfo.bushIds || [];

  const player = gameState.players.find((p) => p.id === gameState.playerId);
  if (player) {
    gameState.playerScore = player.score;
    const roundedScore = Math.floor(gameState.playerScore);
    playerScoreElement.textContent = `Score: ${roundedScore}`;
    playerInfoBtn.textContent = `${roundedScore}`;
    updateSpeedBar(player.abilities?.speed ?? 0);
    gameState.speedupAvailable = !!player.abilities?.speed;

    const cellsCount = player.cells.length;
    if (cellsCount > 0) {
      updateCamera();
    }
  }
};

export const handleLeaderboard = (data) => {
  leaderboardList.innerHTML = "";
  const rank = data.personal.rank;
  const defeated = data.personal.killed ?? 0;

  enemiesDefeated.textContent = `Defeated: ${defeated}`;

  const sortedPlayers = data.topPlayers;
  const maxListLen = gameState.isTouch
    ? LEADERBOARD.MAX_LENGTH_TOUCH
    : LEADERBOARD.MAX_LENGTH_DESKTOP;
  leaderboardBtn.textContent = `#${rank}`;

  for (let i = 0; i < Math.min(maxListLen, sortedPlayers.length); i++) {
    const player = sortedPlayers[i];
    const li = document.createElement("li");
    li.textContent = `${player.nickname}: ${Math.floor(player.score)}`;

    if (i === rank - 1) {
      li.classList.add("special");
    }

    leaderboardList.appendChild(li);
  }

  if (rank > maxListLen) {
    const li = document.createElement("li");
    li.textContent = `${gameState.playerName}: ${Math.floor(
      gameState.playerScore
    )}`;
    li.classList.add("special");
    li.value = rank;
    leaderboardList.appendChild(li);
  }
};

export const handleDeath = (data) => {
  gameState.playerScore = data.score;
  console.log(`${gameState.playerName} has died.`);

  localStorage.setItem(
    LOCAL_STORAGE_KEYS.LAST_SCORE,
    Math.floor(gameState.playerScore)
  );

  showDeathPopup(data.score);

  const inactivityDelay = ELEMENT_IDS.DEATH_POPUP.INACTIVITY_DELAY_MS;
  const countdownSeconds = ELEMENT_IDS.DEATH_POPUP.COUNTDOWN_SECONDS;
  const redirectUrl = ELEMENT_IDS.DEATH_POPUP.REDIRECT_URL;

  let inactivityTimer = setTimeout(() => {
    const notice = document.getElementById("autoCloseNotice");
    const countdown = document.getElementById("countdown");
    let timeLeft = countdownSeconds;

    notice.classList.remove("hidden");

    const interval = setInterval(() => {
      timeLeft--;
      countdown.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(interval);
        location.href = redirectUrl;
      }
    }, 1000);

    document.querySelectorAll("#deathPopup button").forEach((btn) =>
      btn.addEventListener("click", () => {
        clearTimeout(inactivityTimer);
        clearInterval(interval);
        notice.classList.add("hidden");
      })
    );
  }, inactivityDelay);
};

export const handleSpeedup = () => {
  if (!gameState.speedupActive && gameState.speedupAvailable) {
    sendSpeedupMessage();
    gameState.speedupActive = true;
    setTimeout(() => {
      gameState.speedupActive = false;
    }, SPEEDUP_CONFIG.DURATION_MS);
  }
};

export const handleFeed = () => {
  sendFeedMessage();
};

export const handleSplit = () => {
  sendSplitMessage();
};

export const handleInput = (input) => {
  sendInput(input);
};

export const handleMasking = (newImage) => {
  gameState.updatePlayerSkin(gameState.playerId, newImage);
  copyToClipboard(() => newImage, MESSAGES.RESET_SKIN_HINT)();
};

export const handleSkinReset = () => {
  const customSkin = localStorage.getItem(LOCAL_STORAGE_KEYS.CUSTOM_SKIN);
  if (customSkin) {
    gameState.updatePlayerSkin(gameState.playerId, customSkin);
  }
};
