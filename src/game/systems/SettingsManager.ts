export interface KeyBinding {
  action: string;
  key: string;
  displayName: string;
}

export interface GameSettings {
  // Mouse Controls
  mouseSensitivity: number;
  invertY: boolean;

  // Audio
  audioVolume: number;

  // Keyboard Controls
  keyBindings: KeyBinding[];

  // Screen Preferences
  fullscreen: boolean;
  resolution: string;
  fov: number;
  renderDistance: number;
  shadowQuality: 'low' | 'medium' | 'high';
  antialiasing: boolean;
  vsync: boolean;
  fps: number;
}

export class SettingsManager {
  private static readonly STORAGE_KEY = 'bubblePopperSettings';
  private settings: GameSettings;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    // Default settings
    this.settings = {
      // Mouse Controls
      mouseSensitivity: 0.002,
      invertY: false,

      // Audio
      audioVolume: 0.3,

      // Keyboard Controls - Default bindings
      keyBindings: [
        // Movement
        { action: 'moveForward', key: 'w', displayName: 'Move Forward' },
        { action: 'moveBackward', key: 's', displayName: 'Move Backward' },
        { action: 'moveLeft', key: 'a', displayName: 'Move Left' },
        { action: 'moveRight', key: 'd', displayName: 'Move Right' },
        { action: 'sprint', key: 'shift', displayName: 'Sprint' },

        // Combat
        { action: 'shoot', key: 'mouse0', displayName: 'Shoot' },
        { action: 'bomb', key: 'b', displayName: 'Use Bomb' },

        // Weapon Selection
        { action: 'weapon1', key: '1', displayName: 'Select Weapon 1' },
        { action: 'weapon2', key: '2', displayName: 'Select Weapon 2' },
        { action: 'weapon3', key: '3', displayName: 'Select Weapon 3' },
        { action: 'weapon4', key: '4', displayName: 'Select Weapon 4' },

        // UI
        { action: 'openSettings', key: 's', displayName: 'Open Settings' },
        { action: 'openProgression', key: 'p', displayName: 'Open Progression' },
        { action: 'pause', key: 'escape', displayName: 'Pause/Resume' }
      ],

      // Screen Preferences
      fullscreen: false,
      resolution: 'auto',
      fov: 75,
      renderDistance: 1000,
      shadowQuality: 'medium',
      antialiasing: true,
      vsync: true,
      fps: 60
    };

    // Load saved settings
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(SettingsManager.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SettingsManager.STORAGE_KEY, JSON.stringify(this.settings));
      this.emit('settingsChanged', this.settings);
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public getMouseSensitivity(): number {
    return this.settings.mouseSensitivity;
  }

  public setMouseSensitivity(value: number): void {
    this.settings.mouseSensitivity = Math.max(0.0001, Math.min(0.01, value));
    this.saveSettings();
  }

  public getAudioVolume(): number {
    return this.settings.audioVolume;
  }

  public setAudioVolume(value: number): void {
    this.settings.audioVolume = Math.max(0, Math.min(1, value));
    this.saveSettings();
  }

  public getInvertY(): boolean {
    return this.settings.invertY;
  }

  public setInvertY(value: boolean): void {
    this.settings.invertY = value;
    this.saveSettings();
  }

  // Key Binding Methods
  public getKeyBinding(action: string): string | undefined {
    const binding = this.settings.keyBindings.find(b => b.action === action);
    return binding?.key;
  }

  public setKeyBinding(action: string, key: string): void {
    const binding = this.settings.keyBindings.find(b => b.action === action);
    if (binding) {
      // Check for conflicts
      const conflict = this.settings.keyBindings.find(b => b.key === key && b.action !== action);
      if (conflict) {
        // Swap keys if there's a conflict
        conflict.key = binding.key;
      }
      binding.key = key;
      this.saveSettings();
    }
  }

  public getKeyBindings(): KeyBinding[] {
    return [...this.settings.keyBindings];
  }

  public resetKeyBindings(): void {
    // Reset to default bindings
    this.settings.keyBindings = [
      // Movement
      { action: 'moveForward', key: 'w', displayName: 'Move Forward' },
      { action: 'moveBackward', key: 's', displayName: 'Move Backward' },
      { action: 'moveLeft', key: 'a', displayName: 'Move Left' },
      { action: 'moveRight', key: 'd', displayName: 'Move Right' },
      { action: 'sprint', key: 'shift', displayName: 'Sprint' },

      // Combat
      { action: 'shoot', key: 'mouse0', displayName: 'Shoot' },
      { action: 'bomb', key: 'b', displayName: 'Use Bomb' },

      // Weapon Selection
      { action: 'weapon1', key: '1', displayName: 'Select Weapon 1' },
      { action: 'weapon2', key: '2', displayName: 'Select Weapon 2' },
      { action: 'weapon3', key: '3', displayName: 'Select Weapon 3' },
      { action: 'weapon4', key: '4', displayName: 'Select Weapon 4' },

      // UI
      { action: 'openSettings', key: 's', displayName: 'Open Settings' },
      { action: 'openProgression', key: 'p', displayName: 'Open Progression' },
      { action: 'pause', key: 'escape', displayName: 'Pause/Resume' }
    ];
    this.saveSettings();
  }

  // Screen Preference Methods
  public getFullscreen(): boolean {
    return this.settings.fullscreen;
  }

  public setFullscreen(value: boolean): void {
    this.settings.fullscreen = value;
    this.saveSettings();
  }

  public getResolution(): string {
    return this.settings.resolution;
  }

  public setResolution(value: string): void {
    this.settings.resolution = value;
    this.saveSettings();
  }

  public getFOV(): number {
    return this.settings.fov;
  }

  public setFOV(value: number): void {
    this.settings.fov = Math.max(60, Math.min(120, value));
    this.saveSettings();
  }

  public getRenderDistance(): number {
    return this.settings.renderDistance;
  }

  public setRenderDistance(value: number): void {
    this.settings.renderDistance = Math.max(100, Math.min(5000, value));
    this.saveSettings();
  }

  public getShadowQuality(): 'low' | 'medium' | 'high' {
    return this.settings.shadowQuality;
  }

  public setShadowQuality(value: 'low' | 'medium' | 'high'): void {
    this.settings.shadowQuality = value;
    this.saveSettings();
  }

  public getAntialiasing(): boolean {
    return this.settings.antialiasing;
  }

  public setAntialiasing(value: boolean): void {
    this.settings.antialiasing = value;
    this.saveSettings();
  }

  public getVsync(): boolean {
    return this.settings.vsync;
  }

  public setVsync(value: boolean): void {
    this.settings.vsync = value;
    this.saveSettings();
  }

  public getFPS(): number {
    return this.settings.fps;
  }

  public setFPS(value: number): void {
    this.settings.fps = Math.max(30, Math.min(240, value));
    this.saveSettings();
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
