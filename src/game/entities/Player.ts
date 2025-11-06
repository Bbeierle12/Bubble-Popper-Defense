import * as THREE from 'three';
import { ParticleSystem } from '../systems/ParticleSystem';

export class Player {
  private scene: THREE.Scene;
  private particleSystem: ParticleSystem;
  private group: THREE.Group;
  private arm: THREE.Group;
  private gun!: THREE.Mesh;
  private targetPosition: THREE.Vector3;
  
  // Health
  private shield: number = 3;
  private maxShield: number = 3;
  private coreHealth: number = 5;
  private maxCoreHealth: number = 5;
  
  // Weapon stats
  private fireRate: number = 240; // ms between shots
  private lastShotTime: number = 0;
  private projectileSpeed: number = 20;
  
  // Event system
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.group = new THREE.Group();
    this.arm = new THREE.Group();
    this.targetPosition = new THREE.Vector3();
    
    this.createStickFigure();
    this.scene.add(this.group);
  }

  private createStickFigure(): void {
    // Position on platform
    this.group.position.set(-10, 0, 0);

    // Torso
    const torsoGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const torso = new THREE.Mesh(torsoGeometry, material);
    torso.position.y = 2;
    this.group.add(torso);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const head = new THREE.Mesh(headGeometry, material);
    head.position.y = 3.5;
    this.group.add(head);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8);
    const leftLeg = new THREE.Mesh(legGeometry, material);
    leftLeg.position.set(-0.2, 0.75, 0);
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, material);
    rightLeg.position.set(0.2, 0.75, 0);
    this.group.add(rightLeg);

    // Arm (will rotate to aim)
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const armMesh = new THREE.Mesh(armGeometry, material);
    armMesh.position.y = 0.6;
    armMesh.rotation.z = Math.PI / 2;
    this.arm.add(armMesh);

    // Gun
    const gunGeometry = new THREE.BoxGeometry(0.6, 0.15, 0.15);
    const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    this.gun = new THREE.Mesh(gunGeometry, gunMaterial);
    this.gun.position.set(0.9, 0.6, 0);
    this.arm.add(this.gun);

    this.arm.position.set(0, 2.5, 0);
    this.group.add(this.arm);
  }

  public update(_deltaTime: number): void {
    // Idle sway animation
    const time = performance.now() * 0.001;
    this.group.rotation.z = Math.sin(time * 2) * 0.05;

    // Rotate arm to face target
    this.updateArmRotation();
  }

  private updateArmRotation(): void {
    // Calculate angle from arm to target
    const armPos = new THREE.Vector3();
    this.arm.getWorldPosition(armPos);

    const dx = this.targetPosition.x - armPos.x;
    const dy = this.targetPosition.y - armPos.y;
    const angle = Math.atan2(dy, dx);

    // Apply rotation
    this.arm.rotation.z = angle;
  }

  public setAimTarget(position: THREE.Vector3): void {
    this.targetPosition.copy(position);
  }

  public shoot(): boolean {
    const now = performance.now();
    if (now - this.lastShotTime < this.fireRate) {
      return false;
    }

    this.lastShotTime = now;

    // Get gun world position
    const gunPos = new THREE.Vector3();
    this.gun.getWorldPosition(gunPos);

    // Calculate direction
    const direction = new THREE.Vector3()
      .subVectors(this.targetPosition, gunPos)
      .normalize();

    // Create projectile (handled by bubble manager)
    this.emit('shoot', { position: gunPos, direction, speed: this.projectileSpeed });

    // Muzzle flash effect
    this.particleSystem.createMuzzleFlash(gunPos);

    return true;
  }

  public takeDamage(): void {
    if (this.shield > 0) {
      this.shield--;
      this.emit('shieldHit', this.shield);
      
      if (this.shield === 0) {
        this.emit('shieldBroken');
      }
    } else {
      this.coreHealth--;
      this.emit('coreHit', this.coreHealth);
      
      if (this.coreHealth <= 0) {
        this.emit('coreDestroyed');
      }
    }
  }

  public regenerateShield(): void {
    if (this.shield < this.maxShield) {
      this.shield++;
      this.emit('shieldRegenerated', this.shield);
    }
  }

  public getShield(): number {
    return this.shield;
  }

  public getCoreHealth(): number {
    return this.coreHealth;
  }

  public getMaxShield(): number {
    return this.maxShield;
  }

  public getMaxCoreHealth(): number {
    return this.maxCoreHealth;
  }

  public reset(): void {
    this.shield = this.maxShield;
    this.coreHealth = this.maxCoreHealth;
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
