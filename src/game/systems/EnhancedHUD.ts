import * as THREE from 'three';

export class EnhancedHUD {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // Animated elements
  private scoreElement: HTMLElement | null = null;
  private comboElement: HTMLElement | null = null;
  private waveProgressBar: HTMLElement | null = null;
  private damageIndicators: HTMLElement[] = [];
  private threatWarnings: HTMLElement[] = [];

  // Animation states
  private currentScore: number = 0;
  private displayScore: number = 0;
  private comboLevel: number = 0;
  private lastDamageTime: number = 0;
  private threatPositions: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.container = document.createElement('div');
    this.container.className = 'enhanced-hud';
    document.body.appendChild(this.container);

    this.createEnhancedElements();
    this.createStylesheet();
  }

  private createEnhancedElements(): void {
    // Animated score counter with glow effect
    const scoreContainer = document.createElement('div');
    scoreContainer.className = 'animated-score-container';
    scoreContainer.innerHTML = `
      <div class="score-label">SCORE</div>
      <div class="animated-score" id="animated-score">0</div>
      <div class="score-addition" id="score-addition"></div>
    `;
    this.container.appendChild(scoreContainer);
    this.scoreElement = document.getElementById('animated-score');

    // Combo flame effect
    const comboContainer = document.createElement('div');
    comboContainer.className = 'combo-container';
    comboContainer.innerHTML = `
      <div class="combo-flames" id="combo-flames">
        <div class="flame flame-1"></div>
        <div class="flame flame-2"></div>
        <div class="flame flame-3"></div>
      </div>
      <div class="combo-text" id="combo-text">
        <span class="combo-label">COMBO</span>
        <span class="combo-value" id="combo-value">x1</span>
      </div>
    `;
    this.container.appendChild(comboContainer);
    this.comboElement = document.getElementById('combo-flames');

    // Wave progress bar
    const waveProgressContainer = document.createElement('div');
    waveProgressContainer.className = 'wave-progress-container';
    waveProgressContainer.innerHTML = `
      <div class="wave-label">WAVE PROGRESS</div>
      <div class="wave-progress-bar">
        <div class="wave-progress-fill" id="wave-progress-fill"></div>
        <div class="wave-progress-text" id="wave-progress-text">0%</div>
      </div>
    `;
    this.container.appendChild(waveProgressContainer);
    this.waveProgressBar = document.getElementById('wave-progress-fill');

    // Damage direction indicators
    for (let i = 0; i < 4; i++) {
      const indicator = document.createElement('div');
      indicator.className = 'damage-indicator';
      indicator.innerHTML = '<div class="damage-arrow"></div>';
      this.container.appendChild(indicator);
      this.damageIndicators.push(indicator);
    }

    // Threat proximity warnings
    const threatContainer = document.createElement('div');
    threatContainer.className = 'threat-container';
    threatContainer.innerHTML = `
      <div class="threat-radar" id="threat-radar">
        <div class="radar-sweep"></div>
        <div class="radar-center"></div>
      </div>
      <div class="threat-warnings" id="threat-warnings"></div>
    `;
    this.container.appendChild(threatContainer);

    // Health and shield with pulse effects
    const healthContainer = document.createElement('div');
    healthContainer.className = 'health-shield-container';
    healthContainer.innerHTML = `
      <div class="shield-display">
        <div class="shield-icon">🛡️</div>
        <div class="shield-bars" id="shield-bars">
          <div class="shield-bar-segment"></div>
          <div class="shield-bar-segment"></div>
          <div class="shield-bar-segment"></div>
        </div>
      </div>
      <div class="health-display">
        <div class="health-icon">❤️</div>
        <div class="health-bars" id="health-bars">
          <div class="health-bar-segment"></div>
          <div class="health-bar-segment"></div>
          <div class="health-bar-segment"></div>
          <div class="health-bar-segment"></div>
          <div class="health-bar-segment"></div>
        </div>
      </div>
    `;
    this.container.appendChild(healthContainer);

    // Weapon display with ammo counter
    const weaponContainer = document.createElement('div');
    weaponContainer.className = 'weapon-display-container';
    weaponContainer.innerHTML = `
      <div class="weapon-icon" id="weapon-icon">🔫</div>
      <div class="weapon-name" id="weapon-name">STANDARD</div>
      <div class="weapon-ammo" id="weapon-ammo">∞</div>
    `;
    this.container.appendChild(weaponContainer);
  }

  private createStylesheet(): void {
    const style = document.createElement('style');
    style.textContent = `
      .enhanced-hud {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 50;
        font-family: 'Courier New', monospace;
      }

      .enhanced-hud > * {
        pointer-events: auto;
      }

      /* Animated Score */
      .animated-score-container {
        position: absolute;
        top: 20px;
        right: 20px;
        text-align: right;
      }

      .score-label {
        font-size: 14px;
        color: #00d4ff;
        opacity: 0.8;
        letter-spacing: 2px;
      }

      .animated-score {
        font-size: 48px;
        font-weight: bold;
        color: #ffffff;
        text-shadow: 0 0 20px #00d4ff, 0 0 40px #00d4ff;
        transition: transform 0.1s;
        animation: score-pulse 0.5s ease-out;
      }

      @keyframes score-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      .score-addition {
        position: absolute;
        right: 0;
        top: 80px;
        font-size: 24px;
        color: #ffff00;
        font-weight: bold;
        opacity: 0;
        transform: translateY(0);
        animation: score-float 1s ease-out;
      }

      @keyframes score-float {
        0% {
          opacity: 1;
          transform: translateY(0);
        }
        100% {
          opacity: 0;
          transform: translateY(-50px);
        }
      }

      /* Combo Flames */
      .combo-container {
        position: absolute;
        top: 120px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .combo-flames {
        position: relative;
        width: 50px;
        height: 50px;
      }

      .flame {
        position: absolute;
        bottom: 0;
        width: 20px;
        height: 30px;
        background: linear-gradient(to top, #ff0000, #ff6600, #ffcc00);
        border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
        opacity: 0;
        transform-origin: bottom center;
        animation: flame-flicker 0.5s infinite alternate;
      }

      .flame-1 { left: 5px; animation-delay: 0s; }
      .flame-2 { left: 15px; animation-delay: 0.2s; }
      .flame-3 { left: 25px; animation-delay: 0.4s; }

      .combo-active .flame {
        opacity: 1;
      }

      @keyframes flame-flicker {
        0% {
          transform: scaleY(1) rotate(-2deg);
          filter: brightness(1);
        }
        100% {
          transform: scaleY(1.1) rotate(2deg);
          filter: brightness(1.2);
        }
      }

      .combo-text {
        display: flex;
        flex-direction: column;
      }

      .combo-label {
        font-size: 12px;
        color: #ff6600;
        letter-spacing: 1px;
      }

      .combo-value {
        font-size: 32px;
        font-weight: bold;
        color: #ffffff;
        text-shadow: 0 0 10px #ff6600;
      }

      /* Wave Progress */
      .wave-progress-container {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 300px;
      }

      .wave-label {
        text-align: center;
        font-size: 14px;
        color: #00d4ff;
        margin-bottom: 5px;
        letter-spacing: 2px;
      }

      .wave-progress-bar {
        position: relative;
        height: 20px;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid #00d4ff;
        border-radius: 10px;
        overflow: hidden;
      }

      .wave-progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00d4ff, #00ff88);
        transition: width 0.3s ease;
        animation: progress-glow 2s ease-in-out infinite;
      }

      @keyframes progress-glow {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.3); }
      }

      .wave-progress-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ffffff;
        font-weight: bold;
        font-size: 12px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      }

      /* Damage Indicators */
      .damage-indicator {
        position: absolute;
        width: 50px;
        height: 50px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .damage-indicator.active {
        opacity: 1;
        animation: damage-pulse 0.5s ease-out;
      }

      @keyframes damage-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
      }

      .damage-arrow {
        width: 0;
        height: 0;
        border-left: 25px solid transparent;
        border-right: 25px solid transparent;
        border-bottom: 40px solid #ff0000;
        filter: drop-shadow(0 0 10px #ff0000);
      }

      /* Threat Radar */
      .threat-container {
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 150px;
        height: 150px;
      }

      .threat-radar {
        position: relative;
        width: 100%;
        height: 100%;
        border: 2px solid #00ff00;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(0, 255, 0, 0.1), rgba(0, 255, 0, 0));
        overflow: hidden;
      }

      .radar-sweep {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 50%;
        height: 2px;
        background: linear-gradient(90deg, transparent, #00ff00);
        transform-origin: left center;
        animation: radar-sweep 2s linear infinite;
      }

      @keyframes radar-sweep {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .radar-center {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 10px;
        height: 10px;
        background: #00ff00;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 10px #00ff00;
      }

      /* Health and Shield */
      .health-shield-container {
        position: absolute;
        bottom: 20px;
        left: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .shield-display, .health-display {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .shield-icon, .health-icon {
        font-size: 24px;
      }

      .shield-bars, .health-bars {
        display: flex;
        gap: 5px;
      }

      .shield-bar-segment, .health-bar-segment {
        width: 30px;
        height: 10px;
        background: #00d4ff;
        border: 1px solid #ffffff;
        transition: all 0.3s;
      }

      .health-bar-segment {
        background: #00ff88;
      }

      .shield-bar-segment.depleted, .health-bar-segment.depleted {
        background: #333333;
        opacity: 0.5;
      }

      .shield-bar-segment.damaged, .health-bar-segment.damaged {
        animation: bar-flash 0.5s;
      }

      @keyframes bar-flash {
        0%, 100% { background: #ff0000; }
        50% { background: #ffffff; }
      }

      /* Weapon Display */
      .weapon-display-container {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px 20px;
        border: 2px solid #00d4ff;
        border-radius: 20px;
      }

      .weapon-icon {
        font-size: 32px;
      }

      .weapon-name {
        font-size: 18px;
        color: #ffffff;
        font-weight: bold;
        letter-spacing: 1px;
      }

      .weapon-ammo {
        font-size: 24px;
        color: #00d4ff;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }

  public updateScore(score: number, addition?: number): void {
    this.currentScore = score;

    // Animate score counter
    if (addition && addition > 0) {
      const additionEl = document.getElementById('score-addition');
      if (additionEl) {
        additionEl.textContent = `+${addition}`;
        additionEl.style.animation = 'none';
        void additionEl.offsetHeight; // Trigger reflow
        additionEl.style.animation = 'score-float 1s ease-out';
      }
    }

    // Smoothly animate score display
    const animateScore = () => {
      const diff = this.currentScore - this.displayScore;
      if (Math.abs(diff) < 1) {
        this.displayScore = this.currentScore;
      } else {
        this.displayScore += diff * 0.1;
        requestAnimationFrame(animateScore);
      }

      if (this.scoreElement) {
        this.scoreElement.textContent = Math.floor(this.displayScore).toString();
        // Pulse effect on score change
        if (diff > 0) {
          this.scoreElement.style.animation = 'none';
          void this.scoreElement.offsetHeight;
          this.scoreElement.style.animation = 'score-pulse 0.5s ease-out';
        }
      }
    };
    animateScore();
  }

  public updateCombo(multiplier: number): void {
    this.comboLevel = multiplier;
    const comboValue = document.getElementById('combo-value');
    const comboFlames = document.getElementById('combo-flames');

    if (comboValue) {
      comboValue.textContent = `x${multiplier}`;
    }

    if (comboFlames) {
      if (multiplier > 1) {
        comboFlames.classList.add('combo-active');
        // Scale flames based on multiplier
        const scale = Math.min(1 + (multiplier - 1) * 0.1, 2);
        comboFlames.style.transform = `scale(${scale})`;
      } else {
        comboFlames.classList.remove('combo-active');
        comboFlames.style.transform = 'scale(1)';
      }
    }
  }

  public updateWaveProgress(current: number, total: number): void {
    const progress = (current / total) * 100;

    if (this.waveProgressBar) {
      this.waveProgressBar.style.width = `${progress}%`;
    }

    const progressText = document.getElementById('wave-progress-text');
    if (progressText) {
      progressText.textContent = `${Math.floor(progress)}%`;
    }
  }

  public showDamageIndicator(damageDirection: THREE.Vector3): void {
    // Calculate screen position for damage indicator
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Calculate angle between damage source and camera forward
    const angle = Math.atan2(damageDirection.x - cameraDirection.x, damageDirection.z - cameraDirection.z);

    // Position indicator on screen edge
    const indicator = this.damageIndicators[0]; // Reuse first indicator for simplicity
    if (indicator) {
      const x = window.innerWidth / 2 + Math.sin(angle) * 200;
      const y = window.innerHeight / 2 - Math.cos(angle) * 200;

      indicator.style.left = `${x}px`;
      indicator.style.top = `${y}px`;
      indicator.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
      indicator.classList.add('active');

      setTimeout(() => {
        indicator.classList.remove('active');
      }, 1000);
    }
  }

  public updateThreatRadar(threats: THREE.Vector3[]): void {
    this.threatPositions = threats;

    // Update radar blips
    const radarEl = document.getElementById('threat-radar');
    if (!radarEl) return;

    // Clear existing blips
    const existingBlips = radarEl.querySelectorAll('.radar-blip');
    existingBlips.forEach(blip => blip.remove());

    // Add new blips for nearby threats
    const cameraPos = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPos);

    threats.forEach(threat => {
      const distance = threat.distanceTo(cameraPos);
      if (distance < 30) { // Only show nearby threats
        const relativePos = threat.clone().sub(cameraPos);
        const angle = Math.atan2(relativePos.x, relativePos.z);
        const radarDistance = Math.min(distance / 30, 1) * 60; // Scale to radar size

        const blip = document.createElement('div');
        blip.className = 'radar-blip';
        blip.style.cssText = `
          position: absolute;
          width: 4px;
          height: 4px;
          background: #ff0000;
          border-radius: 50%;
          top: ${75 - Math.cos(angle) * radarDistance}px;
          left: ${75 + Math.sin(angle) * radarDistance}px;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 5px #ff0000;
        `;
        radarEl.appendChild(blip);
      }
    });
  }

  public updateHealth(shield: number, maxShield: number, health: number, maxHealth: number): void {
    // Update shield bars
    const shieldBars = document.getElementById('shield-bars');
    if (shieldBars) {
      const segments = shieldBars.querySelectorAll('.shield-bar-segment');
      segments.forEach((segment, index) => {
        if (index < shield) {
          segment.classList.remove('depleted');
        } else {
          segment.classList.add('depleted');
        }
      });
    }

    // Update health bars
    const healthBars = document.getElementById('health-bars');
    if (healthBars) {
      const segments = healthBars.querySelectorAll('.health-bar-segment');
      segments.forEach((segment, index) => {
        if (index < health) {
          segment.classList.remove('depleted');
        } else {
          segment.classList.add('depleted');
        }
      });
    }
  }

  public updateWeapon(weaponName: string, ammo: number | null = null): void {
    const nameEl = document.getElementById('weapon-name');
    const ammoEl = document.getElementById('weapon-ammo');
    const iconEl = document.getElementById('weapon-icon');

    if (nameEl) {
      nameEl.textContent = weaponName.toUpperCase();
    }

    if (ammoEl) {
      ammoEl.textContent = ammo !== null ? ammo.toString() : '∞';
    }

    if (iconEl) {
      // Change icon based on weapon type
      const icons: { [key: string]: string } = {
        'STANDARD': '🔫',
        'RAPID': '⚡',
        'SPREAD': '🌟',
        'PIERCE': '➡️',
        'LASER': '⚔️'
      };
      iconEl.textContent = icons[weaponName.toUpperCase()] || '🔫';
    }
  }

  public dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}