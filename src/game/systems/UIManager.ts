import { ScoreManager } from './ScoreManager';
import { WaveManager } from './WaveManager';

export class UIManager {
  private scoreManager: ScoreManager;
  private waveManager: WaveManager;
  private hudElement: HTMLElement | null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(scoreManager: ScoreManager, waveManager: WaveManager) {
    this.scoreManager = scoreManager;
    this.waveManager = waveManager;
    this.hudElement = document.getElementById('hud');
    
    this.createHUD();
    this.setupShop();
    this.setupGameOver();
  }

  private createHUD(): void {
    if (!this.hudElement) return;

    this.hudElement.innerHTML = `
      <div class="hud-top">
        <div class="hud-left">
          <div>
            <div>Shield:</div>
            <div class="shield-bar" id="shield-bar"></div>
          </div>
          <div>
            <div>Core:</div>
            <div class="core-bar" id="core-bar"></div>
          </div>
        </div>
        <div class="hud-right">
          <div class="score-display" id="score">0</div>
          <div class="wave-info">
            <span>Wave <span id="wave-number">1</span></span>
            <span class="multiplier">x<span id="multiplier">1</span></span>
          </div>
          <div>Coins: <span id="coins">0</span></div>
        </div>
      </div>
    `;
  }

  private setupShop(): void {
    const shopHTML = `
      <div class="shop-panel" id="shop-panel">
        <h2 class="shop-title">Wave Complete!</h2>
        <div id="shop-coins" style="text-align: center; font-size: 24px; margin-bottom: 20px;">
          Coins: <span id="shop-coins-value">0</span>
        </div>
        <div class="shop-items">
          <div class="shop-item" data-upgrade="firerate">
            <div class="shop-item-name">Fire Rate +25%</div>
            <div class="shop-item-description">Shoot faster</div>
            <div class="shop-item-cost">💰 50</div>
          </div>
          <div class="shop-item" data-upgrade="damage">
            <div class="shop-item-name">Damage Boost</div>
            <div class="shop-item-description">Pop bubbles faster</div>
            <div class="shop-item-cost">💰 100</div>
          </div>
          <div class="shop-item" data-upgrade="shield">
            <div class="shop-item-name">Restore Shield</div>
            <div class="shop-item-description">Regenerate 1 shield point</div>
            <div class="shop-item-cost">💰 100</div>
          </div>
        </div>
        <button class="continue-button" id="continue-button">Continue to Next Wave</button>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', shopHTML);

    // Setup continue button
    document.getElementById('continue-button')?.addEventListener('click', () => {
      this.hideShop();
      this.emit('shopContinue');
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
      shop.classList.add('active');
    }
  }

  public hideShop(): void {
    document.getElementById('shop-panel')?.classList.remove('active');
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
}
