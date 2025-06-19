const defaultWorldSize = 2000;

const state = {
  playerName: localStorage.getItem("playerName") || "YourNickname",
  playerId: null,
  playerScore: 0,
  roomId: null,
  worldSize: { width: defaultWorldSize, height: defaultWorldSize },
  players: [],
  food: [],
  lastTimestamp: null,
  dt: null,
  speedupActive: false,
  speedupAvailable: false,
  inactive: false,
  connected: false,
  camera: { x: defaultWorldSize / 2, y: defaultWorldSize / 2, scale: 1 },
  availableSkins: localStorage.getItem("availableSkins") || [],
  playersSkins: [],

  updatePlayerSkin(id, image) {
    if (!image) {
      this.playersSkins = this.playersSkins.filter((p) => p.id !== id);
      return;
    }
    const player = this.playersSkins.find((p) => p.id === id);
    if (player) {
      player.skin = image;
    } else {
      this.playersSkins.push({ id: id, skin: image });
    }
  },
  removePlayerSkin(id) {
    this.playersSkins = this.playersSkins.filter((p) => p.id !== id);
  },
};

export default state;
