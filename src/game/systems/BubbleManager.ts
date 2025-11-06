import * as THREE from 'three';
import { Bubble, type BubbleSize } from '../entities/Bubble';
import { ParticleSystem } from './ParticleSystem';
import { ScoreManager } from './ScoreManager';
import { Player } from '../entities/Player';

interface Projectile {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Mesh;
}

export class BubbleManager {
  private scene: THREE.Scene;
  private bubbles: Bubble[] = [];
  private projectiles: Projectile[] = [];
  private particleSystem: ParticleSystem;
  private scoreManager: ScoreManager;

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem, scoreManager: ScoreManager) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.scoreManager = scoreManager;
  }

  public spawnBubble(size: BubbleSize, position: THREE.Vector3): void {
    const bubble = new Bubble(size, position);
    this.bubbles.push(bubble);
    this.scene.add(bubble.mesh);
  }

  public spawnProjectile(position: THREE.Vector3, direction: THREE.Vector3, speed: number): void {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    this.projectiles.push({
      position: position.clone(),
      velocity: direction.multiplyScalar(speed),
      mesh
    });

    this.scene.add(mesh);
  }

  public update(deltaTime: number, player: Player): void {
    // Update bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      bubble.update(deltaTime);

      // Check if bubble reached player
      if (bubble.isOutOfBounds()) {
        player.takeDamage();
        this.removeBubble(i);
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.position.add(new THREE.Vector3().copy(proj.velocity).multiplyScalar(deltaTime));
      proj.mesh.position.copy(proj.position);

      // Check collision with bubbles
      let hitBubble = false;
      for (let j = this.bubbles.length - 1; j >= 0; j--) {
        const bubble = this.bubbles[j];
        const distance = proj.position.distanceTo(bubble.position);
        
        if (distance < 0.5) { // Hit detection
          this.hitBubble(bubble, j);
          hitBubble = true;
          break;
        }
      }

      // Remove projectile if hit or out of bounds
      if (hitBubble || proj.position.x > 20) {
        this.removeProjectile(i);
      }
    }
  }

  private hitBubble(bubble: Bubble, index: number): void {
    const destroyed = bubble.hit();

    if (destroyed) {
      // Add score
      this.scoreManager.addScore(bubble.points);

      // Create particles
      this.particleSystem.createBubblePop(bubble.position, bubble.size);

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
    this.scene.remove(proj.mesh);
    proj.mesh.geometry.dispose();
    (proj.mesh.material as THREE.Material).dispose();
    this.projectiles.splice(index, 1);
  }

  public getBubbleCount(): number {
    return this.bubbles.length;
  }

  public clear(): void {
    this.bubbles.forEach(bubble => bubble.destroy());
    this.bubbles = [];
    
    this.projectiles.forEach(proj => {
      this.scene.remove(proj.mesh);
      proj.mesh.geometry.dispose();
      (proj.mesh.material as THREE.Material).dispose();
    });
    this.projectiles = [];
  }
}
