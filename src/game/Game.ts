import * as THREE from 'three';
import { Player } from './entities/Player';
import { BubbleManager } from './systems/BubbleManager';
import { WaveManager } from './systems/WaveManager';
import { InputManager } from './systems/InputManager';
import { UIManager } from './systems/UIManager';
import { ScoreManager } from './systems/ScoreManager';
import { ParticleSystem } from './systems/ParticleSystem';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private bubbleManager: BubbleManager;
  private waveManager: WaveManager;
  private inputManager: InputManager;
  private uiManager: UIManager;
  private scoreManager: ScoreManager;
  private particleSystem: ParticleSystem;
  private clock: THREE.Clock;
  private isRunning: boolean = false;

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
    this.scoreManager = new ScoreManager();
    this.particleSystem = new ParticleSystem(this.scene);
    this.player = new Player(this.scene, this.particleSystem);
    this.bubbleManager = new BubbleManager(this.scene, this.particleSystem, this.scoreManager);
    this.waveManager = new WaveManager(this.bubbleManager);
    this.inputManager = new InputManager(this.camera, this.player);
    this.uiManager = new UIManager(this.scoreManager, this.waveManager);

    this.setupEventListeners();
    
    // Wire up player shooting to bubble manager
    this.player.on('shoot', (data: any) => {
      this.bubbleManager.spawnProjectile(data.position, data.direction, data.speed);
    });
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container')?.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    // Side-view camera for 2.5D perspective
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 5, 0);
  }

  private setupScene(): void {
    // Background
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 20, 50);

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

    // Grid helper for depth perception
    const gridHelper = new THREE.GridHelper(100, 50, 0x00d4ff, 0x003344);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
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
    // Update UI with player health
    this.player.on('shieldHit', () => {
      this.uiManager.updateShield(this.player.getShield(), this.player.getMaxShield());
    });

    this.player.on('coreHit', () => {
      this.uiManager.updateCore(this.player.getCoreHealth(), this.player.getMaxCoreHealth());
    });

    this.player.on('shieldRegenerated', () => {
      this.uiManager.updateShield(this.player.getShield(), this.player.getMaxShield());
    });

    // Wave completion
    this.waveManager.on('waveComplete', () => {
      this.uiManager.showShop();
      this.player.regenerateShield();
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
  }

  public start(): void {
    this.isRunning = true;
    
    // Initialize UI with player health
    this.uiManager.updateShield(this.player.getShield(), this.player.getMaxShield());
    this.uiManager.updateCore(this.player.getCoreHealth(), this.player.getMaxCoreHealth());
    
    this.waveManager.startWave(1);
    this.animate();
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    // Update all systems
    this.player.update(deltaTime);
    this.bubbleManager.update(deltaTime, this.player);
    this.waveManager.update(deltaTime);
    this.particleSystem.update(deltaTime);
    this.uiManager.update();

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  private gameOver(): void {
    this.isRunning = false;
    this.uiManager.showGameOver(
      this.scoreManager.getScore(),
      this.waveManager.getCurrentWave()
    );
  }

  private restart(): void {
    // Reset all systems
    this.scoreManager.reset();
    this.bubbleManager.clear();
    this.waveManager.reset();
    this.player.reset();
    this.particleSystem.clear();
    
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
