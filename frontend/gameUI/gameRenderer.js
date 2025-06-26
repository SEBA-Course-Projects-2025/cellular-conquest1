import gameState from "../gameFunctionality/gameState.js";

export const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const skinImageCache = new Map();
const cellMovementCache = new Map();
const blobCache = new Map();
const semiVisible = 30;
let currentScale = gameState.camera.scale;
let lastRenderTime = performance.now();

const lerp = (start, end, t) => start + (end - start) * t;

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
      const key = `${player.id}_${player.cells.indexOf(cell)}`;
      const lastPos = cellMovementCache.get(key) || { x: cell.x, y: cell.y };
      const dx = cell.x - lastPos.x;
      const dy = cell.y - lastPos.y;
      cellMovementCache.set(key, { x: cell.x, y: cell.y });

      if (gameState.speedupActive && player.id === gameState.playerId) {
        drawTrail(cell.x, cell.y, cell.radius, dx, dy, cell.color);
      }

      const skinImg = getSkinImage(player.id);

      drawWavyBlob(
        cell.x,
        cell.y,
        cell.radius,
        cell.color,
        Date.now(),
        player.id,
        skinImg?.complete && skinImg.naturalWidth ? skinImg : null
      );

      drawText(player.nickname, cell.x, cell.y, cell.radius, "white");
    }
  }

  for (const bush of gameState.bushes) {
    let visibility = 100;
    if (gameState.bushIds.includes(bush.id)) visibility = semiVisible;
    for (const player of gameState.players) {
      for (const cell of player.cells) {
        const dx = bush.x - cell.x;
        const dy = bush.y - cell.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cell.radius) {
          const overlapArea =
            Math.PI * bush.radius ** 2 * ((cell.radius - dist) / bush.radius);
          const bushArea = Math.PI * bush.radius * bush.radius;
          if (overlapArea > bushArea / 2) {
            visibility = semiVisible;
            break;
          }
        }
      }
      if (visibility < 100) break;
    }
    drawCircle(bush.x, bush.y, bush.radius, bush.color, visibility, "#336633");
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

function getMiddlePoint(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

function drawWavyBlob(x, y, radius, color, timestamp, blobId, image = null) {
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

  ctx.save();

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

  if (image) {
    ctx.clip();

    const imgSize = radius * 2;

    const breathe = 1 + Math.sin(timestamp * 0.003) * 0.02;
    const scaledSize = imgSize * breathe;
    const scaledX = x - scaledSize / 2;
    const scaledY = y - scaledSize / 2;

    ctx.drawImage(image, scaledX, scaledY, scaledSize, scaledSize);

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.1;
    ctx.fill();

    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.globalAlpha = 1;
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, radius * 0.02);
  ctx.stroke();

  ctx.restore();
}

function drawTrail(x, y, radius, dx, dy, color) {
  const trailLength = 5;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const dirX = distance > 0 ? -dx / distance : 0;
  const dirY = distance > 0 ? -dy / distance : 0;

  for (let i = 0; i < trailLength; i++) {
    const t = 1 - i / trailLength;
    const alpha = t * 0.3;
    const size = radius * (0.5 + t * 0.5);
    const offset = (i / trailLength) * radius * 1.5;
    drawCircle(x + dirX * offset, y + dirY * offset, size, color, 100 * alpha);
  }
}
