// ================== Game Config ==================
export const DEFAULTS = {
  GAME_MODE: "FFA",
};

export const ZOOM_CONFIG = {
  MIN_RADIUS: 20,
  MAX_RADIUS: 500,
  MIN_COVERAGE: 1 / 9,
  MAX_COVERAGE: 3 / 4,
  ZOOM_STEP: 0.1,
  MANUAL_ZOOM_THRESHOLD: 100,
  MIN_MANUAL_SCALE: 1,
  MAX_MANUAL_SCALE: 4,
  SMOOTHNESS: 0.1,
};

export const SPEEDUP_CONFIG = {
  DURATION_MS: 5000,
};

// ================== UI Config ==================
export const UI = {
  MESSAGES: {
    ROOM_ID_COPIED: "Room ID copied to clipboard!",
    RESET_SKIN_HINT: "Click 'R' to reset skin!",
    SKIN_COPY_TOOLTIP: "Click 'A' to apply the new skin!",
  },

  ELEMENT_IDS: {
    PLAYER_NAME: "playerName",
    PLAYER_SCORE: "playerScore",
    LEADERBOARD: "leaderboardList",
    CANCEL_EXIT: "cancelExit",
    CONFIRM_EXIT: "confirmExit",
    EXIT_POPUP: "exitPopup",
    DEATH_POPUP: "deathPopup",
    FINAL_SCORE: "finalScore",
    ERROR_POPUP: "errorPopup",
    SPEED_BAR: "speedBarFill",
    ROOM_ID: "roomId",
  },

  CONTAINER_IDS: {
    CONTROLS: "mobileControls",
    JOYSTICK: "joystickContainer",
    KNOB: "joystickHandle",
  },

  ERROR_POPUP: {
    TIMEOUT_MS: 2000,
    CLASS_VISIBLE: "visible",
  },

  DEATH_POPUP: {
    INACTIVITY_DELAY_MS: 30000,
    COUNTDOWN_SECONDS: 10,
    REDIRECT_URL: "web.html",
  },

  SPEED_BAR: {
    MAX_SEGMENTS: 5,
  },

  JOYSTICK: {
    RADIUS: 40,
    MOVE_INTENSITY: 100,
    RESET_POS: "50%",
  },

  MOBILE_BUTTONS: [
    { id: "splitBtn", action: "split" },
    { id: "feedBtn", action: "feed" },
    { id: "speedupBtn", action: "speedup" },
  ],
};

// ================== Input Config ==================
export const INPUT = {
  CODES: {
    FEED: "KeyW",
    SPLIT: "Space",
    MASK_SKIN: "KeyA",
    RESET_SKIN: "KeyR",
    CLEAR_KEYWORD: "Backspace",
    TOGGLE_PAUSE: "Escape",
  },
  KEYS: {
    SPEEDUP: "Shift",
  },
};

// ================== Network Config ==================
export const NETWORK = {
  LOCAL_HOSTNAMES: ["localhost", "127.0.0.1"],
  LOCAL_PREFIXES: ["192.168."],
  LOCAL_PORT: 8080,
  PRODUCTION_WS_URL: "ws://161.35.75.14:8080/ws",
  RECONNECT_DELAY: 3000,
};

// ================== Dev Tools ==================
export const DEV_KEYWORDS = {
  EXPORT_JSON: "logs1",
  EXPORT_TEXT: "logs2",
};

// ================== Storage Keys ==================
export const LOCAL_STORAGE_KEYS = {
  PLAYER_NAME: "playerName",
  AVAILABLE_SKINS: "availableSkins",
  LAST_SCORE: "lastScore",
  MODE: "gameMode",
  PRIVATE_ROOM: "privateRoomId",
  CUSTOM_SKIN: "customSkin",
};

// ================== Messaging ==================
export const MESSAGE_TYPES = {
  JOIN: "join",
  INPUT: "input",
  SPLIT: "split",
  FEED: "feed",
  SPEEDUP: "speedup",
  LEAVE: "leave",
};

// ================== Rendering Config ==================
export const RENDER = {
  CANVAS_ID: "gameCanvas",
  BACKGROUND_COLOR: "#111111",

  GRID: {
    SIZE: 50,
    LINE_COLOR: "rgb(15, 66, 85)",
    LINE_WIDTH: 1,
  },

  TEXT: {
    MIN_FONT_SIZE: 10,
    MAX_FONT_SIZE: 24,
    FONT_SIZE_RATIO: 0.8,
    FONT_FAMILY: "Inter",
    PADDING: 4,
    BACKGROUND_COLOR: "rgba(0, 0, 0, 0.5)",
    DEFAULT_COLOR: "white",
  },

  FOOD: {
    DEFAULT_VISIBILITY: 100,
  },

  BLOB: {
    DEFAULT_WOBBLE_INTENSITY: 0.04,
    DEFAULT_WOBBLE_SPEED: 0.008,
    DEFAULT_MIN_POINTS: 8,
    DEFAULT_MAX_POINTS: 16,
    DEFAULT_POINT_DENSITY: 10,
    BORDER_ALPHA: 0.3,
    BORDER_WIDTH_RATIO: 0.02,
    MIN_BORDER_WIDTH: 1,
    BREATHE_SPEED: 0.003,
    BREATHE_AMPLITUDE: 0.02,
    MULTIPLY_ALPHA: 0.1,
    SCREEN_ALPHA: 0.05,
  },

  PLAYER_BLOB: {
    WOBBLE_INTENSITY: 0.04,
    WOBBLE_SPEED: 0.008,
    MIN_POINTS: 8,
    MAX_POINTS: 16,
    POINT_DENSITY: 10,
    BREATHE_EFFECT: true,
  },

  BUSH_BLOB: {
    HIDDEN_VISIBILITY: 30,
    VISIBLE_VISIBILITY: 100,
    BORDER_COLOR: "#336633",
    WOBBLE_INTENSITY: 0.02,
    WOBBLE_SPEED: 0.004,
    MIN_POINTS: 12,
    MAX_POINTS: 20,
    POINT_DENSITY: 8,
  },

  TRAIL: {
    LENGTH: 5,
    MAX_ALPHA: 0.3,
    MIN_SIZE_RATIO: 0.5,
    OFFSET_MULTIPLIER: 1.5,
  },

  OUTLINE: {
    DANGER_COLOR: "#ff4444",
    SUCCESS_COLOR: "#44ff44",
    ALPHA: 0.4,
    DURATION: 1000,
  },
};

// ================== Leaderboard ==================
export const LEADERBOARD = {
  MAX_LENGTH_TOUCH: 3,
  MAX_LENGTH_DESKTOP: 10,
};
