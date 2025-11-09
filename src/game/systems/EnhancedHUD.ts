import * as THREE from 'three';

export class EnhancedHUD {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // Animated elements
  private comboElement: HTMLElement | null = null;
  private damageIndicators: HTMLElement[] = [];
  private threatWarnings: HTMLElement[] = [];

  // Animation states
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
    // Only create unique visual effects, not duplicate UI elements

    // Combo flame effect (visual enhancement only)
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

    // Damage direction indicators
    for (let i = 0; i < 4; i++) {
      const indicator = document.createElement('div');
      indicator.className = 'damage-indicator';
      indicator.innerHTML = '<div class="damage-arrow"></div>';
      this.container.appendChild(indicator);
      this.damageIndicators.push(indicator);
    }

    // Threat proximity warnings (minimap radar)
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

    // Sprint indicator visual effect
    const sprintIndicator = document.createElement('div');
    sprintIndicator.className = 'sprint-indicator';
    sprintIndicator.id = 'sprint-indicator';
    sprintIndicator.innerHTML = `
      <div class="sprint-icon">⚡</div>
      <div class="sprint-bar">
        <div class="sprint-bar-fill" id="sprint-bar-fill"></div>
      </div>
      <div class="sprint-label">SPRINT</div>
    `;
    this.container.appendChild(sprintIndicator);
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
        pointer-events: none;
      }


      /* Combo Flames */
      .combo-container {
        position: absolute;
        top: 100px;
        left: 30px;
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

      /* Threat Radar / Minimap */
      .threat-container {
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 120px;
        height: 120px;
      }

      .threat-radar {
        position: relative;
        width: 100%;
        height: 100%;
        border: 2px solid rgba(0, 255, 0, 0.5);
        border-radius: 50%;
        background: radial-gradient(circle, rgba(0, 255, 0, 0.1), rgba(0, 0, 0, 0.4));
        overflow: hidden;
        backdrop-filter: blur(5px);
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



      /* Sprint Indicator */
      .sprint-indicator {
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.6);
        padding: 8px 16px;
        border: 2px solid rgba(255, 170, 0, 0.5);
        border-radius: 15px;
        opacity: 0.4;
        transition: all 0.3s ease;
      }

      .sprint-indicator.active {
        opacity: 1;
        border-color: #ffaa00;
        box-shadow: 0 0 20px rgba(255, 170, 0, 0.6);
      }

      .sprint-icon {
        font-size: 24px;
        animation: sprint-pulse 0.5s ease-in-out infinite;
      }

      .sprint-bar {
        width: 80px;
        height: 8px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid rgba(255, 170, 0, 0.3);
      }

      .sprint-bar-fill {
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, #ff6600, #ffaa00);
        border-radius: 4px;
        transition: opacity 0.2s;
      }

      .sprint-label {
        font-size: 12px;
        color: #ffaa00;
        font-weight: bold;
        letter-spacing: 1px;
      }

      @keyframes sprint-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
    `;
    document.head.appendChild(style);
  }

  public updateScore(_score: number, _addition?: number): void {
    // Score is now handled by UIManager, this method kept for compatibility
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

  public updateWaveProgress(_current: number, _total: number): void {
    // Wave progress is now handled by UIManager, this method kept for compatibility
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

  public updateHealth(_shield: number, _maxShield: number, _health: number, _maxHealth: number): void {
    // Health is now handled by UIManager, this method kept for compatibility
  }

  public updateWeapon(_weaponName: string, _ammo: number | null = null): void {
    // Weapon display is now handled by UIManager, this method kept for compatibility
  }

  public updateSprintIndicator(isSprinting: boolean): void {
    const sprintIndicator = document.getElementById('sprint-indicator');
    
    if (sprintIndicator) {
      if (isSprinting) {
        sprintIndicator.classList.add('active');
      } else {
        sprintIndicator.classList.remove('active');
      }
    }
  }

  public dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}