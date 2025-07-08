import gameState from "../gameFunctionality/gameState.js";
import { RENDER } from "../gameConfig.js";
import { drawCircle, drawText } from "./drawingUtils.js";
import {
  drawWavyBlob,
  drawExponentialSpikyBlob,
  drawFluffyBush,
} from "./blobRenderer.js";

export const canvas = document.getElementById(RENDER.CANVAS_ID);
const ctx = canvas.getContext("2d");

const skinImageCache = new Map();
const cellMovementCache = new Map();
const cellRadiusCache = new Map();
const cellOutlineCache = new Map();

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
  const gridSize = RENDER.GRID.SIZE;
  const lineColor = RENDER.GRID.LINE_COLOR;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = RENDER.GRID.LINE_WIDTH;
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

function drawTrail(
  x,
  y,
  radius,
  dx,
  dy,
  color,
  trailCount = null,
  cellKey = null
) {
  const actualTrailLength = trailCount || RENDER.TRAIL.LENGTH;

  let actualColor = color;
  const currentTime = Date.now();

  if (trailCount === 1 && cellKey) {
    const outlineData = cellOutlineCache.get(cellKey);

    if (
      outlineData &&
      currentTime - outlineData.startTime < RENDER.OUTLINE.DURATION
    ) {
      actualColor = outlineData.color;
    } else {
      return;
    }
  }

  const distance = Math.sqrt(dx * dx + dy * dy);
  const dirX = distance > 0 ? -dx / distance : 0;
  const dirY = distance > 0 ? -dy / distance : 0;

  for (let i = 0; i < actualTrailLength; i++) {
    const t = 1 - i / actualTrailLength;
    let alpha = t * RENDER.TRAIL.MAX_ALPHA;

    if (trailCount === 1 && cellKey) {
      const outlineData = cellOutlineCache.get(cellKey);
      if (outlineData) {
        const elapsed = currentTime - outlineData.startTime;
        const fadeProgress = elapsed / RENDER.OUTLINE.DURATION;
        alpha = RENDER.OUTLINE.ALPHA * (1 - fadeProgress);
      }
    }

    const size =
      radius *
      (RENDER.TRAIL.MIN_SIZE_RATIO + t * (1 - RENDER.TRAIL.MIN_SIZE_RATIO));
    const offset =
      (i / actualTrailLength) * radius * RENDER.TRAIL.OFFSET_MULTIPLIER;
    drawCircle(
      ctx,
      x + dirX * offset,
      y + dirY * offset,
      size,
      actualColor,
      100 * alpha
    );
  }
}

function updateOutlineState(cellKey, currentRadius) {
  const currentTime = Date.now();
  const lastRadius = cellRadiusCache.get(cellKey) || currentRadius;
  cellRadiusCache.set(cellKey, currentRadius);

  const radiusDiff = Math.abs(currentRadius - lastRadius);
  if (radiusDiff > 0.1) {
    let outlineColor;
    if (currentRadius < lastRadius) {
      outlineColor = RENDER.OUTLINE.DANGER_COLOR;
    } else if (currentRadius > lastRadius) {
      outlineColor = RENDER.OUTLINE.SUCCESS_COLOR;
    }

    if (outlineColor) {
      cellOutlineCache.set(cellKey, {
        color: outlineColor,
        startTime: currentTime,
      });
    }
  }

  const outlineData = cellOutlineCache.get(cellKey);
  if (
    outlineData &&
    currentTime - outlineData.startTime >= RENDER.OUTLINE.DURATION
  ) {
    cellOutlineCache.delete(cellKey);
  }
}

function drawOutline(x, y, radius, dx, dy, color, cellKey) {
  drawTrail(x, y, radius, dx, dy, color, 1, cellKey);
}

function renderFood() {
  for (const food of gameState.food) {
    drawCircle(
      ctx,
      food.x,
      food.y,
      food.radius,
      food.color,
      food.visibility ?? RENDER.FOOD.DEFAULT_VISIBILITY
    );
  }
}

function renderPlayers() {
  for (const player of gameState.players) {
    for (let cellIndex = 0; cellIndex < player.cells.length; cellIndex++) {
      const cell = player.cells[cellIndex];
      const key = `${player.id}_${cellIndex}`;
      const lastPos = cellMovementCache.get(key) || { x: cell.x, y: cell.y };
      const dx = cell.x - lastPos.x;
      const dy = cell.y - lastPos.y;
      cellMovementCache.set(key, { x: cell.x, y: cell.y });

      updateOutlineState(key, cell.radius);

      drawOutline(cell.x, cell.y, cell.radius, dx, dy, cell.color, key);

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
        `player_${player.id}_${cellIndex}`,
        {
          image: validSkinImg,
          breatheEffect: RENDER.PLAYER_BLOB.BREATHE_EFFECT,
          wobbleIntensity: RENDER.PLAYER_BLOB.WOBBLE_INTENSITY,
          wobbleSpeed: RENDER.PLAYER_BLOB.WOBBLE_SPEED,
          minPoints: RENDER.PLAYER_BLOB.MIN_POINTS,
          maxPoints: RENDER.PLAYER_BLOB.MAX_POINTS,
          pointDensity: RENDER.PLAYER_BLOB.POINT_DENSITY,
        }
      );

      drawText(ctx, player.nickname, cell.x, cell.y, cell.radius);
    }
  }
}

function renderBushes() {
  for (const bush of gameState.bushes) {
    const visibility = gameState.bushIds?.includes(bush.id)
      ? RENDER.BUSH_BLOB.HIDDEN_VISIBILITY
      : RENDER.BUSH_BLOB.VISIBLE_VISIBILITY;
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
        borderColor: RENDER.BUSH_BLOB.BORDER_COLOR,
        wobbleIntensity: RENDER.BUSH_BLOB.WOBBLE_INTENSITY,
        wobbleSpeed: RENDER.BUSH_BLOB.WOBBLE_SPEED,
      }
    );
  }
}

export const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

export const render = () => {
  ctx.fillStyle = RENDER.BACKGROUND_COLOR;
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
