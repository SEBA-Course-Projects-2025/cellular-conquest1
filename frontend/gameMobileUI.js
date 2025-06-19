import gameState from "./gameState.js";
import {
  handleFeed,
  handleInput,
  handleSpeedup,
  handleSplit,
} from "./gameLogic.js";
const $ = (id) => document.getElementById(id);
const mobileControls = $("mobileControls");
const joystickContainer = $("joystickContainer");
const joystickKnob = $("joystickHandle");
const splitBtn = $("splitBtn");
const speedupBtn = $("speedupBtn");
const feedBtn = $("feedBtn");
const buttons = [
  { el: splitBtn, action: handleSplit },
  { el: feedBtn, action: handleFeed },
  { el: speedupBtn, action: handleSpeedup },
];

const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
mobileControls.classList.toggle("hidden", !isTouch);

// === Joystick ===
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickPointerId = null;
const joystickRadius = 40;

const clamp = (dx, dy) => {
  const dist = Math.hypot(dx, dy);
  if (dist > joystickRadius) {
    const angle = Math.atan2(dy, dx);
    dx = Math.cos(angle) * joystickRadius;
    dy = Math.sin(angle) * joystickRadius;
  }
  return { dx, dy };
};

const updateJoystick = (x, y) => {
  const dx = x - joystickCenter.x;
  const dy = y - joystickCenter.y;
  const { dx: cdx, dy: cdy } = clamp(dx, dy);

  joystickKnob.style.left = `${50 + cdx}px`;
  joystickKnob.style.top = `${50 + cdy}px`;

  const norm = { x: cdx / joystickRadius, y: cdy / joystickRadius };
  handleInput({
    x: gameState.camera.x + norm.x * 100,
    y: gameState.camera.y + norm.y * 100,
  });
};

const getTouch = (e) =>
  e.changedTouches
    ? [...e.changedTouches].find((t) => t.identifier === joystickPointerId)
    : e;

const onJoystickStart = (e) => {
  if (joystickActive) return;
  const t = e.changedTouches ? e.changedTouches[0] : e;
  joystickPointerId = t.identifier ?? null;

  const rect = joystickContainer.getBoundingClientRect();
  joystickCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  joystickActive = true;
  updateJoystick(t.clientX, t.clientY);
  e.preventDefault();
};
const onJoystickMove = (e) => {
  if (!joystickActive) return;
  const t = getTouch(e);
  if (!t) return;
  updateJoystick(t.clientX, t.clientY);
  e.preventDefault();
};
const onJoystickEnd = (e) => {
  if (!joystickActive) return;
  const t = getTouch(e);
  if (!t) return;

  joystickActive = false;
  joystickPointerId = null;
  joystickKnob.style.left = "50%";
  joystickKnob.style.top = "50%";
  handleInput({ x: gameState.camera.x, y: gameState.camera.y });
  e.preventDefault();
};

const attach = (el, events, handler, opts = {}) =>
  events.forEach((e) => el.addEventListener(e, handler, opts));

attach(joystickContainer, ["touchstart"], onJoystickStart, { passive: false });
attach(joystickContainer, ["touchmove"], onJoystickMove, { passive: false });
attach(joystickContainer, ["touchend", "touchcancel"], onJoystickEnd, {
  passive: false,
});

attach(joystickContainer, ["mousedown"], onJoystickStart);
attach(window, ["mousemove"], onJoystickMove);
attach(window, ["mouseup"], onJoystickEnd);

// Buttons & Highlight
attach(joystickContainer, ["touchstart", "mousedown", "click"], () =>
  joystickContainer.classList.add("pressed")
);
attach(joystickContainer, ["touchend", "mouseup", "click"], () =>
  joystickContainer.classList.remove("pressed")
);
for (const { el, action } of buttons) {
  attach(el, ["touchend", "mouseup"], () => el.classList.remove("pressed"));
  attach(el, ["touchstart", "mousedown", "click"], (e) => {
    e.preventDefault();
    action();
    el.classList.add("pressed");
  });
}
