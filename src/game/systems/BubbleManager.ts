import * as THREE from 'three';
import { Bubble, type BubbleSize, type BubbleType } from '../entities/Bubble';
import { ParticleSystem } from './ParticleSystem';
import { ScoreManager } from './ScoreManager';
import { AudioManager } from './AudioManager';
import { Player } from '../entities/Player';

interface Projectile {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Mesh;
  trail: THREE.Mesh[];
  life: number;
}

export class BubbleManager {
  private scene: THREE.Scene;
  private bubbles: Bubble[] = [];
  private projectiles: Projectile[] = [];
  private particleSystem: ParticleSystem;
  private scoreManager: ScoreManager;
  private audioManager: AudioManager;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem, scoreManager: ScoreManager, audioManager: AudioManager) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.scoreManager = scoreManager;
    this.audioManager = audioManager;
  }

  public spawnBubble(size: BubbleSize, position: THREE.Vector3, type: BubbleType = 'standard'): void {
    const bubble = new Bubble(size, position, type);
    this.bubbles.push(bubble);
    this.scene.add(bubble.mesh);
  }

  public spawnProjectile(position: THREE.Vector3, direction: THREE.Vector3, speed: number): void {
    // Create glowing projectile
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    this.projectiles.push({
      position: position.clone(),
      velocity: direction.multiplyScalar(speed),
      mesh,
      trail: [],
      life: 0
    });

    this.scene.add(mesh);
  }

  public update(deltaTime: number, player: Player): void {
    // Get player position for bubble chase AI
    const playerPosition = player.getPosition();

    // Update bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];

      // Pass player position so bubbles can chase the player
      bubble.update(deltaTime, playerPosition);

      // Check if bubble reaches player position (collision detection)
      if (bubble.checkCollisionWithPlayer(playerPosition, player.getCollisionRadius())) {
        player.takeDamage();
        this.removeBubble(i);
        continue;
      }

      // Remove bubbles that are too far from play area
      if (bubble.isOutOfBounds()) {
        this.removeBubble(i);
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.life += deltaTime;

      // Store old position for trail
      const oldPosition = proj.position.clone();

      proj.position.add(new THREE.Vector3().copy(proj.velocity).multiplyScalar(deltaTime));
      proj.mesh.position.copy(proj.position);

      // Create trail effect
      if (proj.life > 0.02 && oldPosition.distanceTo(proj.position) > 0.1) {
        const trailGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0.5
        });
        const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
        trailMesh.position.copy(oldPosition);
        this.scene.add(trailMesh);
        proj.trail.push(trailMesh);

        // Limit trail length
        if (proj.trail.length > 5) {
          const oldTrail = proj.trail.shift();
          if (oldTrail) {
            this.scene.remove(oldTrail);
            oldTrail.geometry.dispose();
            (oldTrail.material as THREE.Material).dispose();
          }
        }
      }

      // Fade out trail segments
      proj.trail.forEach((segment, index) => {
        const material = segment.material as THREE.MeshBasicMaterial;
        material.opacity = 0.5 * (index / proj.trail.length);
      });

      // Check collision with bubbles
      let hitBubble = false;
      for (let j = this.bubbles.length - 1; j >= 0; j--) {
        const bubble = this.bubbles[j];
        const distance = proj.position.distanceTo(bubble.position);

        // Get bubble radius based on size
        let bubbleRadius = 0.5;
        if (bubble.size === 'large') bubbleRadius = 1.0;
        else if (bubble.size === 'medium') bubbleRadius = 0.6;
        else if (bubble.size === 'small') bubbleRadius = 0.3;

        if (distance < bubbleRadius + 0.15) { // Hit detection with projectile radius
          this.hitBubble(bubble, j);
          hitBubble = true;
          break;
        }
      }

      // Remove projectile if hit or out of bounds
      if (hitBubble || Math.abs(proj.position.z) > 50 || Math.abs(proj.position.x) > 50 || Math.abs(proj.position.y) > 50) {
        this.removeProjectile(i);
      }
    }
  }

  private hitBubble(bubble: Bubble, index: number): void {
    const destroyed = bubble.hit();

    // Play combo sound based on current multiplier
    const comboLevel = this.scoreManager.getMultiplier();
    if (comboLevel > 1) {
      this.audioManager.playComboSound(comboLevel);
    }

    // Emit boss damage event for UI
    if (bubble.size === 'boss' && !destroyed) {
      this.emit('bossDamaged', { health: bubble.health, maxHealth: bubble.maxHealth });
    }

    if (destroyed) {
      // Add score
      this.scoreManager.addScore(bubble.points);

      // Play pop sound based on bubble size
      this.audioManager.playPopSound(bubble.size);

      // Create particles
      this.particleSystem.createBubblePop(bubble.position, bubble.size);

      // Boss defeated event
      if (bubble.size === 'boss') {
        this.emit('bossDefeated');
      }

      // Split into smaller bubbles
      if (bubble.shouldSplit()) {
        const nextSize = bubble.getNextSize();
        if (nextSize) {
          const numSplits = Math.random() > 0.5 ? 2 : 3;
          for (let i = 0; i < numSplits; i++) {
            const angle = (Math.PI * 2 * i) / numSplits;
            const offset = new THREE.Vector3(
              Math.cos(angle) * 0.5,
              Math.sin(angle) * 0.5,
              (Math.random() - 0.5) * 2
            );
            const newPos = bubble.position.clone().add(offset);
            this.spawnBubble(nextSize, newPos);
          }
        }
      }

      // Remove bubble
      this.removeBubble(index);
    }
  }

  private removeBubble(index: number): void {
    const bubble = this.bubbles[index];
    bubble.destroy();
    this.bubbles.splice(index, 1);
  }

  private removeProjectile(index: number): void {
    const proj = this.projectiles[index];

    // Clean up trail
    proj.trail.forEach(segment => {
      this.scene.remove(segment);
      segment.geometry.dispose();
      (segment.material as THREE.Material).dispose();
    });

    // Clean up main mesh
    this.scene.remove(proj.mesh);
    proj.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.projectiles.splice(index, 1);
  }

  public getBubbleCount(): number {
    return this.bubbles.length;
  }

  public clear(): void {
    this.bubbles.forEach(bubble => bubble.destroy());
    this.bubbles = [];

    this.projectiles.forEach(proj => {
      // Clean up trail
      proj.trail.forEach(segment => {
        this.scene.remove(segment);
        segment.geometry.dispose();
        (segment.material as THREE.Material).dispose();
      });

      // Clean up main mesh
      this.scene.remove(proj.mesh);
      proj.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    });
    this.projectiles = [];
  }

  public getBoss(): Bubble | null {
    return this.bubbles.find(b => b.size === 'boss') || null;
  }

  public getBubbles(): Bubble[] {
    return this.bubbles;
  }

  public hitBubbleAtIndex(index: number): void {
    if (index >= 0 && index < this.bubbles.length) {
      this.hitBubble(this.bubbles[index], index);
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
