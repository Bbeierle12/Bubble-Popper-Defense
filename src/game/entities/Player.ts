import * as THREE from 'three';
import { ParticleSystem } from '../systems/ParticleSystem';
import { WeaponManager } from '../systems/WeaponManager';

export class Player {
  private particleSystem: ParticleSystem;
  private weaponManager: WeaponManager;
  private gunGroup: THREE.Group;
  private gun: THREE.Mesh;
  private targetPosition: THREE.Vector3;
  private camera: THREE.Camera | null = null;

  // Health
  private shield: number = 3;
  private maxShield: number = 3;
  private coreHealth: number = 5;
  private maxCoreHealth: number = 5;

  // Event system
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(_scene: THREE.Scene, particleSystem: ParticleSystem, weaponManager: WeaponManager) {
    this.particleSystem = particleSystem;
    this.weaponManager = weaponManager;
    this.gunGroup = new THREE.Group();
    this.targetPosition = new THREE.Vector3();

    this.gun = this.createFirstPersonGun();
  }

  private createFirstPersonGun(): THREE.Mesh {
    // Gun positioned in lower right of screen (first-person view)
    const gunGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.8);
    const gunMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.7,
      roughness: 0.3
    });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    
    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.6);
    gun.add(barrel);
    
    // Position gun in lower right corner of view
    gun.position.set(0.5, -0.3, -1);
    this.gunGroup.add(gun);
    
    return gun;
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    // Attach gun to camera
    camera.add(this.gunGroup);
  }

  public update(_deltaTime: number): void {
    // Gentle gun sway for first-person
    const time = performance.now() * 0.001;
    this.gun.rotation.z = Math.sin(time * 1.5) * 0.02;
    this.gun.position.y = -0.3 + Math.sin(time * 2) * 0.01;

    // Rotate camera to face target
    this.updateCameraRotation();
  }

  private updateCameraRotation(): void {
    if (!this.camera) return;
    
    // Make camera look at target position
    this.camera.lookAt(this.targetPosition);
  }

  public setAimTarget(position: THREE.Vector3): void {
    this.targetPosition.copy(position);
  }

  public shoot(): boolean {
    if (!this.weaponManager.canFire()) {
      return false;
    }

    if (!this.camera) return false;

    // Shoot from camera position (player's eyes)
    const gunPos = new THREE.Vector3();
    this.camera.getWorldPosition(gunPos);

    // Calculate direction from camera forward direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    direction.normalize();

    // Fire weapon (creates projectiles)
    this.weaponManager.fire(gunPos, direction);

    // Muzzle flash effect at gun barrel
    const barrelPos = new THREE.Vector3();
    this.gun.getWorldPosition(barrelPos);
    barrelPos.z -= 0.6; // Offset to barrel end
    this.particleSystem.createMuzzleFlash(barrelPos);

    // Gun recoil animation
    this.gun.position.z += 0.05;
    setTimeout(() => {
      this.gun.position.z = -1;
    }, 50);

    // Emit event for audio/effects
    this.emit('shoot', { position: gunPos, direction });

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

  public getWeaponManager(): WeaponManager {
    return this.weaponManager;
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
