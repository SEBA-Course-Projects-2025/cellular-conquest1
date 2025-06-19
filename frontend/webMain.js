function playSound() {}
const API_BASE = "/api/player";
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".wrapper").style.display = "none";
  const loginScreen = document.getElementById("loginScreen");
  const nicknameInput = document.getElementById("nicknameInput");
  if (localStorage.getItem("playerName")){
    nicknameInput.placeholder = localStorage.getItem("playerName");
  }
  const loginBtn = document.getElementById("loginBtn");
  const roomCodeModal = document.getElementById("roomCodeModal");
  const closeModal = document.getElementById("closeModal");
  const createRoomBtn = document.getElementById("createRoomBtn");
  const joinRoomBtn = document.getElementById("joinRoomBtn");
  const roomCodeInput = document.getElementById("roomCodeInput");
  const createdRoomInfo = document.getElementById("createdRoomInfo");
  const displayRoomCode = document.getElementById("displayRoomCode");
  const copyCodeBtn = document.getElementById("copyCodeBtn");
  const startGameBtn = document.getElementById("startGameBtn");
  let socket = null;
  let nickname = "";
  let currentRoomId = null;
  let currentGameMode = "ffa";

  const avatarDiv = document.querySelector(".avatar");
  const skinModal = document.getElementById("skinModal");
  const closeSkinModal = document.getElementById("closeSkinModal");
  const skinsList = document.getElementById("skinsList");
  const skinsBtn = document.getElementById("skinsBtn");
  const customSkinInput = document.getElementById("customSkinInput");
  const addCustomSkinBtn = document.getElementById("addCustomSkinBtn");

  const defaultSkins = [
    { name: "Green",  url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%237aff99'/%3E%3C/svg%3E" },
    { name: "Red",    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23ff4d4d'/%3E%3C/svg%3E" },
    { name: "Blue",   url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%234d7aff'/%3E%3C/svg%3E" },
    { name: "Yellow", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23ffe24d'/%3E%3C/svg%3E" },
    { name: "Purple", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23b84dff'/%3E%3C/svg%3E" }
  ];

  if (!localStorage.getItem("availableSkins")) {
    localStorage.setItem("availableSkins", JSON.stringify(defaultSkins));
  }
  
  if (!localStorage.getItem("selectedSkin")) {
    localStorage.setItem("selectedSkin", defaultSkins[0].url);
  }

  function renderSkins() {
    skinsList.innerHTML = "";
    
    let skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");

    const customSkin = localStorage.getItem("customSkin");
    if (customSkin && !skins.some(s => s.url === customSkin)) {
      skins.unshift({ name: "Custom", url: customSkin });
      localStorage.setItem("availableSkins", JSON.stringify(skins));
    }
    
    const selectedSkin = localStorage.getItem("selectedSkin") || skins[0]?.url;
    
    skins.forEach(skin => {
      if (!skin || !skin.url) return; 
      
      const img = document.createElement("img");
      img.src = skin.url;
      img.className = "skin-option" + (skin.url === selectedSkin ? " selected" : "");
      img.title = skin.name || "Skin";
      img.alt = skin.name || "Skin";
      img.onerror = () => {
        img.src = defaultSkins[0].url; 
        console.warn("Failed to load skin, using default instead");
      };
      img.onclick = () => {
        localStorage.setItem("selectedSkin", skin.url);
        updateAvatar();
        renderSkins();
      };
      skinsList.appendChild(img);
    });
  }

  function updateAvatar() {
    const selectedSkin = localStorage.getItem("selectedSkin");
    if (selectedSkin) {
      avatarDiv.classList.add("skin");
      avatarDiv.style.backgroundImage = `url('${selectedSkin}')`;
      avatarDiv.textContent = "";
    } else {
      avatarDiv.classList.remove("skin");
      avatarDiv.style.backgroundImage = "";
      avatarDiv.textContent = (nickname || "A").charAt(0).toUpperCase();
    }
  }

  addCustomSkinBtn.addEventListener("click", () => {
    const file = customSkinInput.files[0];
    if (!file) {
      alert("Будь ласка, виберіть файл зображення.");
      return;
    }
    if (file.size > 500000) {
      alert("Файл занадто великий. Максимальний розмір: 500KB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64 = e.target.result;
      
      localStorage.setItem("customSkin", base64);
      localStorage.setItem("selectedSkin", base64);
      
      let skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
      if (!skins.some(s => s.url === base64)) {
        skins.unshift({ name: "Custom", url: base64 });
        localStorage.setItem("availableSkins", JSON.stringify(skins));
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "updateSkin",
          customSkin: base64  
        }));
      }
      
      updateAvatar();
      renderSkins();
      skinModal.style.display = "none";
      customSkinInput.value = "";
    };
    reader.readAsDataURL(file);
  });

  skinsBtn.addEventListener("click", () => {
    renderSkins();
    skinModal.style.display = "flex";
  });
  
  closeSkinModal.addEventListener("click", () => {
    skinModal.style.display = "none";
  });
  
  window.addEventListener("click", (e) => {
    if (e.target === skinModal) skinModal.style.display = "none";
  });

  loginBtn.addEventListener("click", tryLogin);
  nicknameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryLogin();
  });

  function tryLogin() {
    nickname = nicknameInput.value.trim() || localStorage.getItem("playerName");
    if (!nickname) {
      alert("Please enter a nickname!");
      nicknameInput.focus();
      return;
    }
    localStorage.setItem("playerName", nickname);
    startGame(nickname);
  }

  function getWsHost() {
    const isLocal = location.hostname === "localhost" 
    || location.hostname.startsWith("192.168.") 
    || location.hostname === "127.0.0.1";
    return isLocal ? location.hostname + ":8080" : "161.35.75.14:8080";
  }

  function startGame(nick) {
    loginScreen.style.display = "none";
    document.querySelector(".wrapper").style.display = "block";
    document.querySelector(".nick").textContent = nick;
    updateAvatar();
    const wsHost = getWsHost();
    socket = new WebSocket("ws://" + wsHost);

    socket.addEventListener("open", () => {
      const selectedSkin = localStorage.getItem("selectedSkin") || defaultSkins[0].url;
      const customSkin = localStorage.getItem("customSkin");
      
      const joinMessage = { 
        type: "join", 
        nickname: nick
      };
      
      if (customSkin === selectedSkin) {
        joinMessage.customSkin = customSkin;
      }
      
      socket.send(JSON.stringify(joinMessage));
    });

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      
      if (data.availableSkins) {
        if (Array.isArray(data.availableSkins) && data.availableSkins.length > 0) {
          console.log("Отримано список скінів від сервера:", data.availableSkins);
          localStorage.setItem("availableSkins", JSON.stringify(data.availableSkins));
        }
      }
      
      if (data.type === "playerData") {
        if (data.roomId) currentRoomId = data.roomId;
      } else if (data.type === "gameState") {
        if (window.updateGameState) {
          window.updateGameState(data);
        }
      } else if (data.type === "error") {
        alert(data.message || "An error occurred");
      }
    });

    socket.addEventListener("close", () => { alert("Disconnected from server"); location.reload(); });
    socket.addEventListener("error", (err) => { alert("WebSocket error!"); console.error(err); });
  }

  closeModal.addEventListener("click", () =>
     { roomCodeModal.style.display = "none"; resetModal(); });
  window.addEventListener("click", (event) => 
    { if (event.target === roomCodeModal) { roomCodeModal.style.display = "none"; resetModal(); } });
  createRoomBtn.addEventListener("click", createRoom);
  joinRoomBtn.addEventListener("click", joinRoom);
  copyCodeBtn.addEventListener("click", copyRoomCode);
  startGameBtn.addEventListener("click", startTeamsGame);
  roomCodeInput.addEventListener("input", (e) => 
    { e.target.value = e.target.value.toUpperCase().replace(/[^A-F0-9-]/g, ""); });
  roomCodeInput.addEventListener("keydown", (e) => 
    { if (e.key === "Enter") joinRoom(); });
  
  function showRoomModal() { 
    if (!nickname) { 
      alert("Please enter a nickname and join the game first!"); 
      return; 
    } 
    
    const modalTitle = document.querySelector("#roomCodeModal h2");
    if (currentGameMode === "teams") {
      modalTitle.textContent = "Join Teams Room";
    } else if (currentGameMode === "deathmatch") {
      modalTitle.textContent = "Join Death Match Room";
    }
    
    roomCodeModal.style.display = "flex"; 
  }
  
  function resetModal() { createdRoomInfo.style.display = "none"; roomCodeInput.value = ""; displayRoomCode.textContent = ""; currentRoomId = null; }
  
  function createRoom() { 
    localStorage.setItem('privateRoomId', 'true'); 
    localStorage.setItem('gameMode', currentGameMode);
    playSound("success"); 
    const customSkin = localStorage.getItem("customSkin");
    const selectedSkin = localStorage.getItem("selectedSkin");
    if (customSkin === selectedSkin) {
      localStorage.setItem('gameCustomSkin', customSkin);
    }
    window.location.href = `gamePage.html`;
  }
  
  function joinRoom() { 
    const roomCode = roomCodeInput.value.trim(); 
    if (!roomCode) { 
      alert("Please enter a room code!"); 
      roomCodeInput.focus(); 
      return; 
    } 
    localStorage.setItem('privateRoomId', roomCode);
    localStorage.setItem('gameMode', currentGameMode);
    const customSkin = localStorage.getItem("customSkin");
    const selectedSkin = localStorage.getItem("selectedSkin");
    if (customSkin === selectedSkin) {
      localStorage.setItem('gameCustomSkin', customSkin);
    }
    
    playSound("success"); 
    window.location.href = `gamePage.html?nickname=${encodeURIComponent(nickname)}&mode=${currentGameMode}&roomId=${roomCode}`; 
  }
  
  function copyRoomCode() { const code = displayRoomCode.textContent; if (navigator.clipboard) { navigator.clipboard.writeText(code).then(() => { copyCodeBtn.textContent = "Copied!"; setTimeout(() => { copyCodeBtn.textContent = "Copy"; }, 2000); }); } else { const textArea = document.createElement("textarea"); textArea.value = code; document.body.appendChild(textArea); textArea.select(); document.execCommand("copy"); document.body.removeChild(textArea); copyCodeBtn.textContent = "Copied!"; setTimeout(() => { copyCodeBtn.textContent = "Copy"; }, 2000); } playSound("click"); }
  
  function startTeamsGame() { if (!currentRoomId) { alert("No room selected!"); return; } roomCodeModal.style.display = "none"; resetModal(); window.location.href = `gamePage.html`; }
  
  const modeButtons = document.querySelectorAll(".mode-btn");
  let selectedMode = "ffa";
  modeButtons.forEach((button) => { 
    button.addEventListener("click", function () { 
      modeButtons.forEach((btn) => btn.classList.remove("active")); 
      this.classList.add("active"); 
      selectedMode = this.dataset.mode; 
      currentGameMode = selectedMode;
      playSound("click"); 
      
      if (selectedMode === "ffa") { 
        localStorage.removeItem('privateRoomId');
        localStorage.setItem('gameMode', 'ffa');
        const nicknameValue = nicknameInput.value.trim() || document.querySelector(".nick").textContent; 
        if (!nicknameValue || nicknameValue === "Nickname") { 
          alert("Please enter a nickname and click Join Game first!"); 
          return; 
        } 
        window.location.href = `gamePage.html?nickname=${encodeURIComponent(nicknameValue)}`; 
      } else if (selectedMode === "teams") { 
        showRoomModal(); 
      } else if (selectedMode === "deathmatch") {
        const nicknameValue = nicknameInput.value.trim() || document.querySelector(".nick").textContent; 
        if (!nicknameValue || nicknameValue === "Nickname") { 
          alert("Please enter a nickname and click Join Game first!"); 
          return; 
        }
        localStorage.setItem('gameMode', 'deathmatch');
        const customSkin = localStorage.getItem("customSkin");
        const selectedSkin = localStorage.getItem("selectedSkin");
        if (customSkin === selectedSkin) {
          localStorage.setItem('gameCustomSkin', customSkin);
        }
        
        window.location.href = `gamePage.html?nickname=${encodeURIComponent(nicknameValue)}&mode=deathmatch&deathMatch=true`;
      }
    }); 
  });
  
  const allButtons = document.querySelectorAll("button");
  allButtons.forEach((button) => { button.addEventListener("mouseenter", function () { this.style.transform = "translateY(-3px)"; playSound("hover"); }); button.addEventListener("mouseleave", function () { this.style.transform = "translateY(0)"; }); });
  document.getElementById("settingsBtn").addEventListener("click", function () { playSound("click"); alert("Settings panel will open here"); });
  document.getElementById("logoutBtn").addEventListener("click", function () { playSound("click"); if (confirm("Are you sure you want to log out?")) { if (socket && socket.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ type: "leave" })); socket.close(); } localStorage.removeItem('privateRoomId'); document.querySelector(".wrapper").style.display = "none"; loginScreen.style.display = "block"; nicknameInput.value = ""; resetModal(); } });

  updateAvatar();
});