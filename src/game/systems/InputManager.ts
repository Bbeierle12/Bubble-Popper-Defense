import * as THREE from 'three';
import { Player } from '../entities/Player';

export class InputManager {
  private camera: THREE.Camera;
  private player: Player;
  private mouse: THREE.Vector2;
  private raycaster: THREE.Raycaster;
  private isMouseDown: boolean = false;

  constructor(camera: THREE.Camera, player: Player) {
    this.camera = camera;
    this.player = player;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    // Convert mouse position to normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Project raycast forward from camera (first-person aiming)
    const target = new THREE.Vector3();
    this.raycaster.ray.at(50, target); // Aim point 50 units forward

    this.player.setAimTarget(target);

    // Auto-fire while mouse is down
    if (this.isMouseDown) {
      this.player.shoot();
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left click
      this.isMouseDown = true;
      this.player.shoot();
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = false;
    }
  }
}
