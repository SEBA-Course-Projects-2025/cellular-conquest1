export const JOYSTICK_CONFIG = {
  RADIUS: 40, // px
  MOVE_INTENSITY: 100, // multiplier for direction vector
  RESET_POS: "50%", // for centering joystick knob
};

export const MOBILE_BUTTONS = [
  { id: "splitBtn", action: "split" },
  { id: "feedBtn", action: "feed" },
  { id: "speedupBtn", action: "speedup" },
];

export const CONTAINER_IDS = {
  CONTROLS: "mobileControls",
  JOYSTICK: "joystickContainer",
  KNOB: "joystickHandle",
};
