import {
  handleDeath,
  handleGameState,
  handleLeaderboard,
  handlePlayerData,
} from "./gameLogic.js";
import gameState from "./gameState.js";
import logger from "./gameLogger.js";

const isLocalhost =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";
const ENDPOINT = isLocalhost
  ? "ws://localhost:8080"
  : "ws://161.35.75.14:8080/ws";

let socket;

export const connectToServer = () => {
  socket = new WebSocket(ENDPOINT);

  socket.onopen = () => {
    console.log("Connected to server");
    gameState.connected = true;

    const privateRoomId = localStorage.getItem("privateRoomId");

    const joinMessage = {
      type: "join",
      nickname: gameState.playerName,
      mode: localStorage.getItem("gameMode") || "FFA",
    };

    if (privateRoomId) {
      joinMessage.privateServer = privateRoomId;
    }

    const customSkin = localStorage.getItem("customSkin");
    if (customSkin) {
      joinMessage.customSkin = customSkin;
    }

    logger.out("join", joinMessage);
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
    gameState.connected = false;
    setTimeout(connectToServer, 3000);
  };

  socket.onerror = (error) => {
    console.error("Websocket error:", error);
  };
};

const handleError = (message) => {
  console.error(`Server error: ${message}`);
  // todo: add UI error handling
};

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
    type: "input",
    direction: { x: normalizedDx, y: normalizedDy },
  };
  logger.out("input", inputMsg);
  socket.send(JSON.stringify(inputMsg));
};

export const sendSplitMessage = () => {
  if (isReady()) {
    logger.out("split");
    socket.send(JSON.stringify({ type: "split" }));
  }
};

export const sendFeedMessage = () => {
  if (isReady()) {
    logger.out("feed");
    socket.send(JSON.stringify({ type: "feed" }));
  }
};

export const sendSpeedup = () => {
  if (isReady()) {
    logger.out("speedup");
    socket.send(JSON.stringify({ type: "speedup" }));
  }
};

export const sendLeaveMessage = () => {
  if (isReady()) {
    logger.out("leave");
    socket.send(JSON.stringify({ type: "leave" }));
  }
};

const isReady = () =>
  gameState.connected && socket.readyState === WebSocket.OPEN;
