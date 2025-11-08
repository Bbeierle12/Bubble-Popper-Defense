import * as THREE from 'three';
import { ProgressionManager } from './ProgressionManager';

export type WeaponType = 'standard' | 'rapidFire' | 'spreadShot' | 'pierceShot';

export interface WeaponStats {
  name: string;
  fireRate: number; // Shots per second
  damage: number; // Damage multiplier
  projectileSpeed: number;
  projectileColor: number;
  projectileSize: number;
  cost: number; // Shop price
  description: string;

  // Special properties
  pierceCount?: number;
  spreadCount?: number;
  spreadAngle?: number;
}

export interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  trail: THREE.Line;
  trailPositions: THREE.Vector3[];
  lifetime: number;
  pierceCount?: number;
  maxPierces?: number;
  hitBubbles?: Set<number>; // Track which bubbles this projectile has hit
}

export class WeaponManager {
  private currentWeapon: WeaponType = 'standard';
  private weapons: Map<WeaponType, WeaponStats> = new Map();
  private projectiles: Projectile[] = [];
  private lastFireTime: number = 0;
  private scene: THREE.Scene;
  private progressionManager: ProgressionManager;

  // Unlocked weapons (purchased in shop)
  private purchasedWeapons: Set<WeaponType> = new Set(['standard']);

  // Screen Clear Bombs
  private screenClearBombs: number = 0;

  // Event system
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.progressionManager = ProgressionManager.getInstance();
    this.initializeWeapons();
  }

  private initializeWeapons(): void {
    // Standard weapon
    this.weapons.set('standard', {
      name: 'Standard',
      fireRate: 8, // 8 shots per second (doubled from 4)
      damage: 1.0,
      projectileSpeed: 50,
      projectileColor: 0x00ffff,
      projectileSize: 0.1,
      cost: 0,
      description: 'Balanced all-around weapon'
    });

    // Rapid Fire weapon
    this.weapons.set('rapidFire', {
      name: 'Rapid Fire',
      fireRate: 16, // 16 shots per second (doubled from 8)
      damage: 0.7,
      projectileSpeed: 45,
      projectileColor: 0xff8800,
      projectileSize: 0.08,
      cost: 200,
      description: '2x fire rate, 0.7x damage'
    });

    // Spread Shot weapon
    this.weapons.set('spreadShot', {
      name: 'Spread Shot',
      fireRate: 6, // 6 shots per second (doubled from 3)
      damage: 0.5,
      projectileSpeed: 40,
      projectileColor: 0x0088ff,
      projectileSize: 0.09,
      cost: 350,
      description: '3 projectiles in a cone',
      spreadCount: 3,
      spreadAngle: 30 // degrees
    });

    // Pierce Shot weapon
    this.weapons.set('pierceShot', {
      name: 'Pierce Shot',
      fireRate: 4, // 4 shots per second (doubled from 2)
      damage: 1.0,
      projectileSpeed: 60,
      projectileColor: 0x00ff44,
      projectileSize: 0.12,
      cost: 500,
      description: 'Pierces through 3 bubbles',
      pierceCount: 3
    });
  }

  public canFire(): boolean {
    const weapon = this.weapons.get(this.currentWeapon);
    if (!weapon) return false;

    const timeSinceLastFire = performance.now() - this.lastFireTime;
    const fireInterval = 1000 / weapon.fireRate;

    return timeSinceLastFire >= fireInterval;
  }

  public fire(position: THREE.Vector3, direction: THREE.Vector3): void {
    if (!this.canFire()) return;

    const weapon = this.weapons.get(this.currentWeapon);
    if (!weapon) return;

    this.lastFireTime = performance.now();

    // Handle spread shot
    if (weapon.spreadCount && weapon.spreadAngle) {
      this.fireSpread(position, direction, weapon);
    } else {
      this.createProjectile(position, direction, weapon);
    }
  }

  private fireSpread(position: THREE.Vector3, direction: THREE.Vector3, weapon: WeaponStats): void {
    const spreadCount = weapon.spreadCount || 3;
    const spreadAngle = (weapon.spreadAngle || 30) * (Math.PI / 180);

    for (let i = 0; i < spreadCount; i++) {
      // Calculate spread angle for this projectile
      const angleOffset = (i - (spreadCount - 1) / 2) * (spreadAngle / (spreadCount - 1));

      // Rotate direction vector around the up axis
      const spreadDirection = direction.clone();
      const axis = new THREE.Vector3(0, 1, 0);
      spreadDirection.applyAxisAngle(axis, angleOffset);

      // Also add slight vertical spread
      const verticalAxis = new THREE.Vector3().crossVectors(direction, axis).normalize();
      const verticalSpread = (Math.random() - 0.5) * 0.1;
      spreadDirection.applyAxisAngle(verticalAxis, verticalSpread);

      spreadDirection.normalize();

      this.createProjectile(position, spreadDirection, weapon);
    }
  }

  private createProjectile(position: THREE.Vector3, direction: THREE.Vector3, weapon: WeaponStats): void {
    // Create projectile mesh
    const geometry = new THREE.SphereGeometry(weapon.projectileSize, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: weapon.projectileColor,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(weapon.projectileSize * 1.5, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: weapon.projectileColor,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    this.scene.add(mesh);

    // Create trail
    const trailPositions: THREE.Vector3[] = [];
    for (let i = 0; i < 10; i++) {
      trailPositions.push(position.clone());
    }

    const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPositions);
    const trailMaterial = new THREE.LineBasicMaterial({
      color: weapon.projectileColor,
      transparent: true,
      opacity: 0.5
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    this.scene.add(trail);

    // Create projectile object
    const projectile: Projectile = {
      mesh,
      velocity: direction.clone().multiplyScalar(weapon.projectileSpeed),
      trail,
      trailPositions,
      lifetime: 3.0,
      pierceCount: 0,
      maxPierces: weapon.pierceCount,
      hitBubbles: new Set()
    };

    this.projectiles.push(projectile);
  }

  public update(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      // Update position
      projectile.mesh.position.add(
        projectile.velocity.clone().multiplyScalar(deltaTime)
      );

      // Update trail
      projectile.trailPositions.unshift(projectile.mesh.position.clone());
      projectile.trailPositions.pop();
      projectile.trail.geometry.setFromPoints(projectile.trailPositions);

      // Update lifetime
      projectile.lifetime -= deltaTime;

      // Remove if expired
      if (projectile.lifetime <= 0) {
        this.removeProjectile(i);
      }
    }
  }

  public removeProjectile(index: number): void {
    if (index < 0 || index >= this.projectiles.length) return;

    const projectile = this.projectiles[index];
    this.scene.remove(projectile.mesh);
    this.scene.remove(projectile.trail);
    projectile.mesh.geometry.dispose();
    (projectile.mesh.material as THREE.Material).dispose();
    projectile.trail.geometry.dispose();
    (projectile.trail.material as THREE.Material).dispose();

    this.projectiles.splice(index, 1);
  }

  public getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  public getCurrentWeaponStats(): WeaponStats {
    return this.weapons.get(this.currentWeapon)!;
  }

  public getCurrentWeapon(): WeaponType {
    return this.currentWeapon;
  }

  public setWeapon(weapon: WeaponType): boolean {
    if (!this.purchasedWeapons.has(weapon)) {
      return false;
    }
    this.currentWeapon = weapon;
    return true;
  }

  // Purchase weapon in shop (after it's unlocked in progression)
  public purchaseWeapon(weapon: WeaponType): void {
    this.purchasedWeapons.add(weapon);
  }

  // Check if weapon has been purchased in shop
  public isWeaponPurchased(weapon: WeaponType): boolean {
    return this.purchasedWeapons.has(weapon);
  }

  // Check if weapon is unlocked in progression (available for purchase)
  public isWeaponUnlocked(weapon: WeaponType): boolean {
    return this.progressionManager.isWeaponUnlocked(weapon);
  }

  // Check if weapon can be purchased (unlocked but not yet purchased)
  public canPurchaseWeapon(weapon: WeaponType): boolean {
    return this.isWeaponUnlocked(weapon) && !this.isWeaponPurchased(weapon);
  }

  public getWeaponStats(weapon: WeaponType): WeaponStats | undefined {
    return this.weapons.get(weapon);
  }

  public getAllWeapons(): Map<WeaponType, WeaponStats> {
    return this.weapons;
  }

  public getPurchasedWeapons(): Set<WeaponType> {
    return this.purchasedWeapons;
  }

  public dispose(): void {
    // Clean up all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(i);
    }
  }

  // Screen Clear Bomb functionality
  public addScreenClearBomb(): void {
    this.screenClearBombs++;
  }

  public getScreenClearBombs(): number {
    return this.screenClearBombs;
  }

  public useScreenClearBomb(): boolean {
    if (this.screenClearBombs > 0) {
      this.screenClearBombs--;
      this.emit('screenClearActivated');
      return true;
    }
    return false;
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
