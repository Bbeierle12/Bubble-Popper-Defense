import * as THREE from 'three';

export class HealthVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;

  // Core visual elements
  private coreGroup: THREE.Group;
  private coreMesh: THREE.Mesh | null = null;
  private crackTexture: THREE.Texture | null = null;

  // Damage effects
  private smokeParticles: THREE.Points | null = null;
  private warningGlow: THREE.Mesh | null = null;
  private screenEdgeEffect: HTMLDivElement | null = null;

  // State
  private currentHealth: number = 5;
  private maxHealth: number = 5;
  private damageFlashTime: number = 0;
  private criticalPulseTime: number = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.coreGroup = new THREE.Group();
    this.scene.add(this.coreGroup);

    this.createCore();
    this.createSmokeSystem();
    this.createWarningGlow();
    this.createScreenEdgeEffect();
  }

  private createCore(): void {
    // Create core crystal geometry
    const geometry = new THREE.OctahedronGeometry(0.5, 0);

    // Custom shader for core with damage states
    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        health: { value: 1.0 },
        damageFlash: { value: 0 },
        criticalPulse: { value: 0 },
        baseColor: { value: new THREE.Color(0x00ff88) },
        damageColor: { value: new THREE.Color(0xff0044) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;

          // Pulse effect when critical
          float pulse = sin(criticalPulse * 10.0) * 0.05 * (1.0 - health);
          vec3 pos = position * (1.0 + pulse);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float health;
        uniform float damageFlash;
        uniform float criticalPulse;
        uniform vec3 baseColor;
        uniform vec3 damageColor;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        // Crack pattern generation
        float cracks(vec3 p) {
          float damage = 1.0 - health;
          if (damage < 0.2) return 0.0;

          // Generate procedural cracks based on position
          float crack1 = step(0.98, sin(p.x * 50.0) + sin(p.y * 50.0));
          float crack2 = step(0.97, sin(p.y * 40.0 + p.z * 40.0));
          float crack3 = step(0.96, sin(p.z * 60.0 + p.x * 30.0));

          float crackIntensity = (crack1 + crack2 + crack3) * damage;
          return crackIntensity;
        }

        void main() {
          // Core glow based on health
          float glow = pow(dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);

          // Mix base color with damage color based on health
          vec3 coreColor = mix(damageColor, baseColor, health);

          // Add energy pulse
          float pulse = sin(time * 3.0 - length(vPosition) * 10.0) * 0.2 + 0.8;
          coreColor *= pulse;

          // Add cracks
          float crackValue = cracks(vPosition);
          if (crackValue > 0.0) {
            coreColor = mix(coreColor, vec3(0.1, 0.0, 0.0), crackValue);
          }

          // Damage flash effect
          if (damageFlash > 0.0) {
            coreColor = mix(coreColor, vec3(1.0, 0.0, 0.0), damageFlash);
          }

          // Critical state pulsing
          if (health < 0.3) {
            float criticalGlow = sin(criticalPulse * 5.0) * 0.5 + 0.5;
            coreColor = mix(coreColor, vec3(1.0, 0.0, 0.0), criticalGlow * 0.3);
          }

          float alpha = 0.8 + glow * 0.2;
          gl_FragColor = vec4(coreColor, alpha);
        }
      `
    });

    this.coreMesh = new THREE.Mesh(geometry, material);
    this.coreMesh.position.set(0, 5, -2); // Position near player view
    this.coreGroup.add(this.coreMesh);

    // Add inner glow
    const glowGeometry = new THREE.SphereGeometry(0.6, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.3
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.coreMesh.add(glowMesh);
  }

  private createSmokeSystem(): void {
    // Create smoke particles for low health
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Start particles near core
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = Math.random() * 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

      // Upward drift velocity
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.05 + 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      lifetimes[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        healthLevel: { value: 1.0 }
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float lifetime;

        uniform float time;
        uniform float healthLevel;

        varying float vOpacity;
        varying float vLifetime;

        void main() {
          vLifetime = lifetime;

          // Only show smoke when health is low
          float showSmoke = step(healthLevel, 0.5);

          // Animate particle position
          float cycleTime = mod(time + lifetime * 3.0, 3.0);
          vec3 pos = position + velocity * cycleTime;

          // Turbulence
          pos.x += sin(cycleTime * 2.0 + lifetime * 10.0) * 0.1;
          pos.z += cos(cycleTime * 2.0 + lifetime * 10.0) * 0.1;

          // Fade in and out
          vOpacity = showSmoke * (1.0 - cycleTime / 3.0) * 0.5;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (5.0 + cycleTime * 3.0) * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        varying float vLifetime;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float opacity = vOpacity * (1.0 - dist * 2.0);
          vec3 color = mix(vec3(0.1, 0.1, 0.1), vec3(0.3, 0.0, 0.0), vLifetime);

          gl_FragColor = vec4(color, opacity);
        }
      `
    });

    this.smokeParticles = new THREE.Points(geometry, material);
    this.coreGroup.add(this.smokeParticles);
  }

  private createWarningGlow(): void {
    // Create pulsing red glow for critical health
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });

    this.warningGlow = new THREE.Mesh(geometry, material);
    this.warningGlow.position.copy(this.coreMesh!.position);
    this.coreGroup.add(this.warningGlow);
  }

  private createScreenEdgeEffect(): void {
    // Create HTML overlay for screen edge damage effect
    this.screenEdgeEffect = document.createElement('div');
    this.screenEdgeEffect.style.position = 'fixed';
    this.screenEdgeEffect.style.top = '0';
    this.screenEdgeEffect.style.left = '0';
    this.screenEdgeEffect.style.width = '100%';
    this.screenEdgeEffect.style.height = '100%';
    this.screenEdgeEffect.style.pointerEvents = 'none';
    this.screenEdgeEffect.style.zIndex = '100';
    this.screenEdgeEffect.style.background = `
      radial-gradient(ellipse at center,
        transparent 0%,
        transparent 50%,
        rgba(255, 0, 0, 0) 70%,
        rgba(255, 0, 0, 0) 100%)
    `;
    this.screenEdgeEffect.style.transition = 'opacity 0.3s';
    this.screenEdgeEffect.style.opacity = '0';

    document.body.appendChild(this.screenEdgeEffect);
  }

  public updateHealth(health: number, maxHealth: number): void {
    this.currentHealth = health;
    this.maxHealth = maxHealth;

    const healthRatio = health / maxHealth;

    // Update core shader
    if (this.coreMesh && this.coreMesh.material instanceof THREE.ShaderMaterial) {
      this.coreMesh.material.uniforms.health.value = healthRatio;
    }

    // Update smoke system
    if (this.smokeParticles && this.smokeParticles.material instanceof THREE.ShaderMaterial) {
      this.smokeParticles.material.uniforms.healthLevel.value = healthRatio;
    }

    // Update warning glow
    if (this.warningGlow && healthRatio < 0.3) {
      (this.warningGlow.material as THREE.MeshBasicMaterial).opacity =
        (0.3 - healthRatio) * 2;
    } else if (this.warningGlow) {
      (this.warningGlow.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // Update screen edge effect
    if (this.screenEdgeEffect) {
      if (healthRatio < 0.5) {
        const intensity = (0.5 - healthRatio) * 2;
        this.screenEdgeEffect.style.background = `
          radial-gradient(ellipse at center,
            transparent 0%,
            transparent ${40 + healthRatio * 20}%,
            rgba(255, 0, 0, ${intensity * 0.2}) 70%,
            rgba(255, 0, 0, ${intensity * 0.4}) 100%)
        `;
        this.screenEdgeEffect.style.opacity = '1';
      } else {
        this.screenEdgeEffect.style.opacity = '0';
      }
    }
  }

  public onDamageTaken(): void {
    this.damageFlashTime = 1.0;

    // Screen flash effect
    if (this.screenEdgeEffect) {
      this.screenEdgeEffect.style.transition = 'none';
      this.screenEdgeEffect.style.background = `
        radial-gradient(ellipse at center,
          rgba(255, 0, 0, 0.3) 0%,
          rgba(255, 0, 0, 0.1) 50%,
          rgba(255, 0, 0, 0.5) 100%)
      `;
      this.screenEdgeEffect.style.opacity = '1';

      setTimeout(() => {
        this.screenEdgeEffect!.style.transition = 'opacity 0.3s';
        this.updateHealth(this.currentHealth, this.maxHealth);
      }, 100);
    }

    // Add screen distortion effect
    this.applyScreenDistortion();
  }

  private applyScreenDistortion(): void {
    // Apply chromatic aberration effect to renderer
    const originalPixelRatio = this.renderer.getPixelRatio();

    // Temporarily add CSS filter for chromatic aberration
    this.renderer.domElement.style.filter = 'blur(2px) contrast(1.2)';

    setTimeout(() => {
      this.renderer.domElement.style.filter = '';
    }, 100);
  }

  public update(deltaTime: number): void {
    const time = performance.now() * 0.001;

    // Update core shader
    if (this.coreMesh && this.coreMesh.material instanceof THREE.ShaderMaterial) {
      this.coreMesh.material.uniforms.time.value = time;
      this.coreMesh.material.uniforms.damageFlash.value = this.damageFlashTime;
      this.coreMesh.material.uniforms.criticalPulse.value = time;

      // Rotate core
      this.coreMesh.rotation.y += deltaTime * 0.5;
      this.coreMesh.rotation.x += deltaTime * 0.2;
    }

    // Update smoke particles
    if (this.smokeParticles && this.smokeParticles.material instanceof THREE.ShaderMaterial) {
      this.smokeParticles.material.uniforms.time.value = time;
    }

    // Pulse warning glow
    if (this.warningGlow && this.currentHealth / this.maxHealth < 0.3) {
      const pulse = Math.sin(time * 5) * 0.2 + 0.8;
      this.warningGlow.scale.setScalar(pulse);
    }

    // Decay damage flash
    if (this.damageFlashTime > 0) {
      this.damageFlashTime -= deltaTime * 3;
      if (this.damageFlashTime < 0) this.damageFlashTime = 0;
    }

    // Critical health heartbeat effect
    if (this.currentHealth / this.maxHealth < 0.3) {
      this.criticalPulseTime += deltaTime;

      // Heartbeat sound timing (visual cue)
      const heartbeat = Math.sin(this.criticalPulseTime * 3) > 0.8;
      if (heartbeat && this.screenEdgeEffect) {
        this.screenEdgeEffect.style.opacity = '0.8';
        setTimeout(() => {
          if (this.screenEdgeEffect) {
            this.screenEdgeEffect.style.opacity = '1';
          }
        }, 100);
      }
    }
  }

  public dispose(): void {
    // Clean up Three.js resources
    this.coreGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.scene.remove(this.coreGroup);

    // Clean up HTML element
    if (this.screenEdgeEffect && this.screenEdgeEffect.parentNode) {
      this.screenEdgeEffect.parentNode.removeChild(this.screenEdgeEffect);
    }
  }
}