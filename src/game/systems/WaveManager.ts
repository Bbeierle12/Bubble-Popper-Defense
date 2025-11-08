import { BubbleManager } from './BubbleManager';
import * as THREE from 'three';

export class WaveManager {
  private bubbleManager: BubbleManager;
  private currentWave: number = 0;
  private isActive: boolean = false;
  private waveTimer: number = 0;
  private spawnTimer: number = 0;
  private spawnInterval: number = 2;
  private eventListeners: Map<string, Function[]> = new Map();
  private bossSpawned: boolean = false;
  private totalBubblesSpawned: number = 0;
  private maxBubblesPerWave: number = 0;

  constructor(bubbleManager: BubbleManager) {
    this.bubbleManager = bubbleManager;
  }

  public startWave(waveNumber: number): void {
    this.currentWave = waveNumber;
    this.isActive = true;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.bossSpawned = false;
    this.totalBubblesSpawned = 0;

    // More gradual difficulty progression
    // Wave 1: 3.5s interval, Wave 10: 1.5s interval
    this.spawnInterval = Math.max(3.5 - (waveNumber * 0.2), 1.5);

    // Fixed number of bubbles per wave - like traditional wave games
    // Carefully balanced progression
    const waveConfigs = [
      0,   // Wave 0 (unused)
      10,  // Wave 1: 10 bubbles (easy start)
      15,  // Wave 2: 15 bubbles
      20,  // Wave 3: 20 bubbles
      25,  // Wave 4: 25 bubbles (speed bubbles introduced)
      30,  // Wave 5: 30 bubbles
      35,  // Wave 6: 35 bubbles (armor bubbles introduced)
      40,  // Wave 7: 40 bubbles (zigzag bubbles introduced)
      45,  // Wave 8: 45 bubbles
      50,  // Wave 9: 50 bubbles
      1,   // Wave 10: Boss wave (1 boss)
    ];

    this.maxBubblesPerWave = waveConfigs[Math.min(waveNumber, 10)];

    // Wave 10 boss announcement
    if (waveNumber === 10) {
      this.emit('bossWave');
    }
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    this.waveTimer += deltaTime;
    this.spawnTimer += deltaTime;

    // Wave 10 boss fight
    if (this.currentWave === 10) {
      if (!this.bossSpawned) {
        this.spawnBoss();
        this.bossSpawned = true;
      }
      // Boss wave completes when boss is defeated
      if (this.bubbleManager.getBubbleCount() === 0) {
        this.completeWave();
      }
      return;
    }

    // Spawn bubbles only if we haven't reached the limit
    if (this.spawnTimer >= this.spawnInterval && this.totalBubblesSpawned < this.maxBubblesPerWave) {
      this.spawnWaveBubbles();
      this.spawnTimer = 0;
    }

    // Check wave completion - when all bubbles for this wave have been spawned and destroyed
    if (this.totalBubblesSpawned >= this.maxBubblesPerWave && this.bubbleManager.getBubbleCount() === 0) {
      this.completeWave();
    }
  }

  private spawnWaveBubbles(): void {
    // Determine how many bubbles to spawn this interval
    // Wave 1-3: 1 bubble at a time
    // Wave 4-6: 1-2 bubbles
    // Wave 7+: 2-3 bubbles
    let spawnCount = 1;
    if (this.currentWave >= 7) {
      spawnCount = 2 + Math.floor(Math.random() * 2); // 2-3
    } else if (this.currentWave >= 4) {
      spawnCount = 1 + Math.floor(Math.random() * 2); // 1-2
    }

    // Don't exceed the maximum for this wave
    const remainingBubbles = this.maxBubblesPerWave - this.totalBubblesSpawned;
    spawnCount = Math.min(spawnCount, remainingBubbles);

    for (let i = 0; i < spawnCount; i++) {
      // Random spawn position (in front of player, various positions)
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20, // X: left/right spread
        2 + Math.random() * 6,       // Y: height
        -25                          // Z: fixed distance in front (negative Z)
      );

      // Determine bubble type based on wave number
      let bubbleType: 'standard' | 'speed' | 'armor' | 'zigzag' = 'standard';
      const rand = Math.random();

      if (this.currentWave >= 7) {
        // Waves 7+: All special types possible
        if (rand < 0.15) bubbleType = 'zigzag';
        else if (rand < 0.30) bubbleType = 'armor';
        else if (rand < 0.45) bubbleType = 'speed';
      } else if (this.currentWave >= 6) {
        // Wave 6: Introduce armor bubbles
        if (rand < 0.15) bubbleType = 'armor';
        else if (rand < 0.30) bubbleType = 'speed';
      } else if (this.currentWave >= 4) {
        // Waves 4-5: Only speed bubbles
        if (rand < 0.15) bubbleType = 'speed';
      }

      this.bubbleManager.spawnBubble('large', position, bubbleType);
      this.totalBubblesSpawned++;
    }
  }

  private spawnBoss(): void {
    // Spawn boss in center front
    const bossPosition = new THREE.Vector3(0, 5, -25);
    this.bubbleManager.spawnBubble('boss', bossPosition, 'standard');

    this.emit('bossSpawned');
  }

  private completeWave(): void {
    this.isActive = false;
    this.emit('waveComplete', this.currentWave);
  }

  public nextWave(): void {
    this.startWave(this.currentWave + 1);
  }

  public getCurrentWave(): number {
    return this.currentWave;
  }

  public getWaveProgress(): { spawned: number; total: number; remaining: number } {
    const remaining = this.maxBubblesPerWave - this.totalBubblesSpawned + this.bubbleManager.getBubbleCount();
    return {
      spawned: this.totalBubblesSpawned,
      total: this.maxBubblesPerWave,
      remaining: remaining
    };
  }

  public reset(): void {
    this.currentWave = 0;
    this.isActive = false;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.totalBubblesSpawned = 0;
    this.maxBubblesPerWave = 0;
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
