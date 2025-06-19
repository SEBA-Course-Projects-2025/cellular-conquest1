import gameState from "./gameState.js";
import {
  leaderboardList,
  playerNameElement,
  playerScoreElement,
  showDeathPopup,
  render,
  updateSpeedBar,
} from "./gameUI.js";

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
    localStorage.getItem("customSkin")
  );
  if (data.width !== undefined) gameState.worldSize.width = data.width;
  if (data.height !== undefined) gameState.worldSize.height = data.height;

  playerNameElement.textContent = gameState.playerName;

  console.log(`Joined as ${gameState.playerName} (ID: ${gameState.playerId})`);
};

export const handleGameState = (data) => {
  gameState.players = data.visiblePlayers;
  gameState.food = data.visibleFood;
  gameState.dt = data.timestamp - gameState.lastTimestamp;
  gameState.lastTimestamp = data.timestamp;

  const player = gameState.players.find((p) => p.id === gameState.playerId);
  if (player) {
    gameState.playerScore = player.score;
    playerScoreElement.textContent = `Score: ${Math.floor(
      gameState.playerScore
    )}`;
    updateSpeedBar(player.abilities?.speed ?? 0);
    gameState.speedupAvailable = !!player.abilities?.speed;

    const cellsCount = player.cells.length;
    if (cellsCount > 0) {
      gameState.camera.x =
        player.cells.reduce((a, c) => a + c.x, 0) / cellsCount;
      gameState.camera.y =
        player.cells.reduce((a, c) => a + c.y, 0) / cellsCount;

      gameState.camera.scale = Math.max(
        0.5,
        Math.min(1, 300 / gameState.playerScore)
      );
    }
  }
};

export const handleLeaderboard = (data) => {
  leaderboardList.innerHTML = "";

  const sortedPlayers = data.topPlayers;

  for (let i = 0; i < Math.min(10, sortedPlayers.length); i++) {
    const player = sortedPlayers[i];
    const li = document.createElement("li");
    li.textContent = `${player.nickname}: ${Math.floor(player.score)}`;

    if (i === data.personal.rank - 1) {
      li.classList.add("special");
    }

    leaderboardList.appendChild(li);
  }

  if (data.personal.rank > sortedPlayers.length) {
    const li = document.createElement("li");
    li.textContent = `${gameState.playerName}: ${Math.floor(
      gameState.playerScore
    )}`;
    li.classList.add("special");
    li.value = data.personal.rank;
    leaderboardList.appendChild(li);
  }
};

export const handleDeath = (data) => {
  gameState.playerScore = data.score;
  console.log(`${gameState.playerName} has died.`);

  localStorage.setItem("lastScore", Math.floor(gameState.playerScore));

  const canvas = document.getElementById("gameCanvas");
  if (canvas) {
    canvas.classList.add("blured");
  }

  showDeathPopup(data.score);
  const inactivityDelay = 30000;
  const countdownSeconds = 10;

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
        location.href = "web.html";
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
