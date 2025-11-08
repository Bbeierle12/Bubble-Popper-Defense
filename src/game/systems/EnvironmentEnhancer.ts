import * as THREE from 'three';

export class EnvironmentEnhancer {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;

  // Environment components
  private skybox: THREE.Mesh | null = null;
  private animatedGrid: THREE.Mesh | null = null;
  private dustParticles: THREE.Points | null = null;
  private nebulaClouds: THREE.Group;
  private floatingDebris: THREE.Group;

  // Animation parameters
  private time: number = 0;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.nebulaClouds = new THREE.Group();
    this.floatingDebris = new THREE.Group();

    this.createSkybox();
    this.createAnimatedGrid();
    this.createDustParticles();
    this.createNebulaClouds();
    this.createFloatingDebris();
    this.setupFogEffects();
    this.setupLightingEnhancements();
  }

  private createSkybox(): void {
    // Create procedural space skybox with shader
    const geometry = new THREE.SphereGeometry(500, 32, 32);

    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;

        varying vec3 vPosition;
        varying vec2 vUv;

        // Simplex noise for nebula generation
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }

        float noise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);

          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);

          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;

          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);

          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);

          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);

          vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vec3 direction = normalize(vPosition);

          // Deep space background
          vec3 spaceColor = vec3(0.02, 0.02, 0.05);

          // Stars
          float stars = 0.0;
          float starDensity = 1000.0;
          vec3 starPos = direction * starDensity;
          float starNoise = noise(starPos);
          if (starNoise > 0.95) {
            stars = pow((starNoise - 0.95) * 20.0, 3.0);
          }

          // Nebula clouds
          vec3 nebula1Pos = direction * 2.0 + time * 0.01;
          float nebula1 = noise(nebula1Pos) * 0.5 + 0.5;
          nebula1 = pow(nebula1, 3.0);

          vec3 nebula2Pos = direction * 3.0 - time * 0.02;
          float nebula2 = noise(nebula2Pos) * 0.5 + 0.5;
          nebula2 = pow(nebula2, 2.0);

          // Color the nebula
          vec3 nebula1Color = mix(vec3(0.1, 0.3, 0.8), vec3(0.8, 0.2, 0.5), nebula1);
          vec3 nebula2Color = mix(vec3(0.5, 0.1, 0.8), vec3(0.2, 0.8, 0.5), nebula2);

          // Combine nebula colors
          vec3 nebulaColor = nebula1Color * nebula1 * 0.3 + nebula2Color * nebula2 * 0.2;

          // Galaxy band (milky way effect)
          float galaxyBand = 1.0 - abs(direction.y);
          galaxyBand = pow(galaxyBand, 4.0);
          vec3 galaxyColor = vec3(0.15, 0.1, 0.3) * galaxyBand;

          // Combine all elements
          vec3 finalColor = spaceColor + vec3(stars) + nebulaColor + galaxyColor;

          // Add subtle color variation
          finalColor += vec3(
            noise(direction * 10.0) * 0.02,
            noise(direction * 15.0) * 0.02,
            noise(direction * 20.0) * 0.02
          );

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    this.skybox = new THREE.Mesh(geometry, material);
    this.scene.add(this.skybox);
  }

  private createAnimatedGrid(): void {
    // Replace the static grid with an animated one
    const geometry = new THREE.PlaneGeometry(100, 100, 50, 50);

    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x00d4ff) },
        color2: { value: new THREE.Color(0x003344) }
      },
      vertexShader: `
        uniform float time;

        varying vec2 vUv;
        varying float vWave;

        void main() {
          vUv = uv;

          // Create wave effect
          float wave = sin(position.x * 0.1 + time) * 0.1;
          wave += sin(position.z * 0.1 + time * 1.3) * 0.1;

          vec3 pos = position;
          pos.y += wave;

          vWave = wave;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;

        varying vec2 vUv;
        varying float vWave;

        void main() {
          // Grid lines
          float gridX = step(0.95, fract(vUv.x * 50.0));
          float gridZ = step(0.95, fract(vUv.y * 50.0));
          float grid = max(gridX, gridZ);

          // Energy pulse along lines
          float pulse = sin(time * 2.0 + vUv.x * 10.0) * 0.5 + 0.5;
          pulse *= sin(time * 1.5 + vUv.y * 10.0) * 0.5 + 0.5;

          // Color based on wave and pulse
          vec3 color = mix(color2, color1, pulse + vWave * 2.0);

          // Distance fade
          float dist = length(vUv - 0.5) * 2.0;
          float fade = 1.0 - smoothstep(0.5, 1.0, dist);

          float alpha = grid * fade * (0.5 + pulse * 0.5);

          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    this.animatedGrid = new THREE.Mesh(geometry, material);
    this.animatedGrid.rotation.x = -Math.PI / 2;
    this.animatedGrid.position.y = 0.02; // Slightly above ground
    this.scene.add(this.animatedGrid);
  }

  private createDustParticles(): void {
    // Floating dust particles for atmosphere
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random position in space
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      // Gentle floating velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      sizes[i] = Math.random() * 0.05 + 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        fogColor: { value: new THREE.Color(0x0a0a1a) },
        fogNear: { value: 20 },
        fogFar: { value: 50 }
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float size;

        uniform float time;

        varying float vOpacity;
        varying float vDepth;

        void main() {
          vec3 pos = position;

          // Float particles gently
          pos += velocity * time * 10.0;
          pos.x += sin(time * 0.5 + position.y) * 0.5;
          pos.z += cos(time * 0.3 + position.x) * 0.5;
          pos.y += sin(time + position.x * 0.1) * 0.2;

          // Wrap around
          pos = mod(pos + 50.0, 100.0) - 50.0;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;

          vDepth = -mvPosition.z;
          vOpacity = 1.0;
        }
      `,
      fragmentShader: `
        uniform vec3 fogColor;
        uniform float fogNear;
        uniform float fogFar;

        varying float vOpacity;
        varying float vDepth;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float opacity = (1.0 - dist * 2.0) * vOpacity * 0.3;

          // Apply fog
          float fogFactor = smoothstep(fogNear, fogFar, vDepth);
          vec3 color = mix(vec3(0.8, 0.8, 0.9), fogColor, fogFactor);

          gl_FragColor = vec4(color, opacity * (1.0 - fogFactor * 0.5));
        }
      `
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  private createNebulaClouds(): void {
    // Add volumetric nebula clouds in the distance
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.SphereGeometry(
        10 + Math.random() * 20,
        8,
        8
      );

      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
        transparent: true,
        opacity: 0.1,
        fog: false
      });

      const cloud = new THREE.Mesh(geometry, material);
      cloud.position.set(
        (Math.random() - 0.5) * 100,
        10 + Math.random() * 20,
        -30 - Math.random() * 50
      );
      cloud.scale.set(
        1 + Math.random(),
        0.5 + Math.random() * 0.5,
        1 + Math.random()
      );

      this.nebulaClouds.add(cloud);
    }

    this.scene.add(this.nebulaClouds);
  }

  private createFloatingDebris(): void {
    // Add floating space debris
    const debrisCount = 20;

    for (let i = 0; i < debrisCount; i++) {
      const geometry = new THREE.IcosahedronGeometry(Math.random() * 0.3 + 0.1, 0);
      const material = new THREE.MeshStandardMaterial({
        color: 0x444466,
        metalness: 0.5,
        roughness: 0.3,
        emissive: 0x000033,
        emissiveIntensity: 0.2
      });

      const debris = new THREE.Mesh(geometry, material);
      debris.position.set(
        (Math.random() - 0.5) * 80,
        Math.random() * 15 + 2,
        (Math.random() - 0.5) * 80
      );
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // Store initial position and rotation speed for animation
      debris.userData.rotationSpeed = {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
      };
      debris.userData.floatOffset = Math.random() * Math.PI * 2;

      this.floatingDebris.add(debris);
    }

    this.scene.add(this.floatingDebris);
  }

  private setupFogEffects(): void {
    // Enhanced layered fog
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

    // Add additional fog plane for ground mist
    const mistGeometry = new THREE.PlaneGeometry(100, 100);
    const mistMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;

        float noise(vec2 p) {
          return sin(p.x * 10.0 + time) * sin(p.y * 10.0 + time * 1.3);
        }

        void main() {
          float mist = noise(vUv) * 0.5 + 0.5;
          mist *= 1.0 - length(vUv - 0.5) * 2.0;

          gl_FragColor = vec4(0.1, 0.1, 0.2, mist * 0.2);
        }
      `
    });

    const mistPlane = new THREE.Mesh(mistGeometry, mistMaterial);
    mistPlane.rotation.x = -Math.PI / 2;
    mistPlane.position.y = 0.5;
    this.scene.add(mistPlane);
  }

  private setupLightingEnhancements(): void {
    // Add rim lighting for better depth perception
    const rimLight1 = new THREE.DirectionalLight(0x0088ff, 0.3);
    rimLight1.position.set(-20, 10, -20);
    this.scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(0xff0088, 0.3);
    rimLight2.position.set(20, 10, -20);
    this.scene.add(rimLight2);

    // Add volumetric light cone effect
    const coneGeometry = new THREE.ConeGeometry(5, 20, 8, 1, true);
    const coneMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 }
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
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          float intensity = 1.0 - vUv.y;
          intensity = pow(intensity, 2.0);

          float pulse = sin(time * 2.0 + vUv.y * 10.0) * 0.1 + 0.9;

          vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 1.0), vUv.y);

          gl_FragColor = vec4(color, intensity * 0.1 * pulse);
        }
      `
    });

    const lightCone = new THREE.Mesh(coneGeometry, coneMaterial);
    lightCone.position.set(0, 15, -10);
    lightCone.rotation.x = Math.PI;
    this.scene.add(lightCone);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    // Update skybox
    if (this.skybox && this.skybox.material instanceof THREE.ShaderMaterial) {
      this.skybox.material.uniforms.time.value = this.time;
    }

    // Update animated grid
    if (this.animatedGrid && this.animatedGrid.material instanceof THREE.ShaderMaterial) {
      this.animatedGrid.material.uniforms.time.value = this.time;
    }

    // Update dust particles
    if (this.dustParticles && this.dustParticles.material instanceof THREE.ShaderMaterial) {
      this.dustParticles.material.uniforms.time.value = this.time;
    }

    // Rotate nebula clouds slowly
    this.nebulaClouds.rotation.y += deltaTime * 0.01;

    // Animate floating debris
    this.floatingDebris.children.forEach((debris) => {
      debris.rotation.x += debris.userData.rotationSpeed.x;
      debris.rotation.y += debris.userData.rotationSpeed.y;
      debris.rotation.z += debris.userData.rotationSpeed.z;

      // Float up and down
      const floatOffset = debris.userData.floatOffset;
      debris.position.y += Math.sin(this.time + floatOffset) * 0.01;
    });
  }

  public dispose(): void {
    // Clean up all resources
    if (this.skybox) {
      this.skybox.geometry.dispose();
      if (this.skybox.material instanceof THREE.Material) {
        this.skybox.material.dispose();
      }
      this.scene.remove(this.skybox);
    }

    if (this.animatedGrid) {
      this.animatedGrid.geometry.dispose();
      if (this.animatedGrid.material instanceof THREE.Material) {
        this.animatedGrid.material.dispose();
      }
      this.scene.remove(this.animatedGrid);
    }

    if (this.dustParticles) {
      this.dustParticles.geometry.dispose();
      if (this.dustParticles.material instanceof THREE.Material) {
        this.dustParticles.material.dispose();
      }
      this.scene.remove(this.dustParticles);
    }

    this.nebulaClouds.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(this.nebulaClouds);

    this.floatingDebris.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(this.floatingDebris);
  }
}