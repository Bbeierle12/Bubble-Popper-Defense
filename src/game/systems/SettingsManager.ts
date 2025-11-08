export interface GameSettings {
  mouseSensitivity: number;
  audioVolume: number;
  invertY: boolean;
}

export class SettingsManager {
  private static readonly STORAGE_KEY = 'bubblePopperSettings';
  private settings: GameSettings;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    // Default settings
    this.settings = {
      mouseSensitivity: 0.002,
      audioVolume: 0.3,
      invertY: false
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
