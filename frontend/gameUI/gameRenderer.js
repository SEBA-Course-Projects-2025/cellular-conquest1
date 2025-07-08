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

function createSeededRandom(seed) {
  let state = seed.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return function () {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateWavyBlobControlPoints(blobId, pointsCount) {
  let controlPoints = blobCache.get(blobId);
  if (!controlPoints) {
    controlPoints = [];
    const angleStep = (Math.PI * 2) / pointsCount;
    const seededRandom = createSeededRandom(blobId);

    for (let i = 0; i < pointsCount; i++) {
      const angle = i * angleStep;
      controlPoints.push({
        baseX: Math.cos(angle),
        baseY: Math.sin(angle),
        phaseOffset: seededRandom() * Math.PI * 2,
        wobbleFreq: 0.9 + seededRandom() * 0.2,
      });
    }
    blobCache.set(blobId, controlPoints);
  }
  return controlPoints;
}

function generateSpikyBlobParams(blobId, spikeCount) {
  let params = blobCache.get(blobId);
  if (!params) {
    params = [];
    const seededRandom = createSeededRandom(blobId);
    for (let i = 0; i < spikeCount; i++) {
      params.push({
        radialVariationSeed: seededRandom() * 200,
        tangentialVariationSeed: seededRandom() * 200,
        curveVariationSeed: seededRandom() * 200,
      });
    }
    blobCache.set(blobId, params);
  }
  return params;
}

function generateFluffyBushParams(blobId, baseRadius) {
  let params = blobCache.get(blobId);
  if (!params) {
    params = [];
    const seededRandom = createSeededRandom(blobId);
    const numCircles = 5 + Math.floor(seededRandom() * 4);

    for (let i = 0; i < numCircles; i++) {
      const angle = seededRandom() * Math.PI * 2;
      const offset = seededRandom() * baseRadius * 0.4;

      params.push({
        offsetX: Math.cos(angle) * offset,
        offsetY: Math.sin(angle) * offset,
        radius: baseRadius * (0.4 + seededRandom() * 0.3),
        phaseOffset: seededRandom() * Math.PI * 2,
        wobbleFreq: 0.9 + seededRandom() * 0.2,
      });
    }
    blobCache.set(blobId, params);
  }
  return params;
}

function createWavyPath(ctx, controlPoints) {
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

function createSpikyPath(ctx, { radius, timestamp, options, cachedParams }) {
  const { wobbleIntensity = 0.1, wobbleSpeed = 0.5 } = options;

  const spikeCount = cachedParams.length;
  const increasedRadius = radius * 1.2;
  const baseRotation = (timestamp * wobbleSpeed * 0.001) % (Math.PI * 2);

  ctx.rotate(baseRotation);

  const innerBaseRadius = increasedRadius;
  const baseControlPointRadius = innerBaseRadius * 0.6;

  for (let i = 0; i < spikeCount; i++) {
    const param = cachedParams[i];
    const radialWobbleTime = timestamp * 0.002 + param.radialVariationSeed;
    const radialVariation = Math.sin(radialWobbleTime) * 0.5 + 0.5;
    const spikeLength = increasedRadius * wobbleIntensity * 2 * radialVariation;
    const spikeTipRadius = innerBaseRadius + spikeLength;

    const tangentialWobbleTime =
      timestamp * 0.001 + param.tangentialVariationSeed;
    const tangentialVariation =
      Math.sin(tangentialWobbleTime) * (Math.PI / spikeCount) * 0.4;

    const curveWobbleTime = timestamp * 0.0008 + param.curveVariationSeed;
    const curveVariation = Math.sin(curveWobbleTime) * 0.2 + 1.0;
    const dynamicControlPointRadius = baseControlPointRadius * curveVariation;

    const angle = (i / spikeCount) * Math.PI * 2;
    const nextAngle = ((i + 1) / spikeCount) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2 + tangentialVariation;

    const pBaseStartX = Math.cos(angle) * innerBaseRadius;
    const pBaseStartY = Math.sin(angle) * innerBaseRadius;
    const pBaseEndX = Math.cos(nextAngle) * innerBaseRadius;
    const pBaseEndY = Math.sin(nextAngle) * innerBaseRadius;

    const spikeTipX = Math.cos(midAngle) * spikeTipRadius;
    const spikeTipY = Math.sin(midAngle) * spikeTipRadius;

    const cp1Angle = angle + (midAngle - angle) * 0.7;
    const cp1X = Math.cos(cp1Angle) * dynamicControlPointRadius;
    const cp1Y = Math.sin(cp1Angle) * dynamicControlPointRadius;

    const cp2Angle = nextAngle - (nextAngle - midAngle) * 0.7;
    const cp2X = Math.cos(cp2Angle) * dynamicControlPointRadius;
    const cp2Y = Math.sin(cp2Angle) * dynamicControlPointRadius;

    if (i === 0) {
      ctx.moveTo(pBaseStartX, pBaseStartY);
    }

    ctx.quadraticCurveTo(cp1X, cp1Y, spikeTipX, spikeTipY);
    ctx.quadraticCurveTo(cp2X, cp2Y, pBaseEndX, pBaseEndY);
  }
}

function drawPathBasedBlob(
  { x, y, radius, color, timestamp, options },
  pathGenerator
) {
  const {
    image = null,
    visibility = 100,
    borderColor = null,
    breatheEffect = false,
  } = options;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.max(0, Math.min(visibility, 100)) / 100;

  ctx.beginPath();
  pathGenerator(ctx);
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

    ctx.drawImage(image, -imgSize / 2, -imgSize / 2, imgSize, imgSize);

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

  if (borderColor) {
    ctx.globalAlpha =
      (Math.max(0, Math.min(visibility, 100)) / 100) *
      RENDER_CONFIG.BLOB.BORDER_ALPHA;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = Math.max(
      RENDER_CONFIG.BLOB.MIN_BORDER_WIDTH,
      radius * RENDER_CONFIG.BLOB.BORDER_WIDTH_RATIO
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawExponentialSpikyBlob(
  x,
  y,
  radius,
  color,
  timestamp,
  blobId,
  options = {}
) {
  const {
    minPoints = 10,
    maxPoints = 100,
    pointDensity = 5,
    spikeCount: explicitSpikeCount,
  } = options;

  const spikeCount =
    explicitSpikeCount !== undefined
      ? explicitSpikeCount
      : Math.max(
          minPoints,
          Math.min(maxPoints, Math.floor((radius * 1.2) / pointDensity))
        );

  const cachedParams = generateSpikyBlobParams(blobId, spikeCount);

  const pathGenerator = (context) =>
    createSpikyPath(context, { radius, timestamp, options, cachedParams });

  drawPathBasedBlob({ x, y, radius, color, timestamp, options }, pathGenerator);
}

function drawWavyBlob(x, y, radius, color, timestamp, blobId, options = {}) {
  const {
    wobbleIntensity = RENDER_CONFIG.BLOB.DEFAULT_WOBBLE_INTENSITY,
    wobbleSpeed = RENDER_CONFIG.BLOB.DEFAULT_WOBBLE_SPEED,
    minPoints = RENDER_CONFIG.BLOB.DEFAULT_MIN_POINTS,
    maxPoints = RENDER_CONFIG.BLOB.DEFAULT_MAX_POINTS,
    pointDensity = RENDER_CONFIG.BLOB.DEFAULT_POINT_DENSITY,
  } = options;

  const points = Math.max(
    minPoints,
    Math.min(maxPoints, Math.floor(radius / pointDensity))
  );
  const wobbleAmount = radius * wobbleIntensity;
  const controlPoints = generateWavyBlobControlPoints(blobId, points);

  for (let i = 0; i < controlPoints.length; i++) {
    const point = controlPoints[i];
    const wobble =
      Math.sin(timestamp * wobbleSpeed * point.wobbleFreq + point.phaseOffset) *
      wobbleAmount;
    const adjustedRadius = radius + wobble;
    point.x = adjustedRadius * point.baseX;
    point.y = adjustedRadius * point.baseY;
  }

  const pathGenerator = (context) => createWavyPath(context, controlPoints);

  drawPathBasedBlob({ x, y, radius, color, timestamp, options }, pathGenerator);
}

function drawFluffyBush(x, y, radius, color, timestamp, blobId, options = {}) {
  const {
    visibility = 100,
    borderColor = null,
    wobbleIntensity = RENDER_CONFIG.BUSH_BLOB.WOBBLE_INTENSITY,
    wobbleSpeed = RENDER_CONFIG.BUSH_BLOB.WOBBLE_SPEED,
  } = options;

  const params = generateFluffyBushParams(blobId, radius);

  ctx.save();
  const baseAlpha = Math.max(0, Math.min(visibility, 100)) / 100;

  ctx.fillStyle = color;

  for (const param of params) {
    ctx.globalAlpha = baseAlpha * 0.8;
    const wobbleAmount = param.radius * wobbleIntensity;
    const wobble =
      Math.sin(timestamp * wobbleSpeed * param.wobbleFreq + param.phaseOffset) *
      wobbleAmount;
    const currentRadius = param.radius + wobble;

    ctx.beginPath();
    ctx.arc(
      x + param.offsetX,
      y + param.offsetY,
      currentRadius,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = Math.max(
      RENDER_CONFIG.BLOB.MIN_BORDER_WIDTH,
      radius * RENDER_CONFIG.BLOB.BORDER_WIDTH_RATIO * 0.5
    );
    ctx.globalAlpha = baseAlpha * RENDER_CONFIG.BLOB.BORDER_ALPHA;

    for (const param of params) {
      const wobbleAmount = param.radius * wobbleIntensity;
      const wobble =
        Math.sin(
          timestamp * wobbleSpeed * param.wobbleFreq + param.phaseOffset
        ) * wobbleAmount;
      const currentRadius = param.radius + wobble;

      ctx.beginPath();
      ctx.arc(
        x + param.offsetX,
        y + param.offsetY,
        currentRadius,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  }

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

      const drawFn = player.isBot ? drawExponentialSpikyBlob : drawWavyBlob;

      drawFn(
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
    drawFluffyBush(
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
