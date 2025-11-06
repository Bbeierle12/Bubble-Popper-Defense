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

  constructor(bubbleManager: BubbleManager) {
    this.bubbleManager = bubbleManager;
  }

  public startWave(waveNumber: number): void {
    this.currentWave = waveNumber;
    this.isActive = true;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = Math.max(3.0 - 0.1 * waveNumber, 0.5);
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    this.waveTimer += deltaTime;
    this.spawnTimer += deltaTime;

    // Spawn bubbles
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnWaveBubbles();
      this.spawnTimer = 0;
    }

    // Check wave completion
    const waveDuration = Math.min(20 + 2 * this.currentWave, 60);
    if (this.waveTimer >= waveDuration && this.bubbleManager.getBubbleCount() === 0) {
      this.completeWave();
    }
  }

  private spawnWaveBubbles(): void {
    const enemyCount = 5 + 2 * this.currentWave + 3 * Math.floor(this.currentWave / 5);
    const spawnCount = Math.min(enemyCount, 3); // Spawn in batches

    for (let i = 0; i < spawnCount; i++) {
      // Random spawn position (in front of player, various positions)
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20, // X: left/right spread
        2 + Math.random() * 6,       // Y: height
        -15 - Math.random() * 10     // Z: distance in front (negative Z)
      );

      this.bubbleManager.spawnBubble('large', position);
    }
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

  public reset(): void {
    this.currentWave = 0;
    this.isActive = false;
    this.waveTimer = 0;
    this.spawnTimer = 0;
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
