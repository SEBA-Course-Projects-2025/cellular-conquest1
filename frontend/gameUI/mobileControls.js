import {
  handleFeed,
  handleInput,
  handleSpeedup,
  handleSplit,
} from "../gameFunctionality/eventHandlers.js";
import gameState from "../gameFunctionality/gameState.js";
import { UI } from "../gameConfig.js";
const { JOYSTICK_CONFIG, MOBILE_BUTTONS, CONTAINER_IDS } = UI;

const $ = (id) => document.getElementById(id);

const joystickRight = !(localStorage.getItem("joystickRight") === "false");

const mobileControls = $(CONTAINER_IDS.CONTROLS);
const joystickContainer = $(CONTAINER_IDS.JOYSTICK);
const joystickKnob = $(CONTAINER_IDS.KNOB);
const buttons = MOBILE_BUTTONS.map(({ id, action }) => ({
  el: $(id),
  action: getActionHandler(action),
}));

function getActionHandler(actionName) {
  switch (actionName) {
    case "split":
      return handleSplit;
    case "feed":
      return handleFeed;
    case "speedup":
      return handleSpeedup;
    default:
      console.warn(`No handler for action: ${actionName}`);
      return () => {};
  }
}

gameState.isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
mobileControls.classList.toggle("hidden", !gameState.isTouch);

if (gameState.isTouch) {
  if (joystickRight) {
    mobileControls.classList.add("joystick-right");
    mobileControls.classList.remove("joystick-left");
  } else {
    mobileControls.classList.add("joystick-left");
    mobileControls.classList.remove("joystick-right");
  }
}

let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickPointerId = null;

const clamp = (dx, dy) => {
  const dist = Math.hypot(dx, dy);
  if (dist > JOYSTICK_CONFIG.RADIUS) {
    const angle = Math.atan2(dy, dx);
    dx = Math.cos(angle) * JOYSTICK_CONFIG.RADIUS;
    dy = Math.sin(angle) * JOYSTICK_CONFIG.RADIUS;
  }
  return { dx, dy };
};

const updateJoystick = (x, y) => {
  const dx = x - joystickCenter.x;
  const dy = y - joystickCenter.y;
  const { dx: cdx, dy: cdy } = clamp(dx, dy);

  joystickKnob.style.left = `${50 + cdx}px`;
  joystickKnob.style.top = `${50 + cdy}px`;

  const norm = {
    x: cdx / JOYSTICK_CONFIG.RADIUS,
    y: cdy / JOYSTICK_CONFIG.RADIUS,
  };

  handleInput({
    x: gameState.camera.x + norm.x * JOYSTICK_CONFIG.MOVE_INTENSITY,
    y: gameState.camera.y + norm.y * JOYSTICK_CONFIG.MOVE_INTENSITY,
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
  joystickKnob.style.left = JOYSTICK_CONFIG.RESET_POS;
  joystickKnob.style.top = JOYSTICK_CONFIG.RESET_POS;
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
