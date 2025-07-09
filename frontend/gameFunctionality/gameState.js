import { MAX_PLAYER_NAME_LENGTH } from "../commonConfig.js";
import { LOCAL_STORAGE_KEYS } from "../gameConfig.js";
const defaultWorldSize = 2000;

function trimWithEllipsis(str, maxLength) {
  return str.length > maxLength ? str.slice(0, maxLength - 3) + "..." : str;
}

const state = {
  isTouch: false,
  playerName:
    trimWithEllipsis(
      localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYER_NAME),
      MAX_PLAYER_NAME_LENGTH
    ) || "YourNickname",
  playerId: null,
  playerScore: 0,
  roomId: null,
  worldSize: { width: defaultWorldSize, height: defaultWorldSize },
  players: [],
  food: [],
  bushes: [],
  bushIds: [],
  lastTimestamp: null,
  dt: null,
  speedupActive: false,
  speedupAvailable: false,
  inactive: false,
  connected: false,
  camera: { x: defaultWorldSize / 2, y: defaultWorldSize / 2, scale: 1 },
  availableSkins:
    localStorage.getItem(LOCAL_STORAGE_KEYS.AVAILABLE_SKINS) || [],
  playersSkins: [],

  updatePlayerSkin(id, image) {
    if (!image) {
      this.playersSkins = this.playersSkins.filter((p) => p.id !== id);
      return;
    }
    const player = this.playersSkins.find((p) => p.id === id);
    if (player) {
      player.image = image;
    } else {
      this.playersSkins.push({ id: id, image: image });
    }
  },
  removePlayerSkin(id) {
    this.playersSkins = this.playersSkins.filter((p) => p.id !== id);
  },
};

export default state;
