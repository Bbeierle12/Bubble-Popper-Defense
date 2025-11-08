import * as THREE from 'three';

export type BubbleSize = 'large' | 'medium' | 'small' | 'boss';
export type BubbleType = 'standard' | 'speed' | 'armor' | 'zigzag';

export class Bubble {
  public mesh: THREE.Mesh;
  public size: BubbleSize;
  public type: BubbleType;
  public health: number;
  public maxHealth: number;
  public speed: number;
  public points: number;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public radius: number;
  private time: number = 0;
  private baseSpeed: number;
  private trail: THREE.Mesh[] = [];
  private trailMaxLength: number = 8;
  private zigzagAmplitude: number = 0;
  private damageFlashTime: number = 0;

  constructor(size: BubbleSize, position: THREE.Vector3, type: BubbleType = 'standard') {
    this.size = size;
    this.type = type;
    this.position = position.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);

    // Size-dependent properties
    const sizeConfig = this.getSizeConfig();
    this.health = sizeConfig.health;
    this.maxHealth = this.health;
    this.baseSpeed = sizeConfig.speed;
    this.speed = this.baseSpeed;
    this.points = sizeConfig.points;
    this.radius = sizeConfig.radius;

    // Apply type modifiers
    this.applyTypeModifiers();

    // Create mesh
    this.mesh = this.createMesh(sizeConfig.radius);
    this.mesh.position.copy(position);
  }

  private getSizeConfig(): { radius: number; speed: number; points: number; health: number } {
    switch (this.size) {
      case 'large':
        return { radius: 1.0, speed: 1.5, points: 10, health: 1 };
      case 'medium':
        return { radius: 0.6, speed: 2.0, points: 25, health: 1 };
      case 'small':
        return { radius: 0.3, speed: 2.5, points: 50, health: 1 };
      case 'boss':
        return { radius: 3.0, speed: 0.8, points: 500, health: 10 };
    }
  }

  private applyTypeModifiers(): void {
    if (this.type === 'speed') {
      // Speed bubbles are 1.5x faster and worth more points
      this.baseSpeed *= 1.5;
      this.speed = this.baseSpeed;
      this.points = Math.floor(this.points * 1.5);
    } else if (this.type === 'armor') {
      // Armor bubbles take 2 hits to destroy
      this.health = 2;
      this.maxHealth = 2;
      this.points = Math.floor(this.points * 1.3);
    } else if (this.type === 'zigzag') {
      // Zigzag bubbles move in sine wave pattern
      this.points = Math.floor(this.points * 1.4);
      this.zigzagAmplitude = 0.5;
    }
  }

  private createMesh(radius: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);

    // Armor bubbles get metallic material
    const metalness = this.type === 'armor' ? 0.8 : 0.1;
    const roughness = this.type === 'armor' ? 0.3 : 0.2;

    const material = new THREE.MeshStandardMaterial({
      color: this.getBubbleColor(),
      transparent: true,
      opacity: 0.7,
      emissive: this.getBubbleColor(),
      emissiveIntensity: this.type === 'armor' ? 0.5 : 0.3,
      metalness: metalness,
      roughness: roughness
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  private getBubbleColor(): number {
    // Type-specific colors
    if (this.type === 'speed') {
      return 0xffff00; // Bright yellow
    } else if (this.type === 'armor') {
      return 0xc0c0c0; // Silver
    } else if (this.type === 'zigzag') {
      return 0x9933ff; // Purple
    }

    // Boss
    if (this.size === 'boss') {
      return 0xff0055; // Red
    }

    // Standard size-based colors
    switch (this.size) {
      case 'large':
        return 0x00d4ff; // Cyan
      case 'medium':
        return 0x00ff88; // Green
      case 'small':
        return 0xffaa00; // Orange
      default:
        return 0xffffff;
    }
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;

    // Update damage flash
    if (this.damageFlashTime > 0) {
      this.damageFlashTime -= deltaTime;
      const material = this.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 1.0 - (this.damageFlashTime * 2);
    }

    // Floaty physics - drift with sine wave
    const drift = Math.sin(this.time * 2) * 0.2;
    this.speed = this.baseSpeed * (1 + drift);

    // ZOMBIE CHASE AI: Move toward player position
    if (playerPosition) {
      // Calculate direction to player
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, this.position)
        .normalize();

      // Base movement toward player
      this.velocity.copy(directionToPlayer).multiplyScalar(this.speed * deltaTime);

      // Zigzag movement pattern - adds erratic movement on top of chase
      if (this.type === 'zigzag') {
        // Add oscillation perpendicular to chase direction to make zigzag bubbles harder to predict
        this.velocity.x += Math.sin(this.time * 4) * this.zigzagAmplitude * deltaTime * 10;
        this.velocity.z += Math.cos(this.time * 4) * this.zigzagAmplitude * deltaTime * 10;
        this.velocity.y = Math.cos(this.time * 3) * this.zigzagAmplitude * deltaTime * 8;

        // Increase amplitude over time for more erratic movement
        this.zigzagAmplitude = Math.min(this.zigzagAmplitude + deltaTime * 0.1, 2.0);
      } else {
        // Standard bubbles: add small random bobbing and drift while chasing
        this.velocity.x += Math.sin(this.time * 2) * 0.5 * deltaTime;
        this.velocity.y += Math.sin(this.time * 3) * 0.5 * deltaTime;
      }
    } else {
      // Fallback: old behavior if no player position (move forward)
      this.velocity.z = this.speed * deltaTime;

      if (this.type === 'zigzag') {
        this.velocity.x = Math.sin(this.time * 4) * this.zigzagAmplitude * deltaTime * 10;
        this.velocity.y = Math.cos(this.time * 3) * this.zigzagAmplitude * deltaTime * 8;
        this.zigzagAmplitude = Math.min(this.zigzagAmplitude + deltaTime * 0.1, 2.0);
      } else {
        this.velocity.x = Math.sin(this.time * 2) * 0.5 * deltaTime;
        this.velocity.y = Math.sin(this.time * 3) * 0.5 * deltaTime;
      }
    }

    // Store old position for trail
    const oldPosition = this.position.clone();

    this.position.add(this.velocity);
    this.mesh.position.copy(this.position);

    // Gentle rotation
    this.mesh.rotation.y += deltaTime * 0.5;
    this.mesh.rotation.x += deltaTime * 0.3;

    // Update trail for special bubbles
    if (this.type === 'speed' || this.type === 'zigzag') {
      this.updateTrail(oldPosition);
    }
  }

  private updateTrail(previousPosition: THREE.Vector3): void {
    // Create trail segment every few frames
    if (this.trail.length === 0 || previousPosition.distanceTo(this.position) > 0.3) {
      const sizeConfig = this.getSizeConfig();
      const trailGeometry = new THREE.SphereGeometry(sizeConfig.radius * 0.6, 8, 8);

      // Use bubble's color for trail
      const trailColor = this.type === 'zigzag' ? 0x9933ff : 0xffff00;
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: trailColor,
        transparent: true,
        opacity: 0.4,
      });
      const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
      trailMesh.position.copy(previousPosition);

      if (this.mesh.parent) {
        this.mesh.parent.add(trailMesh);
      }

      this.trail.push(trailMesh);

      // Remove old trail segments
      if (this.trail.length > this.trailMaxLength) {
        const oldTrail = this.trail.shift();
        if (oldTrail && oldTrail.parent) {
          oldTrail.parent.remove(oldTrail);
          oldTrail.geometry.dispose();
          (oldTrail.material as THREE.Material).dispose();
        }
      }
    }

    // Fade out trail segments
    this.trail.forEach((segment, index) => {
      const material = segment.material as THREE.MeshBasicMaterial;
      material.opacity = 0.4 * (index / this.trail.length);
    });
  }

  public hit(): boolean {
    this.health--;

    // Damage flash effect
    this.damageFlashTime = 0.2;
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 1.5;

    // Visual feedback for armor bubbles losing health
    if (this.type === 'armor' && this.health > 0) {
      // Change color to show damage state
      const damageRatio = this.health / this.maxHealth;
      const damagedColor = new THREE.Color(0xc0c0c0).lerp(new THREE.Color(0x808080), 1 - damageRatio);
      material.color.copy(damagedColor);
      material.emissive.copy(damagedColor);
    }

    return this.health <= 0;
  }

  public shouldSplit(): boolean {
    // Boss and special bubbles don't split
    return this.size !== 'small' && this.size !== 'boss' && this.type === 'standard';
  }

  public getNextSize(): BubbleSize | null {
    if (this.size === 'large') return 'medium';
    if (this.size === 'medium') return 'small';
    return null;
  }

  public isOutOfBounds(): boolean {
    // Remove bubbles that are very far from the play area
    const maxDistance = 100;
    return Math.abs(this.position.x) > maxDistance ||
           Math.abs(this.position.y) > maxDistance ||
           Math.abs(this.position.z) > maxDistance;
  }

  public checkCollisionWithPlayer(playerPosition: THREE.Vector3, playerRadius: number): boolean {
    // Calculate 3D distance between bubble and player
    const distance = this.position.distanceTo(playerPosition);
    
    // Collision occurs when distance is less than combined radii
    return distance < (this.radius + playerRadius);
  }

  public destroy(): void {
    // Clean up trail
    this.trail.forEach(segment => {
      if (segment.parent) {
        segment.parent.remove(segment);
      }
      segment.geometry.dispose();
      (segment.material as THREE.Material).dispose();
    });
    this.trail = [];

    // Clean up main mesh
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
