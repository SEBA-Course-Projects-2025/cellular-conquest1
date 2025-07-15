function playSound() {}
function getBestScore() {
  return parseInt(localStorage.getItem("bestScore") || "0");
}

function calculateLevel(totalScore) {
  return Math.floor(totalScore / 1000);
}

function calculateTotalExperience() {
  return parseInt(localStorage.getItem("totalExperience") || "0");
}

function getCurrentLevelProgress(bestScore) {
  const currentLevel = calculateLevel(bestScore);
  const currentLevelXp = currentLevel * 1000;
  const nextLevelXp = (currentLevel + 1) * 1000;
  const progressXp = bestScore - currentLevelXp;
  const neededXp = nextLevelXp - currentLevelXp;
  
  return {
    level: currentLevel,
    progressXp: progressXp,
    neededXp: neededXp,
    percentage: Math.floor((progressXp / neededXp) * 100)
  };
}

function updateLevel(newScore) {
  const currentTotalXp = calculateTotalExperience();
  const newTotalXp = currentTotalXp + parseInt(newScore);
  
  const oldLevel = calculateLevel(currentTotalXp);
  const newLevel = calculateLevel(newTotalXp);
  
  localStorage.setItem("totalExperience", newTotalXp.toString());
  
  if (newLevel > oldLevel) {
    playSound("levelup");
    showLevelUpNotification(oldLevel, newLevel);
    return true;
  }
  return false;
}

function showLevelUpNotification(oldLevel, newLevel) {
  const notification = document.createElement('div');
  notification.className = 'level-up-notification';
  notification.innerHTML = `
    <div class="level-up-content">
      <div class="level-up-icon">🎉</div>
      <div class="level-up-text">LEVEL UP!</div>
      <div class="level-up-levels">${oldLevel} → ${newLevel}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 3000);
}

function showSkinSelectedNotification(skinName) {
  console.log("📢 Showing skin notification for:", skinName); // Debug
  
  const notification = document.createElement('div');
  notification.className = 'skin-selected-notification';
  notification.innerHTML = `
    <div class="skin-selected-content">
      <div class="skin-selected-icon">✅</div>
      <div class="skin-selected-text">Skin Selected!</div>
      <div class="skin-selected-name">${skinName}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  console.log("📢 Notification element added to DOM"); // Debug
  
  setTimeout(() => {
    notification.classList.add('show');
    console.log("📢 Notification should be visible now"); // Debug
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 1500);
}

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
    const bestScore = getBestScore();
    console.log("💯 Current scores - Last:", lastScore, "Best:", bestScore);

    if (parseInt(lastScore) > bestScore) {
      console.log("🔄 Updating best score to match last score");
      localStorage.setItem("bestScore", lastScore);
      updateBestScore(lastScore);
      return; 
  }
    const levelInfo = getCurrentLevelProgress(bestScore);
    console.log("📊 Level info:", levelInfo);

    const lastScoreElement = document.getElementById("lastScore");
    const bestScoreElement = document.getElementById("bestScore");
    const levelElement = document.getElementById("playerLevel");
    const xpElement = document.getElementById("playerXp");
    const progressBar = document.getElementById("levelProgressBar");

    
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
    
    if (levelElement) {
      levelElement.textContent = `Level ${levelInfo.level}`;
    }
    
    if (xpElement) {
      xpElement.textContent = `${levelInfo.progressXp}/${levelInfo.neededXp} XP (${levelInfo.percentage}%)`;
    }
    
    if (progressBar) {
      progressBar.style.width = `${levelInfo.percentage}%`;
    }
  }

  function updateBestScore(newScore) {
    const currentBest = getBestScore();
    const score = parseInt(newScore);
    
    if (score > currentBest) {
      localStorage.setItem("bestScore", score.toString());

      const bestScoreElement = document.getElementById("bestScore");
      if(bestScoreElement){
        bestScoreElement.textContent= formatScore(score);
        bestScoreElement.style.color = '#FFD700';
        bestScoreElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
          bestScoreElement.style.color = 'white';
          bestScoreElement.style.transform = 'scale(1)';
        }, 1000);
      }
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
    
    console.log("💾 Saving skin for game:", selectedSkin?.name, selectedSkin?.isDefault ? "(Default)" : "(Custom)");
    
    if (selectedSkin && selectedSkin.image) {
      localStorage.setItem('customSkin', selectedSkin.image);
      
      if (selectedSkin.isDefault) {
        localStorage.setItem('gameSelectedSkinId', selectedSkinId);
        localStorage.removeItem('gameCustomSkin');
        console.log("✅ Saved default skin as customSkin:", selectedSkinId);
      } else {
        localStorage.setItem('gameCustomSkin', selectedSkin.image);
        localStorage.removeItem('gameSelectedSkinId');
        console.log("✅ Saved custom skin as customSkin");
      }
    } else {
      console.warn("⚠️ No valid skin found, using fallback");
      const fallbackSkin = defaultSkins.find(s => s.id === 'green') || defaultSkins[0];
      localStorage.setItem('customSkin', fallbackSkin.image);
      localStorage.setItem('gameSelectedSkinId', fallbackSkin.id);
      localStorage.removeItem('gameCustomSkin');
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
        console.log("🎨 Selecting skin:", skin.name, skin.isDefault ? "(Default)" : "(Custom)");
        localStorage.setItem("selectedSkin", skin.id);
        updateAvatar();
        renderSkins();
        showSkinSelectedNotification(skin.name); 
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
    console.log("🔄 Resetting skins to default...");
    localStorage.setItem("selectedSkin", "blue");
    updateAvatar();
    renderSkins();
    showSkinSelectedNotification("Blue");
  }
  
  function testSkinSelection() {
    const selectedSkinId = localStorage.getItem("selectedSkin");
    const skins = JSON.parse(localStorage.getItem("availableSkins") || "[]");
    const selectedSkin = skins.find(s => s.id === selectedSkinId);
    
    console.log("🎨 Skin Debug Info:");
    console.log("Selected Skin ID:", selectedSkinId);
    console.log("Selected Skin Object:", selectedSkin);
    console.log("Available Skins:", skins.length);
    console.log("CustomSkin in localStorage:", localStorage.getItem('customSkin') ? "SET" : "NOT SET");
    console.log("Game Custom Skin:", localStorage.getItem('gameCustomSkin') ? "SET" : "NOT SET");
    console.log("Game Selected Skin ID:", localStorage.getItem('gameSelectedSkinId'));
    
    if (selectedSkin) {
      console.log("✅ Skin is valid:", selectedSkin.name, selectedSkin.isDefault ? "(Default)" : "(Custom)");
    } else {
      console.log("❌ Skin not found! Resetting...");
      resetSkinsToDefault();
    }
  }
  window.testSkins = testSkinSelection;

  nicknameInput.addEventListener('input', function() {
    let value = this.value.trim();
    if (value.length > 20) {
      value = value.substring(0, 20);
      this.value = value;
    }
    value = value.replace(/[^a-zA-Z0-9_-]/g, ''); 
    this.value = value;
    localStorage.setItem("playerName", value);
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

      showSkinSelectedNotification(fileName);
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
  
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsModal = document.getElementById("closeSettingsModal");
  const settingsBtn = document.getElementById("settingsBtn");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const resetSettingsBtn = document.getElementById("resetSettingsBtn");
  const defaultSettings = {
    graphics: {
      effects: 2,
      particles: true,
      shake: 50,
      theme: 'default'
    },
    sound: {
      master: 70,
      music: 50,
      sfx: 80,
      voiceChat: false
    },
    controls: {
      sensitivity: 5,
      autoSplit: false,
      scheme: 'default',
      mobileControls: true
    },
    game: {
      fps: false,
      leaderboard: true,
      aimAssist: 25,
      speedMode: 'normal'
    }
  };

  function loadSettings() {
    const saved = localStorage.getItem('gameSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  }

  function saveSettings(settings) {
    localStorage.setItem('gameSettings', JSON.stringify(settings));
  }

  function applySettingsToUI() {
    const settings = loadSettings();
    
    document.getElementById('effectsSlider').value = settings.graphics.effects;
    document.getElementById('particlesToggle').checked = settings.graphics.particles;
    document.getElementById('shakeSlider').value = settings.graphics.shake;
    document.getElementById('themeSelect').value = settings.graphics.theme;

    document.getElementById('masterVolume').value = settings.sound.master;
    document.getElementById('musicVolume').value = settings.sound.music;
    document.getElementById('sfxVolume').value = settings.sound.sfx;
    document.getElementById('voiceChatToggle').checked = settings.sound.voiceChat;
    
    document.getElementById('mouseSensitivity').value = settings.controls.sensitivity;
    document.getElementById('autoSplitToggle').checked = settings.controls.autoSplit;
    document.getElementById('controlScheme').value = settings.controls.scheme;
    document.getElementById('mobileControlsToggle').checked = settings.controls.mobileControls;
    
    document.getElementById('fpsToggle').checked = settings.game.fps;
    document.getElementById('leaderboardToggle').checked = settings.game.leaderboard;
    document.getElementById('aimAssist').value = settings.game.aimAssist;
    document.getElementById('speedMode').value = settings.game.speedMode;

    updateAllSliderValues();
    applyTheme(settings.graphics.theme);
  }

  function updateAllSliderValues() {
    const sliders = document.querySelectorAll('.setting-slider');
    sliders.forEach(slider => {
      const valueSpan = slider.parentNode.querySelector('.setting-value');
      if (valueSpan) {
        updateSliderValue(slider, valueSpan);
      }
    });
  }

  function updateSliderValue(slider, valueSpan) {
    const value = slider.value;
    const max = slider.max;
    
    if (slider.id === 'effectsSlider') {
      const levels = ['Off', 'Low', 'Medium', 'High'];
      valueSpan.textContent = levels[value];
    } else if (slider.id.includes('Volume') || slider.id === 'shakeSlider' || slider.id === 'aimAssist') {
      valueSpan.textContent = value + '%';
    } else {
      valueSpan.textContent = value;
    }
  }

  function applyTheme(theme) {
    document.body.className = theme !== 'default' ? `theme-${theme}` : '';
    
    const root = document.documentElement;
    switch(theme) {
      case 'dark':
        root.style.setProperty('--bg-color', '#0a0a0a');
        root.style.setProperty('--accent', '#bb86fc');
        break;
      case 'neon':
        root.style.setProperty('--bg-color', '#1a0033');
        root.style.setProperty('--accent', '#ff00ff');
        break;
      case 'forest':
        root.style.setProperty('--bg-color', '#0d2818');
        root.style.setProperty('--accent', '#00ff88');
        break;
      default:
        root.style.setProperty('--bg-color', '#0b1a2c');
        root.style.setProperty('--accent', '#7aff99');
    }
  }

  function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.querySelector(`[data-tab="${targetTab}"].tab-content`).classList.add('active');
        
        playSound("click");
      });
    });
  }

  function setupSettingsListeners() {
    document.querySelectorAll('.setting-slider').forEach(slider => {
      const valueSpan = slider.parentNode.querySelector('.setting-value');
      
      slider.addEventListener('input', () => {
        updateSliderValue(slider, valueSpan);
      });
    });

    document.getElementById('themeSelect').addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });

    saveSettingsBtn.addEventListener('click', () => {
      const settings = {
        graphics: {
          effects: parseInt(document.getElementById('effectsSlider').value),
          particles: document.getElementById('particlesToggle').checked,
          shake: parseInt(document.getElementById('shakeSlider').value),
          theme: document.getElementById('themeSelect').value
        },
        sound: {
          master: parseInt(document.getElementById('masterVolume').value),
          music: parseInt(document.getElementById('musicVolume').value),
          sfx: parseInt(document.getElementById('sfxVolume').value),
          voiceChat: document.getElementById('voiceChatToggle').checked
        },
        controls: {
          sensitivity: parseInt(document.getElementById('mouseSensitivity').value),
          autoSplit: document.getElementById('autoSplitToggle').checked,
          scheme: document.getElementById('controlScheme').value,
          mobileControls: document.getElementById('mobileControlsToggle').checked
        },
        game: {
          fps: document.getElementById('fpsToggle').checked,
          leaderboard: document.getElementById('leaderboardToggle').checked,
          aimAssist: parseInt(document.getElementById('aimAssist').value),
          speedMode: document.getElementById('speedMode').value
        }
      };

      saveSettings(settings);
      
      saveSettingsBtn.textContent = '✅ Saved!';
      setTimeout(() => {
        saveSettingsBtn.innerHTML = '💾 Save Settings';
      }, 2000);
      
      playSound("success");
    });
    
    resetSettingsBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all settings to default?')) {
        saveSettings(defaultSettings);
        applySettingsToUI();
        playSound("click");
      }
    });
  }

  function createCharacterCounter() {
    const counter = document.createElement('div');
    counter.className = 'character-counter';
    nicknameInput.parentNode.insertBefore(counter, nicknameInput.nextSibling);
    return counter;
  }

  const characterCounter = createCharacterCounter();

  nicknameInput.addEventListener('input', function() {
    let value = this.value.trim();
    const maxLength = 20;
    
    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
      this.value = value;
    }
    
    value = value.replace(/[^a-zA-Z0-9_-]/g, '');
    this.value = value;
    
    characterCounter.textContent = `${value.length}/${maxLength}`;
    
    if (value.length >= maxLength - 3) {
      characterCounter.classList.add('warning');
    } else {
      characterCounter.classList.remove('warning');
    }
    
    if (value.length > 0 && value.length < 2) {
      this.style.borderColor = '#ff4444';
      this.title = 'Nickname must be at least 2 characters';
    } else {
      this.style.borderColor = 'rgba(122, 255, 153, 0.3)';
      this.title = '';
    }
    
    localStorage.setItem("playerName", value);
    updateAvatar();
  });

  settingsBtn.addEventListener("click", function () {
    applySettingsToUI();
    settingsModal.style.display = "flex";
    playSound("click");
  });

  closeSettingsModal.addEventListener("click", () => {
    settingsModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = "none";
    }
  });

  setupTabs();
  setupSettingsListeners();
  applySettingsToUI();

  document.getElementById("logoutBtn").addEventListener("click", function () {
    playSound("click");
    if (confirm("Are you sure you want to log out? This will also reset your settings and XP.")) {
      localStorage.removeItem('privateRoomId');
      localStorage.removeItem('gameSettings');
      localStorage.removeItem('totalExperience'); 
      nicknameInput.value = "";
      localStorage.removeItem("playerName");
      updateAvatar();
      resetModal();
      applyTheme('default');
      updateScoresDisplay(); 
    }
  });

  updateScoresDisplay();

  console.log("🔍 Level System Debug:");
  console.log("Total XP:", calculateTotalExperience());
  console.log("Current Level:", calculateLevel(calculateTotalExperience()));
  console.log("Level Progress:", getCurrentLevelProgress(calculateTotalExperience()));

  if (calculateTotalExperience() === 0) {
    console.log("📝 No XP found, initializing with test data...");
    localStorage.setItem("totalExperience", "500"); 
    updateScoresDisplay();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'lastScore') {
      updateScoresDisplay(true);
    } else if (e.key === 'bestScore') {
      updateScoresDisplay(false);
    } else if (e.key === 'totalExperience') {
      updateScoresDisplay(false);
    }
  });
  
  window.addEventListener('focus', function() {
    updateScoresDisplay(false);
  });

  window.handleGameResult = function(finalScore) {
    localStorage.setItem("lastScore", finalScore.toString());
    const isNewRecord = updateBestScore(finalScore);
    const isLevelUp = updateLevel(finalScore);
    
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
      
      updateScoresDisplay(false);
    }, 500);
    
    return { isNewRecord, isLevelUp };
  };

  setTimeout(() => {
    updateScoresDisplay();
    console.log("🔄 Force updating display...");
  }, 1000);

  updateAvatar();
});