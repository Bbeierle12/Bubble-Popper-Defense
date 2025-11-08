import * as THREE from 'three';

export class ShieldVisualizer {
  private scene: THREE.Scene;
  private shieldMesh: THREE.Mesh | null = null;
  private shieldGroup: THREE.Group;
  private camera: THREE.Camera;

  // Shield properties
  private shieldRadius: number = 2;
  private isActive: boolean = false;
  private shieldHitTime: number = 0;
  private shieldBreakTime: number = 0;

  // Visual effects
  private rippleEffect: THREE.Mesh | null = null;
  private particleSystem: THREE.Points | null = null;
  private energyField: THREE.Mesh | null = null;

  // Animation parameters
  private time: number = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.shieldGroup = new THREE.Group();
    this.scene.add(this.shieldGroup);

    this.createShieldMesh();
    this.createEnergyParticles();
    this.createEnergyField();
  }

  private createShieldMesh(): void {
    // Create hexagonal shield geometry
    const geometry = new THREE.IcosahedronGeometry(this.shieldRadius, 2);

    // Custom shader material for energy shield effect
    const material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        hitTime: { value: 0 },
        breakTime: { value: 0 },
        opacity: { value: 0.3 },
        color: { value: new THREE.Color(0x00d4ff) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float hitTime;
        uniform float breakTime;
        uniform float opacity;
        uniform vec3 color;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Fresnel effect for edge glow
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);

          // Hexagonal pattern
          float hexPattern = sin(vPosition.x * 10.0) * sin(vPosition.y * 10.0) * sin(vPosition.z * 10.0);
          hexPattern = step(0.8, hexPattern);

          // Energy pulse
          float pulse = sin(time * 2.0) * 0.2 + 0.8;

          // Hit effect - ripple from impact point
          float hitEffect = 0.0;
          if (hitTime > 0.0) {
            float rippleRadius = hitTime * 5.0;
            float dist = length(vPosition);
            float ripple = smoothstep(rippleRadius - 0.5, rippleRadius, dist) -
                           smoothstep(rippleRadius, rippleRadius + 0.5, dist);
            hitEffect = ripple * (1.0 - hitTime);
          }

          // Break effect - shatter animation
          float breakEffect = 0.0;
          if (breakTime > 0.0) {
            breakEffect = sin(breakTime * 20.0) * (1.0 - breakTime);
          }

          // Combine effects
          float finalAlpha = opacity * pulse * (fresnel + 0.3) + hexPattern * 0.2 + hitEffect + breakEffect;
          finalAlpha = clamp(finalAlpha, 0.0, 1.0);

          // Add color variation based on effects
          vec3 finalColor = color;
          if (hitTime > 0.0) {
            finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), hitEffect);
          }
          if (breakTime > 0.0) {
            finalColor = mix(finalColor, vec3(1.0, 0.2, 0.0), breakEffect);
          }

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `
    });

    this.shieldMesh = new THREE.Mesh(geometry, material);
    this.shieldMesh.visible = false;
    this.shieldGroup.add(this.shieldMesh);
  }

  private createEnergyParticles(): void {
    // Create floating energy particles around shield
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random position on sphere surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = this.shieldRadius + Math.random() * 0.5;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random velocities for floating motion
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      sizes[i] = Math.random() * 0.1 + 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ffff) }
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float size;

        uniform float time;

        varying float vOpacity;

        void main() {
          vec3 pos = position + velocity * time * 10.0;

          // Keep particles on sphere surface
          float radius = length(pos);
          pos = normalize(pos) * (2.0 + sin(time + radius) * 0.3);

          vOpacity = sin(time * 2.0 + radius) * 0.5 + 0.5;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vOpacity;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float opacity = (1.0 - dist * 2.0) * vOpacity * 0.8;
          gl_FragColor = vec4(color, opacity);
        }
      `
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.visible = false;
    this.shieldGroup.add(this.particleSystem);
  }

  private createEnergyField(): void {
    // Create inner energy field with animated texture
    const geometry = new THREE.SphereGeometry(this.shieldRadius * 0.95, 32, 32);

    const material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.1 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;

        varying vec2 vUv;
        varying vec3 vPosition;

        // Noise function for energy waves
        float noise(vec3 p) {
          return sin(p.x * 10.0) * sin(p.y * 10.0) * sin(p.z * 10.0);
        }

        void main() {
          // Energy waves flowing across surface
          float wave1 = sin(vUv.x * 20.0 - time * 2.0) * 0.5 + 0.5;
          float wave2 = sin(vUv.y * 20.0 + time * 1.5) * 0.5 + 0.5;
          float energy = wave1 * wave2;

          // Add noise for organic feel
          energy += noise(vPosition + time * 0.5) * 0.3;

          vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 1.0), energy);

          gl_FragColor = vec4(color, energy * opacity);
        }
      `
    });

    this.energyField = new THREE.Mesh(geometry, material);
    this.energyField.visible = false;
    this.shieldGroup.add(this.energyField);
  }

  public activateShield(shieldLevel: number, maxShield: number): void {
    this.isActive = shieldLevel > 0;
    const opacity = (shieldLevel / maxShield) * 0.3;

    if (this.shieldMesh && this.shieldMesh.material instanceof THREE.ShaderMaterial) {
      this.shieldMesh.visible = this.isActive;
      this.shieldMesh.material.uniforms.opacity.value = opacity;
    }

    if (this.particleSystem) {
      this.particleSystem.visible = this.isActive;
    }

    if (this.energyField && this.energyField.material instanceof THREE.ShaderMaterial) {
      this.energyField.visible = this.isActive;
      this.energyField.material.uniforms.opacity.value = opacity * 0.3;
    }
  }

  public onShieldHit(hitPosition?: THREE.Vector3): void {
    this.shieldHitTime = 1.0;

    // Create ripple effect at hit point
    if (hitPosition && !this.rippleEffect) {
      const geometry = new THREE.RingGeometry(0.1, 0.5, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });

      this.rippleEffect = new THREE.Mesh(geometry, material);
      this.rippleEffect.position.copy(hitPosition);
      this.rippleEffect.lookAt(this.camera.position);
      this.shieldGroup.add(this.rippleEffect);

      // Animate and remove ripple
      let scale = 1;
      const animateRipple = () => {
        scale += 0.2;
        this.rippleEffect!.scale.set(scale, scale, scale);
        (this.rippleEffect!.material as THREE.MeshBasicMaterial).opacity *= 0.9;

        if ((this.rippleEffect!.material as THREE.MeshBasicMaterial).opacity > 0.01) {
          requestAnimationFrame(animateRipple);
        } else {
          this.shieldGroup.remove(this.rippleEffect!);
          this.rippleEffect!.geometry.dispose();
          (this.rippleEffect!.material as THREE.Material).dispose();
          this.rippleEffect = null;
        }
      };
      animateRipple();
    }
  }

  public onShieldBreak(): void {
    this.shieldBreakTime = 1.0;

    // Create shatter particles
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Random position on shield surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = this.shieldRadius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = this.shieldRadius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = this.shieldRadius * Math.cos(phi);

      // Outward velocities
      velocities[i * 3] = positions[i * 3] * 0.1;
      velocities[i * 3 + 1] = positions[i * 3 + 1] * 0.1;
      velocities[i * 3 + 2] = positions[i * 3 + 2] * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 0.1,
      transparent: true,
      opacity: 1.0
    });

    const shatterParticles = new THREE.Points(geometry, material);
    this.shieldGroup.add(shatterParticles);

    // Animate shatter
    let time = 0;
    const animateShatter = () => {
      time += 0.016;
      const positions = geometry.attributes.position.array as Float32Array;
      const velocities = geometry.attributes.velocity.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1] - time * 0.5; // Gravity
        positions[i * 3 + 2] += velocities[i * 3 + 2];
      }

      geometry.attributes.position.needsUpdate = true;
      material.opacity *= 0.95;

      if (material.opacity > 0.01) {
        requestAnimationFrame(animateShatter);
      } else {
        this.shieldGroup.remove(shatterParticles);
        geometry.dispose();
        material.dispose();
      }
    };
    animateShatter();
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    // Update shield position to follow camera
    const cameraPos = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPos);
    this.shieldGroup.position.copy(cameraPos);

    // Update shader uniforms
    if (this.shieldMesh && this.shieldMesh.material instanceof THREE.ShaderMaterial) {
      this.shieldMesh.material.uniforms.time.value = this.time;
      this.shieldMesh.material.uniforms.hitTime.value = this.shieldHitTime;
      this.shieldMesh.material.uniforms.breakTime.value = this.shieldBreakTime;
    }

    if (this.particleSystem && this.particleSystem.material instanceof THREE.ShaderMaterial) {
      this.particleSystem.material.uniforms.time.value = this.time;
    }

    if (this.energyField && this.energyField.material instanceof THREE.ShaderMaterial) {
      this.energyField.material.uniforms.time.value = this.time;
    }

    // Decay hit and break times
    if (this.shieldHitTime > 0) {
      this.shieldHitTime -= deltaTime * 2;
      if (this.shieldHitTime < 0) this.shieldHitTime = 0;
    }

    if (this.shieldBreakTime > 0) {
      this.shieldBreakTime -= deltaTime * 2;
      if (this.shieldBreakTime < 0) this.shieldBreakTime = 0;
    }

    // Rotate shield slowly for visual interest
    if (this.shieldMesh) {
      this.shieldMesh.rotation.y += deltaTime * 0.1;
      this.shieldMesh.rotation.x += deltaTime * 0.05;
    }
  }

  public dispose(): void {
    // Clean up all resources
    this.shieldGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.scene.remove(this.shieldGroup);
  }
}