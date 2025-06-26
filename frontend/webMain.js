function playSound() {}
const API_BASE = "/api/player";
document.addEventListener("DOMContentLoaded", function () {
  const nicknameInput = document.getElementById("nicknameInput");
  if (localStorage.getItem("playerName")){
    nicknameInput.value = localStorage.getItem("playerName");
  }
  
  const roomCodeModal = document.getElementById("roomCodeModal");
  const closeModal = document.getElementById("closeModal");
  const createRoomBtn = document.getElementById("createRoomBtn");
  const joinRoomBtn = document.getElementById("joinRoomBtn");
  const roomCodeInput = document.getElementById("roomCodeInput");
  const createdRoomInfo = document.getElementById("createdRoomInfo");
  const displayRoomCode = document.getElementById("displayRoomCode");
  const copyCodeBtn = document.getElementById("copyCodeBtn");
  const startGameBtn = document.getElementById("startGameBtn");
  let currentRoomId = null;
  let currentGameMode = "ffa";

  const avatarDiv = document.querySelector(".avatar");
  const skinModal = document.getElementById("skinModal");
  const closeSkinModal = document.getElementById("closeSkinModal");
  const skinsList = document.getElementById("skinsList");
  const skinsBtn = document.getElementById("skinsBtn");
  const customSkinInput = document.getElementById("customSkinInput");
  const addCustomSkinBtn = document.getElementById("addCustomSkinBtn");
  const resetSkinBtn = document.getElementById("resetSkinBtn");

  const defaultSkins = [
    { id: "green", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%237aff99'/%3E%3C/svg%3E", name: "Green", isDefault: true },
    { id: "red", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23ff4d4d'/%3E%3C/svg%3E", name: "Red", isDefault: true },
    { id: "blue", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%234d7aff'/%3E%3C/svg%3E", name: "Blue", isDefault: true },
    { id: "yellow", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23ffe24d'/%3E%3C/svg%3E", name: "Yellow", isDefault: true },
    { id: "purple", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23b84dff'/%3E%3C/svg%3E", name: "Purple", isDefault: true }
  ];

  function initializeSkins() {
    if (!localStorage.getItem("availableSkins")) {
      localStorage.setItem("availableSkins", JSON.stringify(defaultSkins));
    } else {
      let currentSkins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
      let needUpdate = false;
      
      defaultSkins.forEach(defaultSkin => {
        if (!currentSkins.find(s => s.id === defaultSkin.id)) {
          currentSkins.push(defaultSkin);
          needUpdate = true;
        }
      });
      
      if (needUpdate) {
        localStorage.setItem("availableSkins", JSON.stringify(currentSkins));
      }
    }
    
    const selectedSkinId = localStorage.getItem("selectedSkin");
    if (!selectedSkinId) {
      localStorage.setItem("selectedSkin", defaultSkins[0].id);
    } else {
      const skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
      const selectedSkin = skins.find(s => s.id === selectedSkinId);
      if (!selectedSkin) {
        console.warn("Selected skin not found, resetting to default");
        localStorage.setItem("selectedSkin", defaultSkins[0].id);
      }
    }
  }

  initializeSkins();

  function formatScore(score) {
    const num = parseInt(score);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  function animateScoreUpdate(element, newValue) {
    element.style.transform = 'scale(1.1)';
    element.style.color = 'var(--accent, #4CAF50)';
    element.textContent = formatScore(newValue);
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
      element.style.color = 'white';
    }, 300);
  }

  function updateScoresDisplay(animated = false) {
    const lastScore = localStorage.getItem("lastScore") || "0";
    const bestScore = localStorage.getItem("bestScore") || "0";
    
    const lastScoreElement = document.getElementById("lastScore");
    const bestScoreElement = document.getElementById("bestScore");
    
    if (lastScoreElement) {
      if (animated) {
        animateScoreUpdate(lastScoreElement, lastScore);
      } else {
        lastScoreElement.textContent = formatScore(lastScore);
      }
    }
    if (bestScoreElement) {
      bestScoreElement.textContent = formatScore(bestScore);
    }
  }

  function updateBestScore(newScore) {
    const currentBest = parseInt(localStorage.getItem("bestScore") || "0");
    const score = parseInt(newScore);
    
    if (score > currentBest) {
      localStorage.setItem("bestScore", score.toString());
      return true;
    }
    return false;
  }

  function generateCustomSkinId() {
    return "custom_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  function saveSelectedSkinForGame() {
    const selectedSkinId = localStorage.getItem("selectedSkin");
    const skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
    const selectedSkin = skins.find(s => s.id === selectedSkinId);
    
    if (selectedSkin && selectedSkin.image) {
      if (selectedSkin.isDefault) {
        localStorage.setItem('gameSelectedSkinId', selectedSkinId);
        localStorage.removeItem('gameCustomSkin');
      } else {
        localStorage.setItem('gameCustomSkin', selectedSkin.image);
        localStorage.removeItem('gameSelectedSkinId');
      }
    }
  }

  function renderSkins() {
    skinsList.innerHTML = "";
    
    let skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
    const selectedSkinId = localStorage.getItem("selectedSkin") || skins[0]?.id;
    
    skins.forEach(skin => {
      if (!skin || !skin.image) return; 
      
      const skinContainer = document.createElement("div");
      skinContainer.className = "skin-container";
      
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
      
      skinContainer.appendChild(img);
      
      if (!skin.isDefault && skin.id.startsWith("custom_")) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-skin-btn";
        deleteBtn.innerHTML = "×";
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteSkin(skin.id);
        };
        skinContainer.appendChild(deleteBtn);
      }
      
      skinsList.appendChild(skinContainer);
    });
  }

  function deleteSkin(skinId) {
    if (confirm("Are you sure you want to delete this custom skin?")) {
      let skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
      skins = skins.filter(s => s.id !== skinId);
      localStorage.setItem("availableSkins", JSON.stringify(skins));
      
      if (localStorage.getItem("selectedSkin") === skinId) {
        localStorage.setItem("selectedSkin", defaultSkins[0].id);
        updateAvatar();
      }
      
      renderSkins();
    }
  }

  function updateAvatar() {
    const selectedSkinId = localStorage.getItem("selectedSkin");
    const skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
    const selectedSkin = skins.find(s => s.id === selectedSkinId);
    const nickname = nicknameInput.value.trim() || localStorage.getItem("playerName") || "";
    
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

  function resetSkinsToDefault() {
    console.log("Resetting skins to default...");
    localStorage.setItem("selectedSkin", "green");
    updateAvatar();
    renderSkins();
  }

  nicknameInput.addEventListener('input', function() {
    localStorage.setItem("playerName", this.value.trim());
    updateAvatar();
  });

  addCustomSkinBtn.addEventListener("click", () => {
    const file = customSkinInput.files[0];
    if (!file) {
      alert("Please select a file.");
      return;
    }
    if (file.size > 500000) {
      alert("File is too big. Max size: 500KB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64 = e.target.result;
      const newSkinId = generateCustomSkinId();
      const fileName = file.name.split('.')[0] || "Custom";
      
      let skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
      const newSkin = {
        id: newSkinId,
        image: base64,
        name: fileName,
        isDefault: false
      };
    
      skins.push(newSkin);
      localStorage.setItem("availableSkins", JSON.stringify(skins));
      localStorage.setItem("selectedSkin", newSkinId);
      
      updateAvatar();
      renderSkins();
      customSkinInput.value = "";
      alert("Custom skin added successfully!");
    };
    reader.readAsDataURL(file);
  });

  resetSkinBtn.addEventListener("click", () => {
    resetSkinsToDefault();
    skinModal.style.display = "none";
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
    
    saveSelectedSkinForGame();
    
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
    
    saveSelectedSkinForGame(); 
    
    playSound("success"); 
    const nickname = nicknameInput.value.trim() || localStorage.getItem("playerName") || "";
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
        const nicknameValue = nicknameInput.value.trim() || localStorage.getItem("playerName") || "";
        if (!nicknameValue) { 
          alert("Please enter a nickname first!"); 
          nicknameInput.focus();
          return; 
        }
        
        saveSelectedSkinForGame(); 
        
        window.location.href = `gamePage.html?nickname=${encodeURIComponent(nicknameValue)}`;
      } else if (selectedMode === "teams") { 
        showRoomModal(); 
      } else if (selectedMode === "deathmatch") {
        const nicknameValue = nicknameInput.value.trim() || localStorage.getItem("playerName") || "";
        if (!nicknameValue) { 
          alert("Please enter a nickname first!"); 
          nicknameInput.focus();
          return; 
        }
        localStorage.setItem('gameMode', 'deathmatch');
        
        saveSelectedSkinForGame();
        
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
      nicknameInput.value = ""; 
      localStorage.removeItem("playerName");
      updateAvatar();
      resetModal(); 
    } 
  });

  updateScoresDisplay();

  window.addEventListener('storage', function(e) {
    if (e.key === 'lastScore') {
      updateScoresDisplay(true);
    } else if (e.key === 'bestScore') {
      updateScoresDisplay(false);
    }
  });
  
  window.addEventListener('focus', function() {
    updateScoresDisplay(false);
  });

  window.handleGameResult = function(finalScore) {
    localStorage.setItem("lastScore", finalScore.toString());
    const isNewRecord = updateBestScore(finalScore);
    
    setTimeout(() => {
      const lastScoreElement = document.getElementById("lastScore");
      if (lastScoreElement) {
        animateScoreUpdate(lastScoreElement, finalScore);
      }
      
      if (isNewRecord) {
        const bestScoreElement = document.getElementById("bestScore");
        if (bestScoreElement) {
          bestScoreElement.textContent = formatScore(finalScore);
          bestScoreElement.style.color = '#FFD700';
          setTimeout(() => {
            bestScoreElement.style.color = 'white';
          }, 1000);
        }
      }
    }, 500);
    
    return isNewRecord;
  };
  updateAvatar();
});