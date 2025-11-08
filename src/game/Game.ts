import * as THREE from 'three';
import { Player } from './entities/Player';
import { BubbleManager } from './systems/BubbleManager';
import { WaveManager } from './systems/WaveManager';
import { InputManager } from './systems/InputManager';
import { UIManager } from './systems/UIManager';
import { ScoreManager } from './systems/ScoreManager';
import { ParticleSystem } from './systems/ParticleSystem';
import { AudioManager } from './systems/AudioManager';
import { SettingsManager } from './systems/SettingsManager';
import { WeaponManager } from './systems/WeaponManager';
import { ProgressionManager } from './systems/ProgressionManager';
import { AchievementManager } from './systems/AchievementManager';
import { ShieldVisualizer } from './systems/ShieldVisualizer';
import { HealthVisualizer } from './systems/HealthVisualizer';
import { EnvironmentEnhancer } from './systems/EnvironmentEnhancer';
import { EnhancedHUD } from './systems/EnhancedHUD';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private bubbleManager: BubbleManager;
  private waveManager: WaveManager;
  private uiManager: UIManager;
  private scoreManager: ScoreManager;
  private particleSystem: ParticleSystem;
  private audioManager: AudioManager;
  private settingsManager: SettingsManager;
  private weaponManager: WeaponManager;
  private progressionManager: ProgressionManager;
  private achievementManager: AchievementManager;
  private shieldVisualizer: ShieldVisualizer;
  private healthVisualizer: HealthVisualizer;
  private environmentEnhancer: EnvironmentEnhancer;
  private enhancedHUD: EnhancedHUD;
  private clock: THREE.Clock;
  private isRunning: boolean = false;

  // Tracking for achievements
  private noPurchasesMade: boolean = true;

  // Screen shake
  private shakeIntensity: number = 0;
  private cameraBasePosition: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    // Initialize core Three.js components
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.clock = new THREE.Clock();

    this.setupRenderer();
    this.setupCamera();
    this.setupScene();
    this.setupLights();

    // Initialize game systems
    this.settingsManager = new SettingsManager();
    this.audioManager = new AudioManager();
    this.scoreManager = new ScoreManager();
    this.progressionManager = ProgressionManager.getInstance();
    this.achievementManager = AchievementManager.getInstance();
    this.particleSystem = new ParticleSystem(this.scene);
    this.weaponManager = new WeaponManager(this.scene);
    this.player = new Player(this.scene, this.particleSystem, this.weaponManager);
    this.bubbleManager = new BubbleManager(this.scene, this.particleSystem, this.scoreManager, this.audioManager);
    this.waveManager = new WaveManager(this.bubbleManager);
    // Input manager handles player controls
    new InputManager(this.camera, this.player, this.settingsManager);
    this.uiManager = new UIManager(this.scoreManager, this.waveManager, this.settingsManager);
    this.uiManager.setWeaponManager(this.weaponManager);

    // Initialize visual systems
    this.shieldVisualizer = new ShieldVisualizer(this.scene, this.camera);
    this.healthVisualizer = new HealthVisualizer(this.scene, this.camera, this.renderer);
    this.environmentEnhancer = new EnvironmentEnhancer(this.scene, this.renderer);
    this.enhancedHUD = new EnhancedHUD(this.scene, this.camera);

    // Sync audio volume with settings
    this.audioManager.setVolume(this.settingsManager.getAudioVolume());
    this.settingsManager.on('settingsChanged', () => {
      this.audioManager.setVolume(this.settingsManager.getAudioVolume());
    });

    this.setupEventListeners();

    // Wire up player shooting to audio and effects
    this.player.on('shoot', () => {
      this.audioManager.playShootSound();
      this.shake(2); // Small shake on shoot
      this.achievementManager.onProjectileFired();
    });

    // Wire up score updates to enhanced HUD
    this.scoreManager.on('scoreChanged', (data: any) => {
      this.enhancedHUD.updateScore(data.score, data.addition);
    });

    this.scoreManager.on('multiplierChanged', (multiplier: number) => {
      this.enhancedHUD.updateCombo(multiplier);
    });

    // Wire up screen clear bomb
    this.weaponManager.on('screenClearActivated', () => {
      this.activateScreenClear();
    });

    // Attach player gun to camera for first-person view
    this.player.setCamera(this.camera);
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container')?.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    // First-person camera
    this.camera.position.set(0, 5, 0);
    this.cameraBasePosition.copy(this.camera.position);
    this.camera.lookAt(0, 5, -10);
  }

  private setupScene(): void {
    // Basic background (EnvironmentEnhancer will provide the skybox)
    this.scene.background = new THREE.Color(0x0a0a1a);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // The grid is now replaced by the animated grid in EnvironmentEnhancer
  }

  private setupLights(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    // Accent lights
    const blueLight = new THREE.PointLight(0x00d4ff, 1, 50);
    blueLight.position.set(-10, 5, 0);
    this.scene.add(blueLight);

    const pinkLight = new THREE.PointLight(0xff0055, 1, 50);
    pinkLight.position.set(10, 5, 0);
    this.scene.add(pinkLight);
  }

  private setupEventListeners(): void {
    // Update UI and visual systems with player health
    this.player.on('shieldHit', () => {
      this.uiManager.updateShield(this.player.getShield(), this.player.getMaxShield());
      this.shieldVisualizer.onShieldHit();
      this.shieldVisualizer.activateShield(this.player.getShield(), this.player.getMaxShield());
      this.enhancedHUD.updateHealth(
        this.player.getShield(),
        this.player.getMaxShield(),
        this.player.getCoreHealth(),
        this.player.getMaxCoreHealth()
      );
      // Show damage indicator
      this.enhancedHUD.showDamageIndicator(new THREE.Vector3(0, 0, -1)); // TODO: Use actual damage direction
      this.audioManager.playShieldHitSound();
      this.shake(5); // Medium shake on shield hit
    });

    this.player.on('coreHit', () => {
      this.uiManager.updateCore(this.player.getCoreHealth(), this.player.getMaxCoreHealth());
      this.healthVisualizer.updateHealth(this.player.getCoreHealth(), this.player.getMaxCoreHealth());
      this.healthVisualizer.onDamageTaken();
      this.enhancedHUD.updateHealth(
        this.player.getShield(),
        this.player.getMaxShield(),
        this.player.getCoreHealth(),
        this.player.getMaxCoreHealth()
      );
      this.enhancedHUD.showDamageIndicator(new THREE.Vector3(0, 0, -1)); // TODO: Use actual damage direction
      this.audioManager.playDamageSound();
      this.shake(8); // Large shake on core damage
    });

    this.player.on('shieldRegenerated', () => {
      this.uiManager.updateShield(this.player.getShield(), this.player.getMaxShield());
      this.shieldVisualizer.activateShield(this.player.getShield(), this.player.getMaxShield());
    });

    this.player.on('shieldBroken', () => {
      this.shieldVisualizer.onShieldBreak();
      this.shieldVisualizer.activateShield(0, this.player.getMaxShield());
    });

    // Wave completion
    this.waveManager.on('waveComplete', (wave: number) => {
      this.scoreManager.addWaveReward(wave);

      // Award stars for wave completion
      const perfectWave = this.player.getCoreHealth() === this.player.getMaxCoreHealth();
      this.progressionManager.earnStarsForWave(wave, perfectWave);

      // Track achievements
      this.achievementManager.onWaveCompleted(wave, perfectWave);

      // Check game over achievements
      if (wave >= 10 && this.noPurchasesMade) {
        this.achievementManager.onGameOver(this.player.getCoreHealth(), wave, true);
      }

      this.uiManager.showShop();
      this.uiManager.hideBossHealthBar();
      this.player.regenerateShield();
      this.audioManager.playWaveCompleteSound();
    });

    // Boss wave
    this.waveManager.on('bossSpawned', () => {
      const boss = this.bubbleManager.getBoss();
      if (boss) {
        this.uiManager.showBossHealthBar();
        this.uiManager.updateBossHealth(boss.health, boss.maxHealth);
      }
    });

    // Boss damage
    this.bubbleManager.on('bossDamaged', (data: any) => {
      this.uiManager.updateBossHealth(data.health, data.maxHealth);
      this.shake(3); // Shake when hitting boss
    });

    // Boss defeated
    this.bubbleManager.on('bossDefeated', () => {
      this.uiManager.hideBossHealthBar();
      this.shake(10); // Big shake on boss defeat
      this.achievementManager.onBossDefeated();
    });

    // Game over
    this.player.on('coreDestroyed', () => {
      this.gameOver();
    });

    // Shop continue
    this.uiManager.on('shopContinue', () => {
      this.waveManager.nextWave();
    });

    // Restart
    this.uiManager.on('restart', () => {
      this.restart();
    });

    // Shop purchases
    this.uiManager.on('purchase', (data: any) => {
      this.handlePurchase(data.upgrade);
    });
  }

  private handlePurchase(upgrade: string): void {
    // Track that purchases have been made (for secret achievement)
    this.noPurchasesMade = false;

    switch (upgrade) {
      case 'rapidFire':
        this.weaponManager.purchaseWeapon('rapidFire');
        this.weaponManager.setWeapon('rapidFire');
        this.enhancedHUD.updateWeapon('Rapid Fire');
        break;
      case 'spreadShot':
        this.weaponManager.purchaseWeapon('spreadShot');
        this.weaponManager.setWeapon('spreadShot');
        this.enhancedHUD.updateWeapon('Spread Shot');
        break;
      case 'pierceShot':
        this.weaponManager.purchaseWeapon('pierceShot');
        this.weaponManager.setWeapon('pierceShot');
        this.enhancedHUD.updateWeapon('Pierce Shot');
        break;
      case 'bomb':
        this.weaponManager.addScreenClearBomb();
        break;
      case 'shield':
        this.player.regenerateShield();
        this.enhancedHUD.updateHealth(
          this.player.getShield(),
          this.player.getMaxShield(),
          this.player.getCoreHealth(),
          this.player.getMaxCoreHealth()
        );
        break;
    }
  }

  public start(): void {
    this.isRunning = true;

    // Initialize UI with player health
    this.uiManager.updateShield(this.player.getShield(), this.player.getMaxShield());
    this.uiManager.updateCore(this.player.getCoreHealth(), this.player.getMaxCoreHealth());

    // Initialize visual systems
    this.shieldVisualizer.activateShield(this.player.getShield(), this.player.getMaxShield());
    this.healthVisualizer.updateHealth(this.player.getCoreHealth(), this.player.getMaxCoreHealth());

    // Initialize enhanced HUD
    this.enhancedHUD.updateHealth(
      this.player.getShield(),
      this.player.getMaxShield(),
      this.player.getCoreHealth(),
      this.player.getMaxCoreHealth()
    );
    this.enhancedHUD.updateScore(0, 0);
    this.enhancedHUD.updateCombo(1);
    this.enhancedHUD.updateWeapon('Standard');
    this.enhancedHUD.updateWaveProgress(0, 10);

    this.waveManager.startWave(1);
    this.animate();
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    // Update screen shake
    this.updateScreenShake();

    // Update all systems
    this.player.update(deltaTime);
    this.weaponManager.update(deltaTime);
    this.bubbleManager.update(deltaTime, this.player);
    this.waveManager.update(deltaTime);
    this.particleSystem.update(deltaTime);
    this.shieldVisualizer.update(deltaTime);
    this.healthVisualizer.update(deltaTime);
    this.environmentEnhancer.update(deltaTime);
    this.uiManager.update();

    // Update enhanced HUD
    const currentEnemies = this.bubbleManager.getBubbles().length;
    const totalEnemies = this.waveManager.getTotalEnemies ? this.waveManager.getTotalEnemies() : currentEnemies;
    this.enhancedHUD.updateWaveProgress(totalEnemies - currentEnemies, totalEnemies);

    // Update threat radar with bubble positions
    const threats = this.bubbleManager.getBubbles().map(b => b.position);
    this.enhancedHUD.updateThreatRadar(threats);

    // Check projectile-bubble collisions
    this.checkProjectileCollisions();

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  private checkProjectileCollisions(): void {
    const projectiles = this.weaponManager.getProjectiles();
    const bubbles = this.bubbleManager.getBubbles();

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i];
      let projectileHit = false;
      let hitsThisFrame = 0;

      for (let j = bubbles.length - 1; j >= 0; j--) {
        const bubble = bubbles[j];

        // Skip if pierce projectile already hit this bubble
        if (projectile.hitBubbles && projectile.hitBubbles.has(j)) {
          continue;
        }

        // Calculate distance between projectile and bubble
        const distance = projectile.mesh.position.distanceTo(bubble.position);
        const hitRadius = bubble.radius + 0.1; // Small margin

        if (distance < hitRadius) {
          // Hit the bubble
          const bubbleType = bubble.type || 'standard';
          const combo = this.scoreManager.getMultiplier();
          const weaponType = this.weaponManager.getCurrentWeapon();

          this.bubbleManager.hitBubbleAtIndex(j);
          this.shake(5); // Shake on hit
          hitsThisFrame++;

          // Create hit sparks effect
          this.particleSystem.createHitSparks(projectile.mesh.position.clone());

          // Track achievements
          this.achievementManager.onBubblePopped(bubbleType, combo, weaponType);
          this.achievementManager.onProjectileHit();

          // Track hit for pierce projectiles
          if (projectile.maxPierces && projectile.pierceCount !== undefined) {
            projectile.hitBubbles = projectile.hitBubbles || new Set();
            projectile.hitBubbles.add(j);
            projectile.pierceCount++;

            // Check pierce shot multi-hit achievement
            if (projectile.pierceCount >= 3) {
              this.achievementManager.onPierceShotMultiHit(projectile.pierceCount);
            }

            // Remove projectile if pierce limit reached
            if (projectile.pierceCount >= projectile.maxPierces) {
              projectileHit = true;
            }
          } else {
            // Regular projectile - remove on first hit
            projectileHit = true;
          }

          // Break if projectile should be removed
          if (projectileHit) {
            break;
          }
        }
      }

      // Remove projectile if it hit
      if (projectileHit) {
        this.weaponManager.removeProjectile(i);
      }
    }

    // Check spread shot multi-hit achievement (handled per frame)
    // This is approximated since spread projectiles are separate
    // Could be improved with better tracking
  }

  private activateScreenClear(): void {
    const bubbles = this.bubbleManager.getBubbles();

    // Create expanding explosion effect
    const explosionGeometry = new THREE.SphereGeometry(1, 32, 32);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(this.camera.position);
    this.scene.add(explosion);

    // Animate explosion
    let explosionScale = 1;
    const expandExplosion = () => {
      explosionScale += 0.5;
      explosion.scale.set(explosionScale, explosionScale, explosionScale);
      explosionMaterial.opacity = Math.max(0, 0.8 - explosionScale * 0.1);

      if (explosionScale < 50) {
        requestAnimationFrame(expandExplosion);
      } else {
        this.scene.remove(explosion);
        explosion.geometry.dispose();
        explosionMaterial.dispose();
      }
    };
    expandExplosion();

    // Track how many bubbles are being cleared
    const clearedCount = bubbles.length;

    // Destroy all bubbles
    for (let i = bubbles.length - 1; i >= 0; i--) {
      this.bubbleManager.hitBubbleAtIndex(i);
    }

    // Massive screen shake
    this.shake(20);

    // Play explosion sound
    this.audioManager.playDamageSound();

    // Track achievement for bomb usage
    this.achievementManager.onBombUsed(clearedCount);
  }

  private shake(intensity: number): void {
    this.shakeIntensity = intensity;
  }

  private updateScreenShake(): void {
    if (this.shakeIntensity > 0.01) {
      // Apply random offset based on shake intensity
      const shakeAmount = this.shakeIntensity * 0.01; // Scale down for pixel units
      this.camera.position.x = this.cameraBasePosition.x + (Math.random() - 0.5) * shakeAmount;
      this.camera.position.y = this.cameraBasePosition.y + (Math.random() - 0.5) * shakeAmount;

      // Decay shake over time
      this.shakeIntensity *= 0.9;
    } else if (this.shakeIntensity > 0) {
      // Reset to base position when shake is done
      this.camera.position.x = this.cameraBasePosition.x;
      this.camera.position.y = this.cameraBasePosition.y;
      this.shakeIntensity = 0;
    }
  }

  private gameOver(): void {
    this.isRunning = false;

    const finalWave = this.waveManager.getCurrentWave();
    const finalScore = this.scoreManager.getScore();
    const health = this.player.getCoreHealth();

    // Track game over achievements
    this.achievementManager.onGameOver(health, finalWave, this.noPurchasesMade);

    // Update progression statistics
    this.progressionManager.updateStatistic('highestWave', finalWave);

    // Check achievements one final time
    this.achievementManager.checkAchievements();

    this.uiManager.showGameOver(finalScore, finalWave);
  }

  private restart(): void {
    // Reset all systems
    this.scoreManager.reset();
    this.bubbleManager.clear();
    this.waveManager.reset();
    this.player.reset();
    this.particleSystem.clear();

    // Reset visual systems
    this.shieldVisualizer.activateShield(this.player.getShield(), this.player.getMaxShield());
    this.healthVisualizer.updateHealth(this.player.getCoreHealth(), this.player.getMaxCoreHealth());

    // Reset achievement tracking flags
    this.noPurchasesMade = true;

    // Restart game
    this.isRunning = true;
    this.clock.start();
    this.waveManager.startWave(1);
    this.animate();
  }

  public handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
