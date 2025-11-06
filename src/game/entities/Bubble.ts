import * as THREE from 'three';

export type BubbleSize = 'large' | 'medium' | 'small';

export class Bubble {
  public mesh: THREE.Mesh;
  public size: BubbleSize;
  public health: number;
  public speed: number;
  public points: number;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  private time: number = 0;
  private baseSpeed: number;

  constructor(size: BubbleSize, position: THREE.Vector3) {
    this.size = size;
    this.position = position.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    
    // Size-dependent properties
    const sizeConfig = this.getSizeConfig();
    this.health = 1;
    this.baseSpeed = sizeConfig.speed;
    this.speed = this.baseSpeed;
    this.points = sizeConfig.points;

    // Create mesh
    this.mesh = this.createMesh(sizeConfig.radius);
    this.mesh.position.copy(position);
  }

  private getSizeConfig(): { radius: number; speed: number; points: number } {
    switch (this.size) {
      case 'large':
        return { radius: 1.0, speed: 1.5, points: 10 };
      case 'medium':
        return { radius: 0.6, speed: 2.0, points: 25 };
      case 'small':
        return { radius: 0.3, speed: 2.5, points: 50 };
    }
  }

  private createMesh(radius: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: this.getBubbleColor(),
      transparent: true,
      opacity: 0.7,
      emissive: this.getBubbleColor(),
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  private getBubbleColor(): number {
    switch (this.size) {
      case 'large':
        return 0x00d4ff; // Cyan
      case 'medium':
        return 0x00ff88; // Green
      case 'small':
        return 0xffaa00; // Orange
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    // Floaty physics - drift with sine wave
    const drift = Math.sin(this.time * 2) * 0.2;
    this.speed = this.baseSpeed * (1 + drift);

    // Move toward player (left)
    this.velocity.x = -this.speed * deltaTime;
    this.velocity.y = Math.sin(this.time * 3) * 0.5 * deltaTime; // Vertical bobbing

    this.position.add(this.velocity);
    this.mesh.position.copy(this.position);

    // Gentle rotation
    this.mesh.rotation.y += deltaTime * 0.5;
    this.mesh.rotation.x += deltaTime * 0.3;
  }

  public hit(): boolean {
    this.health--;
    return this.health <= 0;
  }

  public shouldSplit(): boolean {
    return this.size !== 'small';
  }

  public getNextSize(): BubbleSize | null {
    if (this.size === 'large') return 'medium';
    if (this.size === 'medium') return 'small';
    return null;
  }

  public isOutOfBounds(): boolean {
    return this.position.x < -15; // Reached player area
  }

  public destroy(): void {
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
