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
    { id: "green", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%237aff99'/%3E%3C/svg%3E", name: "Green" },
    { id: "red", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23ff4d4d'/%3E%3C/svg%3E", name: "Red" },
    { id: "blue", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%234d7aff'/%3E%3C/svg%3E", name: "Blue" },
    { id: "yellow", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23ffe24d'/%3E%3C/svg%3E", name: "Yellow" },
    { id: "purple", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23b84dff'/%3E%3C/svg%3E", name: "Purple" }
  ];

  if (!localStorage.getItem("availableSkins")) {
    localStorage.setItem("availableSkins", JSON.stringify(defaultSkins));
  }
  
  if (!localStorage.getItem("selectedSkin")) {
    localStorage.setItem("selectedSkin", defaultSkins[0].id);
  }

  function renderSkins() {
    skinsList.innerHTML = "";
    
    let skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");

    const customSkin = localStorage.getItem("customSkin");
    if (customSkin) {
      skins = skins.filter(s => s.id !== "custom");
      skins.unshift({ id: "custom", image: customSkin, name: "Custom" });
      localStorage.setItem("availableSkins", JSON.stringify(skins));
    }
    
    const selectedSkinId = localStorage.getItem("selectedSkin") || skins[0]?.id;
    
    skins.forEach(skin => {
      if (!skin || !skin.image) return; 
      
      const img = document.createElement("img");
      img.src = skin.image;
      img.className = "skin-option" + (skin.id === selectedSkinId ? " selected" : "");
      img.title = skin.name || "Skin";
      img.alt = skin.name || "Skin";
      img.onerror = () => {
        img.src = defaultSkins[0].image; 
        console.warn("Failed to load skin, using default instead");
      };
      img.onclick = () => {
        localStorage.setItem("selectedSkin", skin.id);
        updateAvatar();
        renderSkins();
      };
      skinsList.appendChild(img);
    });
  }

  function updateAvatar() {
    const selectedSkinId = localStorage.getItem("selectedSkin");
    const skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
    const selectedSkin = skins.find(s => s.id === selectedSkinId);
    
    if (selectedSkin && selectedSkin.image) {
      avatarDiv.classList.add("skin");
      avatarDiv.style.backgroundImage = `url('${selectedSkin.image}')`;
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
      alert("Please select the file.");
      return;
    }
    if (file.size > 500000) {
      alert("File is so big. Max size: 500KB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64 = e.target.result;
      
      localStorage.setItem("customSkin", base64);
      localStorage.setItem("selectedSkin", "custom");
      
      let skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
      skins = skins.filter(s => s.id !== "custom");
      skins.unshift({ id: "custom", image: base64, name: "Custom" });
      localStorage.setItem("availableSkins", JSON.stringify(skins));
      
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
    loginScreen.style.display = "none";
    document.querySelector(".wrapper").style.display = "block";
    document.querySelector(".nick").textContent = nickname;
    updateAvatar();
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
  
  function resetModal() { 
    createdRoomInfo.style.display = "none"; 
    roomCodeInput.value = ""; 
    displayRoomCode.textContent = ""; 
    currentRoomId = null; 
  }
  
  function createRoom() { 
    localStorage.setItem('privateRoomId', 'true'); 
    localStorage.setItem('gameMode', currentGameMode);
    playSound("success"); 
    
    const selectedSkinId = localStorage.getItem("selectedSkin");
    const customSkin = localStorage.getItem("customSkin");
    
    if (selectedSkinId === "custom" && customSkin) {
      localStorage.setItem('gameCustomSkin', customSkin);
    } else {
      localStorage.setItem('gameSelectedSkinId', selectedSkinId);
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
    
    const selectedSkinId = localStorage.getItem("selectedSkin");
    const customSkin = localStorage.getItem("customSkin");
    
    if (selectedSkinId === "custom" && customSkin) {
      localStorage.setItem('gameCustomSkin', customSkin);
    } else {
      localStorage.setItem('gameSelectedSkinId', selectedSkinId);
    }
    
    playSound("success"); 
    window.location.href = `gamePage.html?nickname=${encodeURIComponent(nickname)}&mode=${currentGameMode}&roomId=${roomCode}`; 
  }
  
  function copyRoomCode() { 
    const code = displayRoomCode.textContent; 
    if (navigator.clipboard) { 
      navigator.clipboard.writeText(code).then(() => { 
        copyCodeBtn.textContent = "Copied!"; 
        setTimeout(() => { copyCodeBtn.textContent = "Copy"; }, 2000); 
      }); 
    } else { 
      const textArea = document.createElement("textarea"); 
      textArea.value = code; 
      document.body.appendChild(textArea); 
      textArea.select(); 
      document.execCommand("copy"); 
      document.body.removeChild(textArea); 
      copyCodeBtn.textContent = "Copied!"; 
      setTimeout(() => { copyCodeBtn.textContent = "Copy"; }, 2000); 
    } 
    playSound("click"); 
  }
  
  function startTeamsGame() { 
    if (!currentRoomId) { 
      alert("No room selected!"); 
      return; 
    } 
    roomCodeModal.style.display = "none"; 
    resetModal(); 
    window.location.href = `gamePage.html`; 
  }
  
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
        
        const selectedSkinId = localStorage.getItem("selectedSkin");
        const customSkin = localStorage.getItem("customSkin");
        
        if (selectedSkinId === "custom" && customSkin) {
          localStorage.setItem('gameCustomSkin', customSkin);
        } else {
          localStorage.setItem('gameSelectedSkinId', selectedSkinId);
        }
        
        window.location.href = `gamePage.html?nickname=${encodeURIComponent(nicknameValue)}&mode=deathmatch&deathMatch=true`;
      }
    }); 
  });
  
  const allButtons = document.querySelectorAll("button");
  allButtons.forEach((button) => { 
    button.addEventListener("mouseenter", function () { 
      this.style.transform = "translateY(-3px)"; 
      playSound("hover"); 
    }); 
    button.addEventListener("mouseleave", function () { 
      this.style.transform = "translateY(0)"; 
    }); 
  });
  
  document.getElementById("settingsBtn").addEventListener("click", function () { 
    playSound("click"); 
    alert("Settings panel will open here"); 
  });
  
  document.getElementById("logoutBtn").addEventListener("click", function () { 
    playSound("click"); 
    if (confirm("Are you sure you want to log out?")) { 
      localStorage.removeItem('privateRoomId'); 
      document.querySelector(".wrapper").style.display = "none"; 
      loginScreen.style.display = "block"; 
      nicknameInput.value = ""; 
      resetModal(); 
    } 
  });

  updateAvatar();
});