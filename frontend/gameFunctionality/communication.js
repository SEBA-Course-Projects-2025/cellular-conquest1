import { showGameError } from "../gameUI/uiController.js";
import {
  handleDeath,
  handleGameState,
  handleLeaderboard,
  handlePlayerData,
} from "./eventHandlers.js";
import gameState from "./gameState.js";
import logger from "./logger.js";
import {
  LOCAL_HOSTNAMES,
  LOCAL_PREFIXES,
  PRODUCTION_WS_URL,
  RECONNECT_DELAY,
  DEFAULTS,
  MESSAGE_TYPES,
} from "../gameConfig/networkConfig.js";
import { LOCAL_STORAGE_KEYS } from "../gameConfig/localStorageKeys.js";

const isLocal =
  LOCAL_HOSTNAMES.includes(location.hostname) ||
  LOCAL_PREFIXES.some((prefix) => location.hostname.startsWith(prefix));

const ENDPOINT = isLocal
  ? `ws://${location.hostname}:8080/ws`
  : PRODUCTION_WS_URL;

let socket;

export const connectToServer = () => {
  socket = new WebSocket(ENDPOINT);

  socket.onopen = () => {
    console.log("Connected to server");
    gameState.connected = true;

    const privateRoomId = localStorage.getItem(LOCAL_STORAGE_KEYS.PRIVATE_ROOM);
    const joinMessage = {
      type: MESSAGE_TYPES.JOIN,
      nickname: gameState.playerName,
      mode: localStorage.getItem(LOCAL_STORAGE_KEYS.MODE) || DEFAULTS.GAME_MODE,
    };

    if (privateRoomId) {
      joinMessage.privateServer = privateRoomId;
    }

    const customSkin = localStorage.getItem(LOCAL_STORAGE_KEYS.CUSTOM_SKIN);
    if (customSkin) {
      joinMessage.customSkin = customSkin;
    }

    logger.out(MESSAGE_TYPES.JOIN, joinMessage);
    socket.send(JSON.stringify(joinMessage));
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    logger.in(message.type, message);

    switch (message.type) {
      case "playerData":
        handlePlayerData(message);
        break;
      case "gameState":
        handleGameState(message);
        break;
      case "death":
        handleDeath(message);
        break;
      case "leaderboard":
        handleLeaderboard(message);
        break;
      case "customSkinBroadcast":
        gameState.updatePlayerSkin(message.id, message.image);
        break;
      case "playerDisconnected":
        gameState.updatePlayerSkin(message.id);
        break;
      case "error":
        handleError(message.message || "An error occurred");
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  };

  socket.onclose = () => {
    console.log("Disconnected from server");
    showGameError("Disconnected from server. Attempting reconnection...");
    gameState.connected = false;
    setTimeout(connectToServer, RECONNECT_DELAY);
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    showGameError("Connection error! Trying to reconnect...");
  };
};

const handleError = (message) => {
  console.error(`Server error: ${message}`);
  showGameError(message.error);
};

const isReady = () =>
  gameState.connected && socket.readyState === WebSocket.OPEN;

export const sendInput = (mousePosition) => {
  if (!isReady()) return;
  const player = gameState.players.find((p) => p.id === gameState.playerId);
  if (!player || player.cells.length === 0) return;

  const dx = mousePosition.x - gameState.camera.x;
  const dy = mousePosition.y - gameState.camera.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const normalizedDx = length > 0 ? dx / length : 0;
  const normalizedDy = length > 0 ? dy / length : 0;

  const inputMsg = {
    type: MESSAGE_TYPES.INPUT,
    direction: { x: normalizedDx, y: normalizedDy },
  };
  logger.out(MESSAGE_TYPES.INPUT, inputMsg);
  socket.send(JSON.stringify(inputMsg));
};

export const sendSplitMessage = () => {
  if (isReady()) {
    logger.out(MESSAGE_TYPES.SPLIT);
    socket.send(JSON.stringify({ type: MESSAGE_TYPES.SPLIT }));
  }
};

export const sendFeedMessage = () => {
  if (isReady()) {
    logger.out(MESSAGE_TYPES.FEED);
    socket.send(JSON.stringify({ type: MESSAGE_TYPES.FEED }));
  }
};

export const sendSpeedupMessage = () => {
  if (isReady()) {
    logger.out(MESSAGE_TYPES.SPEEDUP);
    socket.send(JSON.stringify({ type: MESSAGE_TYPES.SPEEDUP }));
  }
};

export const sendLeaveMessage = () => {
  if (isReady()) {
    logger.out(MESSAGE_TYPES.LEAVE);
    socket.send(JSON.stringify({ type: MESSAGE_TYPES.LEAVE }));
  }
};
