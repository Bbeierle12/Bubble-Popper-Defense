import { ScoreManager } from './ScoreManager';
import { WaveManager } from './WaveManager';
import { SettingsManager } from './SettingsManager';
import { WeaponManager } from './WeaponManager';
import { ProgressionManager } from './ProgressionManager';
import { AchievementManager } from './AchievementManager';

export class UIManager {
  private scoreManager: ScoreManager;
  private waveManager: WaveManager;
  private settingsManager: SettingsManager;
  private weaponManager: WeaponManager | null = null;
  private progressionManager: ProgressionManager;
  private achievementManager: AchievementManager;
  private hudElement: HTMLElement | null;
  private eventListeners: Map<string, Function[]> = new Map();
  private achievementQueue: any[] = [];
  private lastPointerLockChange: number = 0;
  private readonly MENU_SHORTCUT_COOLDOWN = 500; // ms cooldown after pointer lock changes

  constructor(scoreManager: ScoreManager, waveManager: WaveManager, settingsManager: SettingsManager) {
    this.scoreManager = scoreManager;
    this.waveManager = waveManager;
    this.settingsManager = settingsManager;
    this.progressionManager = ProgressionManager.getInstance();
    this.achievementManager = AchievementManager.getInstance();
    this.hudElement = document.getElementById('hud');

    this.createHUD();
    this.setupShop();
    this.setupGameOver();
    this.setupSettings();
    this.setupProgressionMenu();
    this.setupAchievementNotifications();
    this.setupKeyboardListeners();
    this.setupProgressionListeners();
  }

  public setWeaponManager(weaponManager: WeaponManager): void {
    this.weaponManager = weaponManager;
  }

  private createHUD(): void {
    if (!this.hudElement) return;

    this.hudElement.innerHTML = `
      <!-- Top Bar - Score, Wave, Stars -->
      <div class="hud-top-bar">
        <div class="hud-score-section">
          <div class="score-label">SCORE</div>
          <div class="score-display" id="score">0</div>
          <div class="multiplier">x<span id="multiplier">1</span></div>
        </div>

        <div class="hud-center-section">
          <div class="wave-display">
            <div class="wave-label">WAVE <span id="wave-number">1</span></div>
            <div class="enemy-counter" id="enemy-counter">Enemies: 0/0</div>
          </div>
        </div>

        <div class="hud-currency-section">
          <div class="stars-display">⭐ <span id="stars">0</span></div>
          <div class="coins-display">💰 <span id="coins">0</span></div>
        </div>
      </div>

      <!-- Bottom Left - Health & Shield -->
      <div class="hud-health-section">
        <div class="health-shield-container">
          <div class="shield-row">
            <span class="health-label">Shield:</span>
            <div class="shield-bar" id="shield-bar"></div>
          </div>
          <div class="core-row">
            <span class="health-label">Core:</span>
            <div class="core-bar" id="core-bar"></div>
          </div>
        </div>
      </div>

      <!-- Bottom Center - Weapon Info -->
      <div class="hud-weapon-section">
        <div class="weapon-info">
          <span class="weapon-icon">🔫</span>
          <span class="weapon-name">Weapon: <span id="current-weapon">Standard</span></span>
          <span class="separator">|</span>
          <span class="bombs-info">Bombs: <span id="bomb-count">0</span> <span class="bomb-hint">(Press B)</span></span>
        </div>
      </div>

      <!-- Boss Health Bar (Hidden by default) -->
      <div class="boss-health-bar" id="boss-health-bar">
        <div class="boss-health-label">BOSS</div>
        <div class="boss-health-fill" id="boss-health-fill"></div>
      </div>

      <!-- UI Buttons -->
      <button class="settings-button" id="settings-button" title="Settings (S)">⚙️</button>
      <button class="progression-button" id="progression-button" title="Progression (P)">⭐</button>

      <!-- Pointer Lock Hint -->
      <div class="pointer-lock-hint" id="pointer-lock-hint">Click to play</div>

      <!-- Achievement Notification -->
      <div class="achievement-notification" id="achievement-notification"></div>
    `;

    // Setup settings button
    document.getElementById('settings-button')?.addEventListener('click', () => {
      this.toggleSettings();
    });

    // Setup progression button
    document.getElementById('progression-button')?.addEventListener('click', () => {
      this.toggleProgressionMenu();
    });
  }

  private setupShop(): void {
    const shopHTML = `
      <div class="shop-panel" id="shop-panel">
        <h2 class="shop-title">Wave Complete!</h2>
        <div id="shop-coins" style="text-align: center; font-size: 24px; margin-bottom: 20px;">
          Coins: <span id="shop-coins-value">0</span>
        </div>
        <div class="shop-sections">
          <div class="shop-section">
            <h3>Weapons</h3>
            <div class="shop-items" id="weapon-shop-items">
              <!-- Weapons will be populated dynamically -->
            </div>
          </div>
          <div class="shop-section">
            <h3>Items</h3>
            <div class="shop-items">
              <div class="shop-item" data-upgrade="bomb">
                <div class="shop-item-name">Screen Clear Bomb</div>
                <div class="shop-item-description">Destroy all bubbles on screen</div>
                <div class="shop-item-cost">💰 150</div>
              </div>
              <div class="shop-item" data-upgrade="shield">
                <div class="shop-item-name">Restore Shield</div>
                <div class="shop-item-description">Regenerate 1 shield point</div>
                <div class="shop-item-cost">💰 100</div>
              </div>
            </div>
          </div>
        </div>
        <button class="continue-button" id="continue-button">Continue to Next Wave</button>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', shopHTML);

    // Setup click handlers for shop items
    this.setupShopItemHandlers();

    // Setup continue button
    document.getElementById('continue-button')?.addEventListener('click', () => {
      this.hideShop();
      this.emit('shopContinue');
    });
  }

  private setupShopItemHandlers(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const shopItem = target.closest('.shop-item') as HTMLElement;

      if (shopItem && document.getElementById('shop-panel')?.classList.contains('active')) {
        const upgrade = shopItem.dataset.upgrade;
        if (upgrade) {
          this.handleShopPurchase(upgrade);
        }
      }
    });
  }

  private handleShopPurchase(upgrade: string): void {
    // Check if it's a weapon purchase
    if (upgrade === 'rapidFire' || upgrade === 'spreadShot' || upgrade === 'pierceShot') {
      if (!this.weaponManager) return;

      // Check if weapon is unlocked in progression
      if (!this.weaponManager.isWeaponUnlocked(upgrade as any)) {
        // Show notification that weapon needs to be unlocked first
        this.showAchievementNotification({
          name: 'Weapon Locked',
          description: 'Unlock this weapon with stars in the progression menu!',
          stars: 0,
          icon: '🔒'
        });
        return;
      }

      // Check if already purchased
      if (this.weaponManager.isWeaponPurchased(upgrade as any)) {
        // Just equip it
        this.weaponManager.setWeapon(upgrade as any);
        this.populateWeaponShop();
        return;
      }
    }

    let cost = 0;

    switch (upgrade) {
      case 'rapidFire':
        cost = 200;
        break;
      case 'spreadShot':
        cost = 350;
        break;
      case 'pierceShot':
        cost = 500;
        break;
      case 'bomb':
        cost = 150;
        break;
      case 'shield':
        cost = 100;
        break;
      default:
        return;
    }

    if (this.scoreManager.getCoins() >= cost) {
      this.scoreManager.spendCoins(cost);
      this.emit('purchase', { upgrade, cost });
      this.updateShopCoins();
      this.populateWeaponShop(); // Refresh weapon shop
    }
  }

  private updateShopCoins(): void {
    const coinsValue = document.getElementById('shop-coins-value');
    if (coinsValue) {
      coinsValue.textContent = this.scoreManager.getCoins().toString();
    }
  }

  private populateWeaponShop(): void {
    if (!this.weaponManager) return;

    const weaponShopItems = document.getElementById('weapon-shop-items');
    if (!weaponShopItems) return;

    weaponShopItems.innerHTML = '';

    const weapons = this.weaponManager.getAllWeapons();

    weapons.forEach((stats, weaponType) => {
      if (weaponType === 'standard') return; // Skip standard weapon

      const isUnlockedInProgression = this.weaponManager!.isWeaponUnlocked(weaponType);
      const isPurchased = this.weaponManager!.isWeaponPurchased(weaponType);
      const isCurrent = this.weaponManager!.getCurrentWeapon() === weaponType;

      const weaponItem = document.createElement('div');

      // Set classes based on state
      let itemClass = 'shop-item';
      if (!isUnlockedInProgression) {
        itemClass += ' locked';
      } else if (isPurchased) {
        itemClass += ' unlocked';
        if (isCurrent) {
          itemClass += ' equipped';
        }
      }

      weaponItem.className = itemClass;
      weaponItem.dataset.upgrade = weaponType;

      let costDisplay = '';
      if (!isUnlockedInProgression) {
        costDisplay = '🔒 Unlock with Stars';
      } else if (isPurchased) {
        costDisplay = isCurrent ? 'EQUIPPED' : 'EQUIP';
      } else {
        costDisplay = `💰 ${stats.cost}`;
      }

      weaponItem.innerHTML = `
        <div class="shop-item-name">${stats.name}</div>
        <div class="shop-item-description">${stats.description}</div>
        <div class="shop-item-cost">${costDisplay}</div>
      `;

      weaponShopItems.appendChild(weaponItem);
    });
  }

  private setupGameOver(): void {
    const gameOverHTML = `
      <div class="game-over-screen" id="game-over-screen">
        <h1 class="game-over-title">Game Over</h1>
        <div class="final-stats">
          <div>Final Score: <span id="final-score">0</span></div>
          <div>Waves Completed: <span id="final-wave">0</span></div>
        </div>
        <button class="restart-button" id="restart-button">Play Again</button>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', gameOverHTML);

    document.getElementById('restart-button')?.addEventListener('click', () => {
      this.hideGameOver();
      this.emit('restart');
    });
  }

  public update(): void {
    // Update HUD
    this.updateElement('score', this.scoreManager.getScore().toString());
    this.updateElement('multiplier', this.scoreManager.getMultiplier().toString());
    this.updateElement('coins', this.scoreManager.getCoins().toString());
    this.updateElement('wave-number', this.waveManager.getCurrentWave().toString());
    this.updateElement('stars', this.progressionManager.getTotalStars().toString());

    // Update weapon and bomb info
    if (this.weaponManager) {
      const weaponStats = this.weaponManager.getCurrentWeaponStats();
      this.updateElement('current-weapon', weaponStats.name);
      this.updateElement('bomb-count', this.weaponManager.getScreenClearBombs().toString());
    }

    // Update enemy counter
    const progress = this.waveManager.getWaveProgress();
    const enemyCounter = document.getElementById('enemy-counter');
    if (enemyCounter && this.waveManager.getCurrentWave() > 0) {
      if (this.waveManager.getCurrentWave() === 10) {
        enemyCounter.textContent = 'BOSS WAVE';
      } else {
        enemyCounter.textContent = `Enemies: ${progress.remaining}/${progress.total}`;
      }
    }
  }

  public updateShield(current: number, max: number): void {
    const shieldBar = document.getElementById('shield-bar');
    if (!shieldBar) return;

    shieldBar.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = `shield-pip ${i < current ? 'active' : ''}`;
      shieldBar.appendChild(pip);
    }
  }

  public updateCore(current: number, max: number): void {
    const coreBar = document.getElementById('core-bar');
    if (!coreBar) return;

    coreBar.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = `core-pip ${i < current ? 'active' : ''}`;
      coreBar.appendChild(pip);
    }
  }

  public showShop(): void {
    const shop = document.getElementById('shop-panel');
    const coinsValue = document.getElementById('shop-coins-value');
    if (shop && coinsValue) {
      coinsValue.textContent = this.scoreManager.getCoins().toString();
      this.populateWeaponShop(); // Populate weapon shop items
      shop.classList.add('active');
    }
  }

  public hideShop(): void {
    document.getElementById('shop-panel')?.classList.remove('active');
    // Re-request pointer lock after closing shop
    const canvas = document.querySelector('canvas');
    if (canvas && !document.getElementById('progression-panel')?.classList.contains('active') &&
        !document.getElementById('settings-panel')?.classList.contains('active')) {
      canvas.requestPointerLock();
    }
  }

  public showGameOver(score: number, wave: number): void {
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScore = document.getElementById('final-score');
    const finalWave = document.getElementById('final-wave');

    if (gameOverScreen && finalScore && finalWave) {
      finalScore.textContent = score.toString();
      finalWave.textContent = wave.toString();
      gameOverScreen.classList.add('active');
    }
  }

  public hideGameOver(): void {
    document.getElementById('game-over-screen')?.classList.remove('active');
  }

  private setupSettings(): void {
    const settings = this.settingsManager.getSettings();

    const settingsHTML = `
      <div class="settings-panel" id="settings-panel">
        <div class="settings-content">
          <h2 class="settings-title">Settings</h2>

          <!-- Tab Navigation -->
          <div class="settings-tabs">
            <button class="settings-tab active" data-tab="gameplay">Gameplay</button>
            <button class="settings-tab" data-tab="controls">Controls</button>
            <button class="settings-tab" data-tab="graphics">Graphics</button>
            <button class="settings-tab" data-tab="audio">Audio</button>
          </div>

          <!-- Gameplay Settings -->
          <div class="settings-tab-content active" id="gameplay-tab">
            <h3>Mouse Settings</h3>
            <div class="setting-group">
              <label for="sensitivity-slider">Mouse Sensitivity</label>
              <input type="range" id="sensitivity-slider" min="1" max="100" value="${Math.round(settings.mouseSensitivity * 10000)}" />
              <span id="sensitivity-value">${Math.round(settings.mouseSensitivity * 10000)}</span>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="invert-y-checkbox" ${settings.invertY ? 'checked' : ''} />
                Invert Y-Axis
              </label>
            </div>

            <h3>Field of View</h3>
            <div class="setting-group">
              <label for="fov-slider">FOV</label>
              <input type="range" id="fov-slider" min="60" max="120" value="${settings.fov}" />
              <span id="fov-value">${settings.fov}°</span>
            </div>
          </div>

          <!-- Controls Tab -->
          <div class="settings-tab-content" id="controls-tab">
            <h3>Key Bindings</h3>
            <div class="keybindings-list">
              ${settings.keyBindings.map(binding => `
                <div class="keybinding-item" data-action="${binding.action}">
                  <span class="keybinding-label">${binding.displayName}</span>
                  <button class="keybinding-button" data-action="${binding.action}">${this.formatKeyDisplay(binding.key)}</button>
                </div>
              `).join('')}
            </div>
            <button class="reset-bindings-button" id="reset-bindings">Reset to Defaults</button>
          </div>

          <!-- Graphics Tab -->
          <div class="settings-tab-content" id="graphics-tab">
            <h3>Display Settings</h3>
            <div class="setting-group">
              <label>
                <input type="checkbox" id="fullscreen-checkbox" ${settings.fullscreen ? 'checked' : ''} />
                Fullscreen
              </label>
            </div>

            <div class="setting-group">
              <label for="resolution-select">Resolution</label>
              <select id="resolution-select">
                <option value="auto" ${settings.resolution === 'auto' ? 'selected' : ''}>Auto</option>
                <option value="1920x1080" ${settings.resolution === '1920x1080' ? 'selected' : ''}>1920x1080</option>
                <option value="1600x900" ${settings.resolution === '1600x900' ? 'selected' : ''}>1600x900</option>
                <option value="1366x768" ${settings.resolution === '1366x768' ? 'selected' : ''}>1366x768</option>
                <option value="1280x720" ${settings.resolution === '1280x720' ? 'selected' : ''}>1280x720</option>
              </select>
            </div>

            <h3>Quality Settings</h3>
            <div class="setting-group">
              <label for="shadow-quality">Shadow Quality</label>
              <select id="shadow-quality">
                <option value="low" ${settings.shadowQuality === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${settings.shadowQuality === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${settings.shadowQuality === 'high' ? 'selected' : ''}>High</option>
              </select>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="antialiasing-checkbox" ${settings.antialiasing ? 'checked' : ''} />
                Anti-aliasing
              </label>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="vsync-checkbox" ${settings.vsync ? 'checked' : ''} />
                V-Sync
              </label>
            </div>

            <div class="setting-group">
              <label for="fps-slider">FPS Limit</label>
              <input type="range" id="fps-slider" min="30" max="240" step="30" value="${settings.fps}" />
              <span id="fps-value">${settings.fps}</span>
            </div>

            <div class="setting-group">
              <label for="render-distance-slider">Render Distance</label>
              <input type="range" id="render-distance-slider" min="100" max="5000" step="100" value="${settings.renderDistance}" />
              <span id="render-distance-value">${settings.renderDistance}</span>
            </div>
          </div>

          <!-- Audio Tab -->
          <div class="settings-tab-content" id="audio-tab">
            <h3>Volume Settings</h3>
            <div class="setting-group">
              <label for="volume-slider">Master Volume</label>
              <input type="range" id="volume-slider" min="0" max="100" value="${Math.round(settings.audioVolume * 100)}" />
              <span id="volume-value">${Math.round(settings.audioVolume * 100)}%</span>
            </div>
          </div>

          <div class="settings-hint">
            Press ESC or S to close settings
          </div>

          <button class="close-settings-button" id="close-settings-button">Close (ESC/S)</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', settingsHTML);

    // Setup sensitivity slider
    const sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    const sensitivityValue = document.getElementById('sensitivity-value');
    sensitivitySlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.settingsManager.setMouseSensitivity(value / 10000);
      if (sensitivityValue) sensitivityValue.textContent = value.toString();
    });

    // Setup volume slider
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const volumeValue = document.getElementById('volume-value');
    volumeSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.settingsManager.setAudioVolume(value / 100);
      if (volumeValue) volumeValue.textContent = value + '%';
    });

    // Setup invert Y checkbox
    const invertYCheckbox = document.getElementById('invert-y-checkbox') as HTMLInputElement;
    invertYCheckbox?.addEventListener('change', (e) => {
      this.settingsManager.setInvertY((e.target as HTMLInputElement).checked);
    });

    // Setup close button
    document.getElementById('close-settings-button')?.addEventListener('click', () => {
      this.hideSettings();
    });

    // Setup tab navigation
    this.setupSettingsTabs();

    // Setup new controls
    this.setupGraphicsSettings();
    this.setupControlsSettings();
    this.setupGameplaySettings();
  }

  private formatKeyDisplay(key: string): string {
    // Format special keys for better display
    const keyMap: { [key: string]: string } = {
      'mouse0': 'Left Click',
      'mouse1': 'Right Click',
      'mouse2': 'Middle Click',
      'shift': 'Shift',
      'control': 'Ctrl',
      'alt': 'Alt',
      'escape': 'Esc',
      'arrowup': '↑',
      'arrowdown': '↓',
      'arrowleft': '←',
      'arrowright': '→',
      ' ': 'Space'
    };
    return keyMap[key.toLowerCase()] || key.toUpperCase();
  }

  private setupSettingsTabs(): void {
    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.settings-tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = (tab as HTMLElement).dataset.tab;

        // Update active states
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`${targetTab}-tab`)?.classList.add('active');
      });
    });
  }

  private setupGraphicsSettings(): void {
    // Fullscreen
    document.getElementById('fullscreen-checkbox')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.settingsManager.setFullscreen(checked);
      if (checked) {
        document.documentElement.requestFullscreen();
      } else if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    });

    // Resolution
    document.getElementById('resolution-select')?.addEventListener('change', (e) => {
      this.settingsManager.setResolution((e.target as HTMLSelectElement).value);
    });

    // Shadow Quality
    document.getElementById('shadow-quality')?.addEventListener('change', (e) => {
      this.settingsManager.setShadowQuality((e.target as HTMLSelectElement).value as 'low' | 'medium' | 'high');
      this.emit('graphicsSettingsChanged');
    });

    // Anti-aliasing
    document.getElementById('antialiasing-checkbox')?.addEventListener('change', (e) => {
      this.settingsManager.setAntialiasing((e.target as HTMLInputElement).checked);
      this.emit('graphicsSettingsChanged');
    });

    // V-Sync
    document.getElementById('vsync-checkbox')?.addEventListener('change', (e) => {
      this.settingsManager.setVsync((e.target as HTMLInputElement).checked);
    });

    // FPS Limit
    const fpsSlider = document.getElementById('fps-slider') as HTMLInputElement;
    const fpsValue = document.getElementById('fps-value');
    fpsSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.settingsManager.setFPS(value);
      if (fpsValue) fpsValue.textContent = value.toString();
    });

    // Render Distance
    const renderSlider = document.getElementById('render-distance-slider') as HTMLInputElement;
    const renderValue = document.getElementById('render-distance-value');
    renderSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.settingsManager.setRenderDistance(value);
      if (renderValue) renderValue.textContent = value.toString();
      this.emit('graphicsSettingsChanged');
    });
  }

  private setupGameplaySettings(): void {
    // FOV Slider
    const fovSlider = document.getElementById('fov-slider') as HTMLInputElement;
    const fovValue = document.getElementById('fov-value');
    fovSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.settingsManager.setFOV(value);
      if (fovValue) fovValue.textContent = value + '°';
      this.emit('fovChanged', value);
    });
  }

  private setupControlsSettings(): void {
    // Setup key binding buttons
    const bindingButtons = document.querySelectorAll('.keybinding-button');
    bindingButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const btn = e.target as HTMLButtonElement;
        const action = btn.dataset.action;
        if (!action) return;

        // Enter rebinding mode
        btn.textContent = 'Press any key...';
        btn.classList.add('rebinding');

        const handleKeyPress = (event: KeyboardEvent) => {
          event.preventDefault();
          let key = event.key.toLowerCase();

          // Handle special keys
          if (event.key === ' ') key = ' ';
          if (event.key === 'Escape') {
            // Cancel rebinding
            const currentBinding = this.settingsManager.getKeyBinding(action);
            btn.textContent = this.formatKeyDisplay(currentBinding || '');
            btn.classList.remove('rebinding');
            document.removeEventListener('keydown', handleKeyPress);
            document.removeEventListener('mousedown', handleMousePress);
            return;
          }

          // Set new binding
          this.settingsManager.setKeyBinding(action, key);
          btn.textContent = this.formatKeyDisplay(key);
          btn.classList.remove('rebinding');

          // Update other buttons if there was a conflict
          this.refreshKeyBindingButtons();

          document.removeEventListener('keydown', handleKeyPress);
          document.removeEventListener('mousedown', handleMousePress);
        };

        const handleMousePress = (event: MouseEvent) => {
          event.preventDefault();
          const key = `mouse${event.button}`;

          // Set new binding
          this.settingsManager.setKeyBinding(action, key);
          btn.textContent = this.formatKeyDisplay(key);
          btn.classList.remove('rebinding');

          // Update other buttons if there was a conflict
          this.refreshKeyBindingButtons();

          document.removeEventListener('keydown', handleKeyPress);
          document.removeEventListener('mousedown', handleMousePress);
        };

        document.addEventListener('keydown', handleKeyPress);
        document.addEventListener('mousedown', handleMousePress);
      });
    });

    // Reset bindings button
    document.getElementById('reset-bindings')?.addEventListener('click', () => {
      this.settingsManager.resetKeyBindings();
      this.refreshKeyBindingButtons();
    });
  }

  private refreshKeyBindingButtons(): void {
    const bindings = this.settingsManager.getKeyBindings();
    bindings.forEach(binding => {
      const button = document.querySelector(`.keybinding-button[data-action="${binding.action}"]`) as HTMLButtonElement;
      if (button) {
        button.textContent = this.formatKeyDisplay(binding.key);
      }
    });
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (e) => {
      // Check if pointer is locked (player is actively playing)
      const isPointerLocked = document.pointerLockElement !== null;
      const timeSinceLastLockChange = Date.now() - this.lastPointerLockChange;
      const isInCooldown = timeSinceLastLockChange < this.MENU_SHORTCUT_COOLDOWN;

      if (e.key === 'Escape') {
        // Escape always works - close any open panels or release pointer lock
        if (document.getElementById('settings-panel')?.classList.contains('active')) {
          this.hideSettings();
        } else if (document.getElementById('progression-panel')?.classList.contains('active')) {
          this.hideProgressionMenu();
        }
      } else if (!isPointerLocked && !isInCooldown) {
        // Only allow menu shortcuts when:
        // 1. NOT actively playing (pointer not locked)
        // 2. AND enough time has passed since last pointer lock change (to prevent interference with movement)
        if (e.key.toLowerCase() === 'p') {
          // P key for progression menu
          this.toggleProgressionMenu();
        } else if (e.key.toLowerCase() === 's') {
          // S key for settings menu
          this.toggleSettings();
        }
      }
    });

    // Track pointer lock changes and hide pointer lock hint
    document.addEventListener('pointerlockchange', () => {
      this.lastPointerLockChange = Date.now();

      const hint = document.getElementById('pointer-lock-hint');
      if (hint) {
        hint.style.display = document.pointerLockElement ? 'none' : 'block';
      }
    });
  }

  private toggleSettings(): void {
    const panel = document.getElementById('settings-panel');
    if (panel?.classList.contains('active')) {
      this.hideSettings();
    } else {
      this.showSettings();
    }
  }

  private showSettings(): void {
    const panel = document.getElementById('settings-panel');
    if (panel) {
      // Exit pointer lock when opening settings
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      panel.classList.add('active');
    }
  }

  private hideSettings(): void {
    document.getElementById('settings-panel')?.classList.remove('active');
    // Re-request pointer lock after closing settings
    const canvas = document.querySelector('canvas');
    if (canvas && !document.getElementById('shop-panel')?.classList.contains('active') &&
        !document.getElementById('progression-panel')?.classList.contains('active')) {
      canvas.requestPointerLock();
    }
  }

  public showBossHealthBar(): void {
    const bossBar = document.getElementById('boss-health-bar');
    if (bossBar) {
      bossBar.classList.add('active');
    }
  }

  public hideBossHealthBar(): void {
    const bossBar = document.getElementById('boss-health-bar');
    if (bossBar) {
      bossBar.classList.remove('active');
    }
  }

  public updateBossHealth(current: number, max: number): void {
    const fill = document.getElementById('boss-health-fill');
    if (fill) {
      const percent = (current / max) * 100;
      fill.style.width = percent + '%';
    }
  }

  private updateElement(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Progression Menu
  private setupProgressionMenu(): void {
    const progressionHTML = `
      <div class="progression-panel" id="progression-panel">
        <div class="progression-content">
          <h2 class="progression-title">Progression</h2>
          <div class="progression-stars">
            <div class="stars-total">⭐ Total Stars: <span id="progression-stars">0</span></div>
          </div>

          <div class="progression-sections">
            <div class="progression-section">
              <h3>Weapon Unlocks</h3>
              <div class="unlock-tree" id="weapon-unlock-tree">
                <div class="unlock-item" data-weapon="rapidFire">
                  <div class="unlock-icon">🔥</div>
                  <div class="unlock-name">Rapid Fire</div>
                  <div class="unlock-cost">⭐ 10</div>
                  <div class="unlock-status locked">LOCKED</div>
                </div>
                <div class="unlock-item" data-weapon="spreadShot">
                  <div class="unlock-icon">🦅</div>
                  <div class="unlock-name">Spread Shot</div>
                  <div class="unlock-cost">⭐ 25</div>
                  <div class="unlock-status locked">LOCKED</div>
                </div>
                <div class="unlock-item" data-weapon="pierceShot">
                  <div class="unlock-icon">➡️</div>
                  <div class="unlock-name">Pierce Shot</div>
                  <div class="unlock-cost">⭐ 40</div>
                  <div class="unlock-status locked">LOCKED</div>
                </div>
                <div class="unlock-item" data-weapon="laserBeam">
                  <div class="unlock-icon">⚡</div>
                  <div class="unlock-name">Laser Beam</div>
                  <div class="unlock-cost">⭐ 60</div>
                  <div class="unlock-status locked">LOCKED</div>
                </div>
              </div>
            </div>

            <div class="progression-section">
              <h3>Achievements (<span id="achievement-count">0/25</span>)</h3>
              <div class="achievements-list" id="achievements-list"></div>
            </div>
          </div>

          <div class="progression-stats">
            <h3>Statistics</h3>
            <div id="progression-stats-content"></div>
          </div>

          <button class="close-progression-button" id="close-progression-button">Close (ESC/P)</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', progressionHTML);

    // Setup close button
    document.getElementById('close-progression-button')?.addEventListener('click', () => {
      this.hideProgressionMenu();
    });

    // Setup unlock buttons
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const unlockItem = target.closest('.unlock-item') as HTMLElement;

      if (unlockItem && document.getElementById('progression-panel')?.classList.contains('active')) {
        const weapon = unlockItem.dataset.weapon;
        if (weapon && this.progressionManager.canUnlockWeapon(weapon)) {
          if (this.progressionManager.unlockWeapon(weapon)) {
            this.updateProgressionMenu();
            this.showAchievementNotification({
              name: 'Weapon Unlocked!',
              description: `You can now purchase ${weapon} from the shop!`,
              stars: 0,
              icon: '🔓'
            });
          }
        }
      }
    });
  }

  private setupAchievementNotifications(): void {
    // Achievement notification is already in the HUD
    // This method sets up the queue processing
    setInterval(() => {
      if (this.achievementQueue.length > 0 && !document.querySelector('.achievement-notification.active')) {
        const achievement = this.achievementQueue.shift();
        this.showAchievementNotification(achievement);
      }
    }, 100);
  }

  private setupProgressionListeners(): void {
    // Listen to progression events
    (this.progressionManager as any).addEventListener('starsEarned', () => {
      this.updateStarsDisplay();
      this.updateProgressionMenu();
    });

    (this.progressionManager as any).addEventListener('weaponUnlocked', () => {
      this.updateProgressionMenu();
    });

    (this.achievementManager as any).addEventListener('achievementUnlocked', (e: any) => {
      this.achievementQueue.push(e.achievement);
      this.updateProgressionMenu();
    });
  }

  private showAchievementNotification(achievement: any): void {
    const notification = document.getElementById('achievement-notification');
    if (!notification) return;

    notification.innerHTML = `
      <div class="achievement-content">
        <div class="achievement-icon">${achievement.icon || '🏆'}</div>
        <div class="achievement-info">
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-description">${achievement.description}</div>
          ${achievement.stars > 0 ? `<div class="achievement-stars">+${achievement.stars} ⭐</div>` : ''}
        </div>
      </div>
    `;

    notification.classList.add('active');

    setTimeout(() => {
      notification.classList.remove('active');
    }, 3000);
  }

  private toggleProgressionMenu(): void {
    const panel = document.getElementById('progression-panel');
    if (panel?.classList.contains('active')) {
      this.hideProgressionMenu();
    } else {
      this.showProgressionMenu();
    }
  }

  private showProgressionMenu(): void {
    const panel = document.getElementById('progression-panel');
    if (panel) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      this.updateProgressionMenu();
      panel.classList.add('active');
    }
  }

  private hideProgressionMenu(): void {
    document.getElementById('progression-panel')?.classList.remove('active');
    // Re-request pointer lock after closing progression menu
    const canvas = document.querySelector('canvas');
    if (canvas && !document.getElementById('shop-panel')?.classList.contains('active') &&
        !document.getElementById('settings-panel')?.classList.contains('active')) {
      canvas.requestPointerLock();
    }
  }

  private updateProgressionMenu(): void {
    // Update stars
    const starsElement = document.getElementById('progression-stars');
    if (starsElement) {
      starsElement.textContent = this.progressionManager.getTotalStars().toString();
    }

    // Update weapon unlocks
    const unlockTree = document.getElementById('weapon-unlock-tree');
    if (unlockTree) {
      const weapons = ['rapidFire', 'spreadShot', 'pierceShot', 'laserBeam'];
      weapons.forEach(weapon => {
        const item = unlockTree.querySelector(`[data-weapon="${weapon}"]`) as HTMLElement;
        if (item) {
          const status = item.querySelector('.unlock-status') as HTMLElement;
          if (this.progressionManager.isWeaponUnlocked(weapon)) {
            status.textContent = 'UNLOCKED';
            status.className = 'unlock-status unlocked';
            item.classList.add('unlocked');
          } else if (this.progressionManager.canUnlockWeapon(weapon)) {
            status.textContent = 'UNLOCK';
            status.className = 'unlock-status available';
            item.classList.add('available');
          } else {
            status.textContent = 'LOCKED';
            status.className = 'unlock-status locked';
            item.classList.remove('available', 'unlocked');
          }
        }
      });
    }

    // Update achievements
    const achievementsList = document.getElementById('achievements-list');
    const achievementCount = document.getElementById('achievement-count');
    if (achievementsList && achievementCount) {
      const progress = this.achievementManager.getAchievementProgress();
      achievementCount.textContent = `${progress.unlocked}/${progress.total}`;

      achievementsList.innerHTML = '';

      // Show unlocked achievements first
      progress.unlockedAchievements.forEach(ach => {
        const achElement = document.createElement('div');
        achElement.className = 'achievement-item unlocked';
        achElement.innerHTML = `
          <div class="achievement-icon">${ach.icon}</div>
          <div class="achievement-details">
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-description">${ach.description}</div>
          </div>
          <div class="achievement-reward">⭐ ${ach.stars}</div>
        `;
        achievementsList.appendChild(achElement);
      });

      // Show locked achievements
      progress.lockedAchievements.forEach(ach => {
        const achElement = document.createElement('div');
        achElement.className = 'achievement-item locked';
        achElement.innerHTML = `
          <div class="achievement-icon">🔒</div>
          <div class="achievement-details">
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-description">${ach.description}</div>
          </div>
          <div class="achievement-reward">⭐ ${ach.stars}</div>
        `;
        achievementsList.appendChild(achElement);
      });
    }

    // Update statistics
    const statsContent = document.getElementById('progression-stats-content');
    if (statsContent) {
      const stats = this.progressionManager.getStatistics();

      const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      };

      statsContent.innerHTML = `
        <div class="stat-item">Total Bubbles Popped: ${stats.totalBubblesPopped}</div>
        <div class="stat-item">Highest Wave: ${stats.highestWave}</div>
        <div class="stat-item">Total Play Time: ${formatTime(stats.totalPlayTime)}</div>
        <div class="stat-item">Perfect Waves: ${stats.perfectWaves}</div>
        <div class="stat-item">Highest Combo: ${stats.highestCombo}</div>
        <div class="stat-item">Total Coins Earned: ${stats.totalCoinsEarned}</div>
        <div class="stat-item">Bosses Defeated: ${stats.totalBossesDefeated}</div>
      `;
    }
  }

  private updateStarsDisplay(): void {
    const starsElement = document.getElementById('stars');
    if (starsElement) {
      starsElement.textContent = this.progressionManager.getTotalStars().toString();
    }
  }
}
