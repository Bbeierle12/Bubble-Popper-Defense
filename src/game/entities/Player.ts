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

  // Position and movement
  public position: THREE.Vector3 = new THREE.Vector3(0, 5, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private readonly WALK_SPEED: number = 8.0;
  private readonly SPRINT_SPEED: number = 14.0;
  private readonly ACCELERATION: number = 50.0;
  private readonly FRICTION: number = 35.0; // Increased from 10.0 for snappier stopping
  private readonly BOUNDARY: number = 40; // Keep player within game area
  private moveInput: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isSprinting: boolean = false;

  // Raw movement key states (for frame-perfect camera-relative movement)
  private movementKeys: { [key: string]: boolean } = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false
  };

  // Camera effects (view-only, don't affect physics position)
  private bobTime: number = 0;
  private headBobOffset: number = 0; // Y offset for head bob (visual only)
  private readonly BASE_FOV: number = 75;
  private readonly SPRINT_FOV: number = 82;
  private currentFOV: number = 75;

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

  public update(deltaTime: number): void {
    // Calculate movement direction from raw keys FIRST (frame-perfect camera sync)
    this.calculateMovementDirection();

    // Update movement physics (affects this.position)
    this.updateMovement(deltaTime);

    // Update camera effects (head bob and FOV - visual only, doesn't modify position)
    this.updateCameraEffects(deltaTime);

    // Update gun animations
    this.updateGunAnimations(deltaTime);

    // Camera rotation is now handled entirely by InputManager (mouse input)
    // Removed updateCameraRotation() to prevent rotation conflicts

    // Apply FOV changes for sprint (only when needed)
    if (this.camera instanceof THREE.PerspectiveCamera) {
      const targetFOV = this.isSprinting && this.isMoving() ? this.SPRINT_FOV : this.BASE_FOV;
      const fovDiff = Math.abs(targetFOV - this.currentFOV);
      if (fovDiff > 0.01) {
        this.currentFOV += (targetFOV - this.currentFOV) * deltaTime * 8;
        this.camera.fov = this.currentFOV;
        this.camera.updateProjectionMatrix();
      }
    }
  }

  private updateGunAnimations(deltaTime: number): void {
    const time = this.bobTime; // Use bobTime for consistency
    const isMoving = this.velocity.length() > 0.1;

    if (isMoving) {
      // Movement bob
      const bobSpeed = this.isSprinting ? 10 : 6;
      this.gun.position.y = -0.3 + Math.sin(time * bobSpeed) * 0.05;
      this.gun.position.x = 0.5 + Math.cos(time * bobSpeed * 0.5) * 0.02;
    } else {
      // Idle sway
      this.gun.rotation.z = Math.sin(time * 1.5) * 0.02;
      // Smoothly return to base position
      this.gun.position.y += (-0.3 - this.gun.position.y) * deltaTime * 5;
      this.gun.position.x += (0.5 - this.gun.position.x) * deltaTime * 5;
    }
  }

  private updateCameraEffects(deltaTime: number): void {
    const isMoving = this.velocity.length() > 0.1;

    if (isMoving) {
      // Increase bob time when moving
      const bobSpeed = this.isSprinting ? 12 : 8;
      this.bobTime += deltaTime * bobSpeed;

      // Head bob - calculate Y offset (DON'T modify position.y!)
      const bobAmount = Math.sin(this.bobTime) * 0.03;
      const bobMultiplier = this.isSprinting ? 1.3 : 1.0;
      this.headBobOffset = bobAmount * bobMultiplier;
    } else {
      // Smooth return to base when stopped
      this.bobTime = 0;
      this.headBobOffset *= 0.9;
      if (Math.abs(this.headBobOffset) < 0.001) {
        this.headBobOffset = 0;
      }
    }
  }

  // Get the camera view position (physics position + head bob offset)
  public getCameraPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + this.headBobOffset,
      this.position.z
    );
  }

  private updateMovement(deltaTime: number): void {
    // Calculate target velocity based on input
    const currentSpeed = this.isSprinting ? this.SPRINT_SPEED : this.WALK_SPEED;
    const targetVelocity = this.moveInput.clone().multiplyScalar(currentSpeed);

    // Apply acceleration toward target velocity
    const velocityDiff = targetVelocity.clone().sub(this.velocity);
    const acceleration = velocityDiff.multiplyScalar(this.ACCELERATION * deltaTime);
    this.velocity.add(acceleration);

    // Apply friction when no input
    if (this.moveInput.length() < 0.01) {
      const frictionForce = this.velocity.clone().multiplyScalar(-this.FRICTION * deltaTime);
      this.velocity.add(frictionForce);

      // Stop if velocity is very small
      if (this.velocity.length() < 0.1) {
        this.velocity.set(0, 0, 0);
      }
    }

    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.z += this.velocity.z * deltaTime;

    // Keep player within boundaries and reset velocity when hitting walls
    const oldX = this.position.x;
    const oldZ = this.position.z;
    this.position.x = Math.max(-this.BOUNDARY, Math.min(this.BOUNDARY, this.position.x));
    this.position.z = Math.max(-this.BOUNDARY, Math.min(this.BOUNDARY, this.position.z));

    // Reset velocity component if we hit a boundary
    if (this.position.x !== oldX) {
      this.velocity.x = 0;
    }
    if (this.position.z !== oldZ) {
      this.velocity.z = 0;
    }
  }

  // New method: receive raw key states from InputManager
  public setMovementKeys(keys: { [key: string]: boolean }): void {
    this.movementKeys.w = keys.w || false;
    this.movementKeys.a = keys.a || false;
    this.movementKeys.s = keys.s || false;
    this.movementKeys.d = keys.d || false;
    this.movementKeys.shift = keys.shift || false;
  }

  // Calculate movement direction from raw keys (called each frame for frame-perfect sync)
  private calculateMovementDirection(): void {
    if (!this.camera) {
      this.moveInput.set(0, 0, 0);
      this.isSprinting = false;
      return;
    }

    // Calculate movement direction based on keys (in camera space)
    const moveDirection = new THREE.Vector3(0, 0, 0);

    // Forward/backward (camera space Z-axis)
    if (this.movementKeys.w) moveDirection.z -= 1;  // Forward (negative Z in camera space)
    if (this.movementKeys.s) moveDirection.z += 1;  // Backward (positive Z in camera space)

    // Left/right (camera space X-axis)
    if (this.movementKeys.a) moveDirection.x -= 1;  // Left (negative X in camera space)
    if (this.movementKeys.d) moveDirection.x += 1;  // Right (positive X in camera space)

    // Update sprint state
    this.isSprinting = this.movementKeys.shift || false;

    // Transform to world space if there's input
    if (moveDirection.length() > 0) {
      moveDirection.normalize(); // Prevent faster diagonal movement

      // Method 1: Use camera's quaternion directly for transformation
      // This ensures perfect alignment with camera orientation
      const worldDirection = moveDirection.clone();
      worldDirection.applyQuaternion(this.camera.quaternion);

      // Project onto XZ plane (remove vertical component)
      worldDirection.y = 0;

      // Re-normalize after removing Y component
      if (worldDirection.length() > 0) {
        worldDirection.normalize();
      }

      this.moveInput.copy(worldDirection);
    } else {
      this.moveInput.set(0, 0, 0);
    }
  }

  // Legacy method for compatibility (can be removed if no longer needed)
  public setMoveInput(input: THREE.Vector3, sprinting: boolean): void {
    this.moveInput.copy(input);
    this.isSprinting = sprinting;
  }

  public stopMovement(): void {
    // Immediately stop all movement - used when pointer lock is lost
    this.moveInput.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.isSprinting = false;

    // Clear key states
    this.movementKeys.w = false;
    this.movementKeys.a = false;
    this.movementKeys.s = false;
    this.movementKeys.d = false;
    this.movementKeys.shift = false;
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getPhysicsPosition(): THREE.Vector3 {
    // Returns physics position (Y is always 5, not affected by head bob)
    return this.position.clone();
  }

  public getCollisionRadius(): number {
    return 0.8; // Player hitbox radius for collision detection
  }

  public isMoving(): boolean {
    return this.velocity.length() > 0.1;
  }

  public getIsSprinting(): boolean {
    return this.isSprinting && this.isMoving();
  }

  // Camera rotation is controlled entirely by InputManager
  // Aim target is used for shooting direction only, not camera rotation
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
