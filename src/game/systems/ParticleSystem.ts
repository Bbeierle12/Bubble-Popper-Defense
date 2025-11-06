import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createBubblePop(position: THREE.Vector3, size: string): void {
    const particleCount = size === 'large' ? 20 : size === 'medium' ? 15 : 10;
    const color = this.getColorForSize(size);

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 4, 4);
      const material = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.copy(position);

      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 3;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * speed
      );

      this.particles.push({
        position: position.clone(),
        velocity,
        life: 0.5,
        maxLife: 0.5,
        mesh
      });

      this.scene.add(mesh);
    }
  }

  public createMuzzleFlash(position: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.copy(position);

    this.particles.push({
      position: position.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      life: 0.1,
      maxLife: 0.1,
      mesh
    });

    this.scene.add(mesh);
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        this.removeParticle(i);
        continue;
      }

      // Update position
      particle.position.add(
        new THREE.Vector3().copy(particle.velocity).multiplyScalar(deltaTime)
      );
      particle.mesh.position.copy(particle.position);

      // Fade out
      const lifeRatio = particle.life / particle.maxLife;
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = lifeRatio;
      material.transparent = true;

      // Apply gravity
      particle.velocity.y -= 9.8 * deltaTime;
    }
  }

  private removeParticle(index: number): void {
    const particle = this.particles[index];
    this.scene.remove(particle.mesh);
    particle.mesh.geometry.dispose();
    (particle.mesh.material as THREE.Material).dispose();
    this.particles.splice(index, 1);
  }

  private getColorForSize(size: string): number {
    switch (size) {
      case 'large':
        return 0x00d4ff;
      case 'medium':
        return 0x00ff88;
      case 'small':
        return 0xffaa00;
      default:
        return 0xffffff;
    }
  }

  public clear(): void {
    this.particles.forEach(particle => {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
  }
}
