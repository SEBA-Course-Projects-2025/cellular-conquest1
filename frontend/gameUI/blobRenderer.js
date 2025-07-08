import { RENDER_CONFIG } from "../gameConfig/rendererConfig.js";
import { getMiddlePoint, createSeededRandom } from "./drawingUtils.js";

const blobCache = new Map();

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
  ctx,
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

export function drawExponentialSpikyBlob(
  ctx,
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

  drawPathBasedBlob(
    ctx,
    { x, y, radius, color, timestamp, options },
    pathGenerator
  );
}

export function drawWavyBlob(
  ctx,
  x,
  y,
  radius,
  color,
  timestamp,
  blobId,
  options = {}
) {
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

  drawPathBasedBlob(
    ctx,
    { x, y, radius, color, timestamp, options },
    pathGenerator
  );
}

export function drawFluffyBush(
  ctx,
  x,
  y,
  radius,
  color,
  timestamp,
  blobId,
  options = {}
) {
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
