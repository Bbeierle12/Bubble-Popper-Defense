import * as THREE from 'three';
import { Player } from '../entities/Player';
import { SettingsManager } from './SettingsManager';

export class InputManager {
  private camera: THREE.PerspectiveCamera;
  private player: Player;
  private settingsManager: SettingsManager;
  private isMouseDown: boolean = false;
  private isPointerLocked: boolean = false;

  // Camera rotation
  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly MIN_POLAR_ANGLE = -Math.PI / 2; // Look down limit
  private readonly MAX_POLAR_ANGLE = Math.PI / 2;  // Look up limit

  // Movement input tracking
  private keys: { [key: string]: boolean } = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false
  };

  constructor(camera: THREE.PerspectiveCamera, player: Player, settingsManager: SettingsManager) {
    this.camera = camera;
    this.player = player;
    this.settingsManager = settingsManager;

    this.setupEventListeners();
    this.requestPointerLock();
  }

  private setupEventListeners(): void {
    document.addEventListener('click', this.onClick.bind(this));
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onClick(): void {
    if (!this.isPointerLocked) {
      this.requestPointerLock();
    }
  }

  private requestPointerLock(): void {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.requestPointerLock();
    }
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement !== null;

    // Clear all key states and movement input when pointer lock changes
    if (!this.isPointerLocked) {
      // Clear all tracked keys when losing pointer lock
      this.keys.w = false;
      this.keys.a = false;
      this.keys.s = false;
      this.keys.d = false;
      this.keys.shift = false;

      // Immediately stop all player movement
      this.player.stopMovement();
    } else {
      // Pass initial key states when gaining pointer lock
      this.player.setMovementKeys(this.keys);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isPointerLocked) return;

    const sensitivity = this.settingsManager.getMouseSensitivity();
    const invertY = this.settingsManager.getInvertY();

    // Get mouse movement delta
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Update euler angles
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= movementX * sensitivity;
    this.euler.x -= movementY * sensitivity * (invertY ? -1 : 1);

    // Clamp vertical rotation to prevent camera flipping
    this.euler.x = Math.max(this.MIN_POLAR_ANGLE, Math.min(this.MAX_POLAR_ANGLE, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);

    // Update aim target based on camera direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    const target = this.camera.position.clone().add(direction.multiplyScalar(50));
    this.player.setAimTarget(target);

    // Auto-fire while mouse is down
    if (this.isMouseDown) {
      this.player.shoot();
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left click
      this.isMouseDown = true;
      if (this.isPointerLocked) {
        this.player.shoot();
      }
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = false;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // Only track keys when pointer is locked - prevents stale key states
    if (!this.isPointerLocked) return;

    // Track WASD movement keys
    if (key === 'w') this.keys.w = true;
    if (key === 'a') this.keys.a = true;
    if (key === 's') this.keys.s = true;
    if (key === 'd') this.keys.d = true;
    if (key === 'shift') this.keys.shift = true;

    // Pass raw key states to player (movement direction calculated in update loop)
    this.player.setMovementKeys(this.keys);

    // B key for screen clear bomb
    if (key === 'b') {
      const weaponManager = this.player.getWeaponManager();
      if (weaponManager.useScreenClearBomb()) {
        // Bomb activated successfully
      }
    }

    // Number keys for weapon switching
    if (event.key === '1') {
      this.player.getWeaponManager().setWeapon('standard');
    } else if (event.key === '2') {
      this.player.getWeaponManager().setWeapon('rapidFire');
    } else if (event.key === '3') {
      this.player.getWeaponManager().setWeapon('spreadShot');
    } else if (event.key === '4') {
      this.player.getWeaponManager().setWeapon('pierceShot');
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // Only track keys when pointer is locked - prevents stale key states
    if (!this.isPointerLocked) return;

    // Track WASD movement keys
    if (key === 'w') this.keys.w = false;
    if (key === 'a') this.keys.a = false;
    if (key === 's') this.keys.s = false;
    if (key === 'd') this.keys.d = false;
    if (key === 'shift') this.keys.shift = false;

    // Pass raw key states to player (movement direction calculated in update loop)
    this.player.setMovementKeys(this.keys);
  }

  // Movement direction calculation has been moved to Player.update()
  // for frame-perfect camera synchronization

  public isLocked(): boolean {
    return this.isPointerLocked;
  }
}
