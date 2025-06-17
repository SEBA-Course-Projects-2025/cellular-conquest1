import {
  sendInput,
  sendSplitMessage,
  sendSpeedup,
  sendFeedMessage,
} from "./gameCommunication.js";
import gameState from "./gameState.js";

export const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
export const playerNameElement = document.getElementById("playerName");
export const playerScoreElement = document.getElementById("playerScore");
export const leaderboardList = document.getElementById("leaderboardList");

const exitPopup = document.getElementById("exitPopup");
export const cancelExitBtn = document.getElementById("cancelExit");
export const confirmExitBtn = document.getElementById("confirmExit");

const deathPopup = document.getElementById("deathPopup");
const finalScoreSpan = document.getElementById("finalScore");
const skinImageCache = new Map();

function getSkinImage(playerId) {
  const skinEntry = gameState.playersSkins.find((p) => p.id === playerId);
  if (!skinEntry) return null;
  let base64;
  if (typeof skinEntry.skin === "number") {
    const available = gameState.availableSkins.find(
      (s) => s.id === skinEntry.skin
    );
    base64 = available?.skin;
  } else {
    base64 = skinEntry.skin;
  }

  if (!base64) return null;

  if (skinImageCache.has(base64)) return skinImageCache.get(base64);

  const img = new Image();
  img.src = base64;
  skinImageCache.set(base64, img);
  return img;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Shift" && !gameState.speedupActive) {
    sendSpeedup();
    gameState.speedupActive = true;
    setTimeout(() => {
      gameState.speedupActive = false;
    }, 1000);
  } else if (e.key == "w") {
    sendFeedMessage();
  }
});

export function updateSpeedBar(speedBars) {
  document.getElementById("speedBarFill").style.width =
    (speedBars / 5) * 100 + "%";
}
document.getElementById("roomId").addEventListener("click", () => {
  navigator.clipboard.writeText(gameState.roomId).then(() => {
    const popup = document.getElementById("copyPopup");
    popup.style.top = "1rem";

    setTimeout(() => {
      popup.style.top = "-4rem";
    }, 2000);
  });
});

let currentScale = gameState.camera.scale;
let lastRenderTime = performance.now();
const lerp = (start, end, t) => start + (end - start) * t;

export const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

export const render = () => {
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();

  ctx.translate(canvas.width / 2, canvas.height / 2);
  const now = performance.now();
  const deltaTime = (now - lastRenderTime) / 1000;
  lastRenderTime = now;

  const smoothingSpeed = 5;
  if (Math.abs(currentScale - gameState.camera.scale) > 0.001) {
    currentScale = lerp(
      currentScale,
      gameState.camera.scale,
      1 - Math.exp(-smoothingSpeed * deltaTime)
    );
  }

  ctx.scale(currentScale, currentScale);
  ctx.translate(-gameState.camera.x, -gameState.camera.y);

  drawGrid();

  for (const food of gameState.food) {
    drawCircle(food.x, food.y, food.radius, food.color, food.visibility ?? 100);
  }

  for (const player of gameState.players) {
    for (const cell of player.cells) {
      const skinImg = getSkinImage(player.id);
      if (skinImg?.complete && skinImg.naturalWidth) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          skinImg,
          cell.x - cell.radius,
          cell.y - cell.radius,
          cell.radius * 2,
          cell.radius * 2
        );
        ctx.restore();
      } else {
        drawWavyBlob(
          cell.x,
          cell.y,
          cell.radius,
          cell.color,
          Date.now(),
          player.id,
          gameState.speedupActive && player.id === gameState.playerId
        );
      }

      drawText(player.nickname, cell.x, cell.y, cell.radius, "white");
    }
  }

  ctx.restore();
};

const drawCircle = (x, y, radius, fillColor, visibility = 100, borderColor) => {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(visibility, 100)) / 100;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  if (borderColor) ctx.strokeStyle = borderColor;
  ctx.fill();
  ctx.stroke();

  ctx.restore();
};

function drawRoundedRect(x, y, width, height, radius, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

const drawText = (text, x, y, radius, color) => {
  const fontSize = Math.max(10, Math.min(radius * 0.8, 24));
  ctx.font = `${fontSize}px Inter`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const padding = 4;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width + padding * 2;
  const textHeight = fontSize + padding * 2;
  const rectX = x - textWidth / 2;
  const rectY = y - textHeight / 2;
  const borderRadius = textHeight / 2;

  drawRoundedRect(
    rectX,
    rectY,
    textWidth,
    textHeight,
    borderRadius,
    "rgba(0, 0, 0, 0.5)"
  );

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};

const drawGrid = () => {
  const gridSize = 50;
  const lineColor = "rgb(15, 66, 85)";

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;

  const startX =
    Math.floor(
      (gameState.camera.x - canvas.width / 2 / gameState.camera.scale) /
        gridSize
    ) * gridSize;
  const endX =
    Math.ceil(
      (gameState.camera.x + canvas.width / 2 / gameState.camera.scale) /
        gridSize
    ) * gridSize;
  const startY =
    Math.floor(
      (gameState.camera.y - canvas.height / 2 / gameState.camera.scale) /
        gridSize
    ) * gridSize;
  const endY =
    Math.ceil(
      (gameState.camera.y + canvas.height / 2 / gameState.camera.scale) /
        gridSize
    ) * gridSize;

  for (let x = startX; x <= endX; x += gridSize) {
    if (x < 0 || x > gameState.worldSize.width) continue;
    ctx.beginPath();
    ctx.moveTo(x, Math.max(0, startY));
    ctx.lineTo(x, Math.min(gameState.worldSize.height, endY));
    ctx.stroke();
  }

  for (let y = startY; y <= endY; y += gridSize) {
    if (y < 0 || y > gameState.worldSize.height) continue;
    ctx.beginPath();
    ctx.moveTo(Math.max(0, startX), y);
    ctx.lineTo(Math.min(gameState.worldSize.width, endX), y);
    ctx.stroke();
  }
};

export function handleKeyDown(event) {
  if (event.key === "Escape") {
    gameState.inactive = !gameState.inactive;
    if (gameState.inactive) exitPopup.classList.remove("hidden");
    else exitPopup.classList.add("hidden");
  } else if (event.key === " ") {
    sendSplitMessage();
  }
}

export function showDeathPopup(score) {
  finalScoreSpan.textContent = score;
  deathPopup.classList.remove("hidden");
  gameState.inactive = true;
}

let lastMouseWorldPos = { x: 0, y: 0 };

export const handleMouseMove = (event) => {
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;

  const worldX =
    gameState.camera.x + (screenX - canvas.width / 2) / gameState.camera.scale;
  const worldY =
    gameState.camera.y + (screenY - canvas.height / 2) / gameState.camera.scale;

  lastMouseWorldPos = { x: worldX, y: worldY };
  sendInput({ x: worldX, y: worldY });
};

export const hideExitPopup = () => {
  exitPopup.classList.add("hidden");
  gameState.inactive = false;
};

const blobCache = new Map();

function getMiddlePoint(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

function drawWavyBlob(x, y, radius, color, timestamp, blobId, isSpeeding) {
  const points = Math.max(8, Math.min(16, Math.floor(radius / 10)));
  const wobbleAmount = radius * 0.04;
  const wobbleSpeed = 0.008;

  let controlPoints = blobCache.get(blobId);

  if (!controlPoints) {
    controlPoints = [];
    const angleStep = (Math.PI * 2) / points;

    for (let i = 0; i < points; i++) {
      const angle = i * angleStep;
      const phaseOffset = Math.random() * Math.PI * 2;

      controlPoints.push({
        baseX: Math.cos(angle),
        baseY: Math.sin(angle),
        phaseOffset: phaseOffset,
        wobbleFreq: 0.9 + Math.random() * 0.2,
      });
    }

    blobCache.set(blobId, controlPoints);
  }

  for (let i = 0; i < controlPoints.length; i++) {
    const point = controlPoints[i];

    const wobble =
      Math.sin(timestamp * wobbleSpeed * point.wobbleFreq + point.phaseOffset) *
      wobbleAmount;
    const adjustedRadius = radius + wobble;

    point.x = x + adjustedRadius * point.baseX;
    point.y = y + adjustedRadius * point.baseY;
  }

  if (isSpeeding) {
    const trailLength = 5;
    const dx = lastMouseWorldPos.x - x;
    const dy = lastMouseWorldPos.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const directionX = distance > 0 ? -dx / distance : 0;
    const directionY = distance > 0 ? -dy / distance : 0;

    for (let i = 0; i < trailLength; i++) {
      const t = 1 - i / trailLength;
      const alpha = t * 0.3;
      const size = radius * (0.5 + t * 0.5);
      const offset = (i / trailLength) * radius * 1.5;

      drawCircle(
        x + directionX * offset,
        y + directionY * offset,
        size,
        color,
        100 * alpha
      );
    }
  }

  ctx.fillStyle = color;
  ctx.beginPath();

  if (controlPoints.length > 0) {
    const firstMidpoint = getMiddlePoint(
      controlPoints[controlPoints.length - 1],
      controlPoints[0]
    );
    ctx.moveTo(firstMidpoint.x, firstMidpoint.y);

    for (let i = 0; i < controlPoints.length; i++) {
      const current = controlPoints[i];
      const next = controlPoints[(i + 1) % controlPoints.length];
      const midPoint = getMiddlePoint(current, next);

      ctx.quadraticCurveTo(current.x, current.y, midPoint.x, midPoint.y);
    }
  }

  ctx.closePath();
  ctx.fill();
}
