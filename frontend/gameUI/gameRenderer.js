import gameState from "../gameFunctionality/gameState.js";
import { RENDER_CONFIG } from "../gameConfig/rendererConfig.js";

export const canvas = document.getElementById(RENDER_CONFIG.CANVAS_ID);
const ctx = canvas.getContext("2d");
const skinImageCache = new Map();
const cellMovementCache = new Map();
const blobCache = new Map();

function getSkinImage(playerId) {
  const skinEntry = gameState.playersSkins.find((p) => p.id === playerId);
  if (!skinEntry) return null;
  let base64;
  if (typeof skinEntry.image === "number") {
    const available = gameState.availableSkins.find(
      (s) => s.id === skinEntry.image
    );
    base64 = available?.image;
  } else {
    base64 = skinEntry.image;
  }
  if (!base64) return null;
  if (skinImageCache.has(base64)) return skinImageCache.get(base64);
  const img = new Image();
  img.src = base64;
  skinImageCache.set(base64, img);
  return img;
}

function getMiddlePoint(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

function drawCircle(x, y, radius, fillColor, visibility = 100, borderColor) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(visibility, 100)) / 100;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  }
  ctx.fill();
  ctx.restore();
}

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

function drawText(
  text,
  x,
  y,
  radius,
  color = RENDER_CONFIG.TEXT.DEFAULT_COLOR
) {
  const fontSize = Math.max(
    RENDER_CONFIG.TEXT.MIN_FONT_SIZE,
    Math.min(
      radius * RENDER_CONFIG.TEXT.FONT_SIZE_RATIO,
      RENDER_CONFIG.TEXT.MAX_FONT_SIZE
    )
  );
  ctx.font = `${fontSize}px ${RENDER_CONFIG.TEXT.FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const padding = RENDER_CONFIG.TEXT.PADDING;
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
    RENDER_CONFIG.TEXT.BACKGROUND_COLOR
  );
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawGrid() {
  const gridSize = RENDER_CONFIG.GRID.SIZE;
  const lineColor = RENDER_CONFIG.GRID.LINE_COLOR;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = RENDER_CONFIG.GRID.LINE_WIDTH;
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
}

function generateBlobControlPoints(blobId, radius, pointsCount) {
  let controlPoints = blobCache.get(blobId);
  if (!controlPoints) {
    controlPoints = [];
    const angleStep = (Math.PI * 2) / pointsCount;
    for (let i = 0; i < pointsCount; i++) {
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
  return controlPoints;
}

function updateBlobPoints(
  controlPoints,
  x,
  y,
  radius,
  wobbleAmount,
  timestamp,
  wobbleSpeed
) {
  for (let i = 0; i < controlPoints.length; i++) {
    const point = controlPoints[i];
    const wobble =
      Math.sin(timestamp * wobbleSpeed * point.wobbleFreq + point.phaseOffset) *
      wobbleAmount;
    const adjustedRadius = radius + wobble;
    point.x = x + adjustedRadius * point.baseX;
    point.y = y + adjustedRadius * point.baseY;
  }
}

function createBlobPath(controlPoints) {
  if (controlPoints.length === 0) return;
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

function drawWavyBlob(x, y, radius, color, timestamp, blobId, options = {}) {
  const {
    image = null,
    visibility = 100,
    borderColor = null,
    wobbleIntensity = RENDER_CONFIG.BLOB.DEFAULT_WOBBLE_INTENSITY,
    wobbleSpeed = RENDER_CONFIG.BLOB.DEFAULT_WOBBLE_SPEED,
    breatheEffect = false,
    minPoints = RENDER_CONFIG.BLOB.DEFAULT_MIN_POINTS,
    maxPoints = RENDER_CONFIG.BLOB.DEFAULT_MAX_POINTS,
    pointDensity = RENDER_CONFIG.BLOB.DEFAULT_POINT_DENSITY,
  } = options;
  const points = Math.max(
    minPoints,
    Math.min(maxPoints, Math.floor(radius / pointDensity))
  );
  const wobbleAmount = radius * wobbleIntensity;
  const controlPoints = generateBlobControlPoints(blobId, radius, points);
  updateBlobPoints(
    controlPoints,
    x,
    y,
    radius,
    wobbleAmount,
    timestamp,
    wobbleSpeed
  );
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(visibility, 100)) / 100;
  ctx.beginPath();
  createBlobPath(controlPoints);
  ctx.closePath();
  if (image) {
    ctx.clip();
    let imgSize = radius * 2;
    if (breatheEffect) {
      const breathe =
        1 +
        Math.sin(timestamp * RENDER_CONFIG.BLOB.BREATHE_SPEED) *
          RENDER_CONFIG.BLOB.BREATHE_AMPLITUDE;
      imgSize *= breathe;
    }
    const scaledX = x - imgSize / 2;
    const scaledY = y - imgSize / 2;
    ctx.drawImage(image, scaledX, scaledY, imgSize, imgSize);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = color;
    ctx.globalAlpha = RENDER_CONFIG.BLOB.MULTIPLY_ALPHA;
    ctx.fill();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(255, 255, 255, ${RENDER_CONFIG.BLOB.SCREEN_ALPHA})`;
    ctx.globalAlpha = 1;
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.globalAlpha =
    (Math.max(0, Math.min(visibility, 100)) / 100) *
    RENDER_CONFIG.BLOB.BORDER_ALPHA;
  ctx.strokeStyle = borderColor || color;
  ctx.lineWidth = Math.max(
    RENDER_CONFIG.BLOB.MIN_BORDER_WIDTH,
    radius * RENDER_CONFIG.BLOB.BORDER_WIDTH_RATIO
  );
  ctx.stroke();
  ctx.restore();
}

function drawTrail(x, y, radius, dx, dy, color) {
  const trailLength = RENDER_CONFIG.TRAIL.LENGTH;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const dirX = distance > 0 ? -dx / distance : 0;
  const dirY = distance > 0 ? -dy / distance : 0;
  for (let i = 0; i < trailLength; i++) {
    const t = 1 - i / trailLength;
    const alpha = t * RENDER_CONFIG.TRAIL.MAX_ALPHA;
    const size =
      radius *
      (RENDER_CONFIG.TRAIL.MIN_SIZE_RATIO +
        t * (1 - RENDER_CONFIG.TRAIL.MIN_SIZE_RATIO));
    const offset =
      (i / trailLength) * radius * RENDER_CONFIG.TRAIL.OFFSET_MULTIPLIER;
    drawCircle(x + dirX * offset, y + dirY * offset, size, color, 100 * alpha);
  }
}

function renderFood() {
  for (const food of gameState.food) {
    drawCircle(
      food.x,
      food.y,
      food.radius,
      food.color,
      food.visibility ?? RENDER_CONFIG.FOOD.DEFAULT_VISIBILITY
    );
  }
}

function renderPlayers() {
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
      const validSkinImg =
        skinImg?.complete && skinImg.naturalWidth ? skinImg : null;
      drawWavyBlob(
        cell.x,
        cell.y,
        cell.radius,
        cell.color,
        Date.now(),
        `player_${player.id}_${player.cells.indexOf(cell)}`,
        {
          image: validSkinImg,
          breatheEffect: RENDER_CONFIG.PLAYER_BLOB.BREATHE_EFFECT,
          wobbleIntensity: RENDER_CONFIG.PLAYER_BLOB.WOBBLE_INTENSITY,
          wobbleSpeed: RENDER_CONFIG.PLAYER_BLOB.WOBBLE_SPEED,
          minPoints: RENDER_CONFIG.PLAYER_BLOB.MIN_POINTS,
          maxPoints: RENDER_CONFIG.PLAYER_BLOB.MAX_POINTS,
          pointDensity: RENDER_CONFIG.PLAYER_BLOB.POINT_DENSITY,
        }
      );
      drawText(player.nickname, cell.x, cell.y, cell.radius);
    }
  }
}

function renderBushes() {
  for (const bush of gameState.bushes) {
    const visibility = gameState.bushIds?.includes(bush.id)
      ? RENDER_CONFIG.BUSH_BLOB.HIDDEN_VISIBILITY
      : RENDER_CONFIG.BUSH_BLOB.VISIBLE_VISIBILITY;
    drawWavyBlob(
      bush.x,
      bush.y,
      bush.radius,
      bush.color,
      Date.now(),
      `bush_${bush.id}`,
      {
        visibility,
        borderColor: RENDER_CONFIG.BUSH_BLOB.BORDER_COLOR,
        wobbleIntensity: RENDER_CONFIG.BUSH_BLOB.WOBBLE_INTENSITY,
        wobbleSpeed: RENDER_CONFIG.BUSH_BLOB.WOBBLE_SPEED,
        minPoints: RENDER_CONFIG.BUSH_BLOB.MIN_POINTS,
        maxPoints: RENDER_CONFIG.BUSH_BLOB.MAX_POINTS,
        pointDensity: RENDER_CONFIG.BUSH_BLOB.POINT_DENSITY,
      }
    );
  }
}

export const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

export const render = () => {
  ctx.fillStyle = RENDER_CONFIG.BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(gameState.camera.scale, gameState.camera.scale);
  ctx.translate(-gameState.camera.x, -gameState.camera.y);
  drawGrid();
  renderFood();
  renderPlayers();
  renderBushes();
  ctx.restore();
};
