const excludedTypes = new Set(["gameState", "input", "leaderboard"]);
let logToConsole = true;

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500;
  }

  log(direction, type, data = null, success = true, error = null) {
    if (excludedTypes.has(type)) return;

    const entry = {
      time: new Date().toLocaleTimeString(),
      direction,
      type,
      success,
      error,
      data: this.clean(data),
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (logToConsole) {
      const arrow = direction === "OUT" ? "→" : "←";
      const status = success ? "✓" : "✗";
      const color = success ? (direction === "OUT" ? "green" : "blue") : "red";
      console.log(
        `%c[${entry.time}] ${arrow} ${status} ${type}`,
        `color: ${color}`,
        entry.data
      );
    } else console.log(type);
  }

  clean(data) {
    if (!data) return null;
    const cleaned = { ...data };

    if (cleaned.customSkin?.startsWith("data:")) {
      cleaned.customSkin = "[IMAGE]";
    }
    if (cleaned.image?.startsWith("data:")) {
      cleaned.image = "[IMAGE]";
    }

    if (cleaned.visiblePlayers?.length > 5) {
      cleaned.visiblePlayers = `[${cleaned.visiblePlayers.length} players]`;
    }
    if (cleaned.visibleFood?.length > 10) {
      cleaned.visibleFood = `[${cleaned.visibleFood.length} food]`;
    }

    return cleaned;
  }

  out(type, data) {
    this.log("OUT", type, data);
  }

  in(type, data) {
    this.log("IN", type, data);
  }

  error(direction, type, error, data = null) {
    this.log(direction, type, data, false, error);
  }

  exportAsJSON() {
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], {
      type: "application/json",
    });
    this.downloadBlob(blob, `game-logs-${Date.now()}.json`);
  }

  exportAsText() {
    const lines = this.logs.map((log) => {
      const arrow = log.direction === "OUT" ? "→" : "←";
      const status = log.success ? "✓" : "✗";
      const base = `[${log.time}] ${arrow} ${status} ${log.type}`;
      const extra =
        log.error || log.data
          ? ` — ${log.error ? "Error: " + log.error : JSON.stringify(log.data)}`
          : "";
      return base + extra;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    this.downloadBlob(blob, `game-logs-${Date.now()}.txt`);
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

const logger = new Logger();
export default logger;
