import { RENDER } from "../gameConfig.js";
import gameState from "../gameFunctionality/gameState.js";

const skinImageCache = new Map();

export function getSkinImage(playerId) {
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

export function getMiddlePoint(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function drawCircle(
  ctx,
  x,
  y,
  radius,
  fillColor,
  visibility = 100,
  borderColor
) {
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

export function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
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

export function drawText(
  ctx,
  text,
  x,
  y,
  radius,
  color = RENDER.TEXT.DEFAULT_COLOR
) {
  const fontSize = Math.max(
    RENDER.TEXT.MIN_FONT_SIZE,
    Math.min(radius * RENDER.TEXT.FONT_SIZE_RATIO, RENDER.TEXT.MAX_FONT_SIZE)
  );
  ctx.font = `${fontSize}px ${RENDER.TEXT.FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const padding = RENDER.TEXT.PADDING;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width + padding * 2;
  const textHeight = fontSize + padding * 2;
  const rectX = x - textWidth / 2;
  const rectY = y - textHeight / 2;
  const borderRadius = textHeight / 2;
  drawRoundedRect(
    ctx,
    rectX,
    rectY,
    textWidth,
    textHeight,
    borderRadius,
    RENDER.TEXT.BACKGROUND_COLOR
  );
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function createSeededRandom(seed) {
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
