import gameState from "../gameFunctionality/gameState.js";
import { RENDER_CONFIG } from "../gameConfig/rendererConfig.js";
import { drawCircle, drawText } from "./drawingUtils.js";
import {
  drawWavyBlob,
  drawExponentialSpikyBlob,
  drawFluffyBush,
} from "./blobRenderer.js";

export const canvas = document.getElementById(RENDER_CONFIG.CANVAS_ID);
const ctx = canvas.getContext("2d");

const skinImageCache = new Map();
const cellMovementCache = new Map();

function getCachedSkinImage(playerId) {
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
    drawCircle(
      ctx,
      x + dirX * offset,
      y + dirY * offset,
      size,
      color,
      100 * alpha
    );
  }
}

function renderFood() {
  for (const food of gameState.food) {
    drawCircle(
      ctx,
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

      const skinImg = getCachedSkinImage(player.id);
      const validSkinImg =
        skinImg?.complete && skinImg.naturalWidth ? skinImg : null;

      const drawFn = player.isBot ? drawExponentialSpikyBlob : drawWavyBlob;

      drawFn(
        ctx,
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

      drawText(ctx, player.nickname, cell.x, cell.y, cell.radius);
    }
  }
}

function renderBushes() {
  for (const bush of gameState.bushes) {
    const visibility = gameState.bushIds?.includes(bush.id)
      ? RENDER_CONFIG.BUSH_BLOB.HIDDEN_VISIBILITY
      : RENDER_CONFIG.BUSH_BLOB.VISIBLE_VISIBILITY;
    drawFluffyBush(
      ctx,
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
