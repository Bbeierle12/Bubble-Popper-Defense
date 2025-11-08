export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.3;
  
  // Footstep system
  private footstepTimer: number = 0;
  private readonly FOOTSTEP_INTERVAL_WALK: number = 0.45;
  private readonly FOOTSTEP_INTERVAL_SPRINT: number = 0.30;

  constructor() {
    // Initialize AudioContext on first user interaction
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  private ensureAudioContext(): boolean {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    return this.audioContext !== null && this.masterGain !== null;
  }

  private playTone(frequency: number, duration: number, volume: number = 1.0, type: OscillatorType = 'sine'): void {
    if (!this.ensureAudioContext()) return;

    const osc = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    // Envelope for smooth sound
    const now = this.audioContext!.currentTime;
    gainNode.gain.value = 0;
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playNoise(duration: number, volume: number = 1.0): void {
    if (!this.ensureAudioContext()) return;

    const bufferSize = this.audioContext!.sampleRate * duration;
    const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const source = this.audioContext!.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioContext!.createGain();
    const now = this.audioContext!.currentTime;
    gainNode.gain.value = volume * 0.2;
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(gainNode);
    gainNode.connect(this.masterGain!);

    source.start(now);
  }

  // Shooting sound - quick pew
  public playShootSound(): void {
    this.playTone(200, 0.05, 0.8, 'square');
    // Add a little high-frequency click
    this.playTone(800, 0.02, 0.3, 'sine');
  }

  // Pop sounds - pitched based on bubble size
  public playPopSound(size: 'small' | 'medium' | 'large' | 'boss'): void {
    let frequency: number;

    switch (size) {
      case 'small':
        frequency = 600; // High pitch
        break;
      case 'medium':
        frequency = 400; // Medium pitch
        break;
      case 'large':
        frequency = 250; // Low pitch
        break;
      case 'boss':
        frequency = 100; // Very low pitch for boss
        break;
    }

    // Main pop tone
    this.playTone(frequency, 0.15, 1.0, 'sine');
    // Harmonic overtone
    this.playTone(frequency * 1.5, 0.1, 0.5, 'sine');
    // Short noise burst for "pop" texture
    this.playNoise(0.05, 0.6);

    // Extra impact for boss
    if (size === 'boss') {
      this.playTone(50, 0.3, 1.0, 'sine');
      this.playNoise(0.2, 1.0);
    }
  }

  // Damage sound - low thud with impact
  public playDamageSound(): void {
    // Deep bass hit
    this.playTone(80, 0.3, 1.0, 'sine');
    // Mid-range impact
    this.playTone(150, 0.2, 0.7, 'triangle');
    // Noise for impact texture
    this.playNoise(0.15, 0.8);
  }

  // Shield hit - metallic clink
  public playShieldHitSound(): void {
    this.playTone(600, 0.1, 0.8, 'triangle');
    this.playTone(850, 0.08, 0.6, 'sine');
    this.playNoise(0.05, 0.4);
  }

  // Wave complete - success jingle
  public playWaveCompleteSound(): void {
    const baseFreq = 440; // A note

    // Ascending arpeggio
    setTimeout(() => this.playTone(baseFreq, 0.15, 0.8), 0);
    setTimeout(() => this.playTone(baseFreq * 1.25, 0.15, 0.8), 100);
    setTimeout(() => this.playTone(baseFreq * 1.5, 0.25, 1.0), 200);
  }

  // Combo sound - pitch increases with combo
  public playComboSound(comboCount: number): void {
    const basePitch = 300;
    const pitch = basePitch + (comboCount * 50);
    const clampedPitch = Math.min(pitch, 1200); // Cap at high frequency

    this.playTone(clampedPitch, 0.08, 0.7, 'sine');
    this.playTone(clampedPitch * 1.5, 0.05, 0.4, 'sine');
  }

  // Footstep sounds - subtle thuds
  public playFootstepSound(): void {
    // Low thud sound with variation
    const baseFreq = 60 + Math.random() * 20;
    this.playTone(baseFreq, 0.08, 0.15, 'sine');
    // Add a tiny bit of noise for texture
    this.playNoise(0.04, 0.08);
  }

  // Update footstep system - call from game loop
  public updateFootsteps(deltaTime: number, isMoving: boolean, isSprinting: boolean): void {
    if (!isMoving) {
      this.footstepTimer = 0;
      return;
    }

    // Adjust footstep speed for sprinting
    const currentInterval = isSprinting 
      ? this.FOOTSTEP_INTERVAL_SPRINT 
      : this.FOOTSTEP_INTERVAL_WALK;

    this.footstepTimer += deltaTime;
    if (this.footstepTimer >= currentInterval) {
      this.playFootstepSound();
      this.footstepTimer = 0;
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }
}
