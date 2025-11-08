import * as THREE from 'three';

interface ProgressionData {
  totalStars: number;
  unlockedWeapons: string[];
  achievements: string[];
  statistics: {
    totalBubblesPopped: number;
    totalWavesCompleted: number;
    highestWave: number;
    totalPlayTime: number;
    totalDamageDealt: number;
    perfectWaves: number;
    highestCombo: number;
    totalCoinsEarned: number;
    totalBossesDefeated: number;
    totalBombsUsed: number;
  };
  weaponUnlockCosts: {
    rapidFire: number;
    spreadShot: number;
    pierceShot: number;
    laserBeam: number;
  };
  sessionStartTime: number;
}

export class ProgressionManager extends THREE.EventDispatcher {
  private static instance: ProgressionManager;
  private data: ProgressionData;
  private readonly STORAGE_KEY = 'bubblePopperDefense_progression';
  private sessionStarsEarned = 0;

  // Star costs for weapon unlocks
  private readonly UNLOCK_COSTS = {
    rapidFire: 10,
    spreadShot: 25,
    pierceShot: 40,
    laserBeam: 60,
    endlessMode: 100
  };

  private constructor() {
    super();
    this.data = this.loadData();
    this.data.sessionStartTime = Date.now();
  }

  static getInstance(): ProgressionManager {
    if (!ProgressionManager.instance) {
      ProgressionManager.instance = new ProgressionManager();
    }
    return ProgressionManager.instance;
  }

  private getDefaultData(): ProgressionData {
    return {
      totalStars: 0,
      unlockedWeapons: ['standard'], // Standard weapon always unlocked
      achievements: [],
      statistics: {
        totalBubblesPopped: 0,
        totalWavesCompleted: 0,
        highestWave: 0,
        totalPlayTime: 0,
        totalDamageDealt: 0,
        perfectWaves: 0,
        highestCombo: 0,
        totalCoinsEarned: 0,
        totalBossesDefeated: 0,
        totalBombsUsed: 0
      },
      weaponUnlockCosts: {
        rapidFire: this.UNLOCK_COSTS.rapidFire,
        spreadShot: this.UNLOCK_COSTS.spreadShot,
        pierceShot: this.UNLOCK_COSTS.pierceShot,
        laserBeam: this.UNLOCK_COSTS.laserBeam
      },
      sessionStartTime: Date.now()
    };
  }

  private loadData(): ProgressionData {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Merge with default data to ensure all fields exist
        return { ...this.getDefaultData(), ...parsed };
      }
    } catch (error) {
      console.error('Failed to load progression data:', error);
    }
    return this.getDefaultData();
  }

  private saveData(): void {
    try {
      // Update play time before saving
      const sessionTime = Math.floor((Date.now() - this.data.sessionStartTime) / 1000);
      this.data.statistics.totalPlayTime += sessionTime;
      this.data.sessionStartTime = Date.now();

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      (this as any).dispatchEvent({ type: 'progressionSaved' });
    } catch (error) {
      console.error('Failed to save progression data:', error);
    }
  }

  // Star earning methods
  earnStarsForWave(waveNumber: number, perfect: boolean = false): number {
    let starsEarned = waveNumber; // Base stars equal to wave number

    // Bonus stars for perfect waves (no damage taken)
    if (perfect) {
      starsEarned += Math.floor(waveNumber / 2);
    }

    // Milestone bonuses
    if (waveNumber === 10) {
      starsEarned += 5; // Boss wave bonus
    } else if (waveNumber % 5 === 0) {
      starsEarned += 2; // Every 5th wave bonus
    }

    this.addStars(starsEarned);
    return starsEarned;
  }

  earnStarsForAchievement(achievementId: string): number {
    // Achievement star rewards based on difficulty
    const achievementRewards: { [key: string]: number } = {
      firstBlood: 1,
      comboMaster: 3,
      untouchable: 5,
      bubblePopper: 2,
      waveWarrior: 5,
      speedDemon: 3,
      sharpshooter: 4,
      economizer: 3,
      survivor: 4,
      bossSlayer: 10,
      perfectionist: 7,
      weaponMaster: 5,
      bombExpert: 3,
      endurance: 8,
      legendary: 15
    };

    const stars = achievementRewards[achievementId] || 1;
    this.addStars(stars);
    return stars;
  }

  private addStars(amount: number): void {
    this.data.totalStars += amount;
    this.sessionStarsEarned += amount;
    this.saveData();
    (this as any).dispatchEvent({
      type: 'starsEarned',
      stars: amount,
      total: this.data.totalStars
    });
  }

  // Weapon unlock methods
  canUnlockWeapon(weaponType: string): boolean {
    const cost = this.getWeaponUnlockCost(weaponType);
    return cost > 0 && this.data.totalStars >= cost && !this.isWeaponUnlocked(weaponType);
  }

  getWeaponUnlockCost(weaponType: string): number {
    switch(weaponType) {
      case 'rapidFire': return this.data.weaponUnlockCosts.rapidFire;
      case 'spreadShot': return this.data.weaponUnlockCosts.spreadShot;
      case 'pierceShot': return this.data.weaponUnlockCosts.pierceShot;
      case 'laserBeam': return this.data.weaponUnlockCosts.laserBeam;
      default: return 0;
    }
  }

  isWeaponUnlocked(weaponType: string): boolean {
    return this.data.unlockedWeapons.includes(weaponType);
  }

  unlockWeapon(weaponType: string): boolean {
    if (!this.canUnlockWeapon(weaponType)) {
      return false;
    }

    const cost = this.getWeaponUnlockCost(weaponType);
    this.data.totalStars -= cost;
    this.data.unlockedWeapons.push(weaponType);
    this.saveData();

    (this as any).dispatchEvent({
      type: 'weaponUnlocked',
      weapon: weaponType,
      starsRemaining: this.data.totalStars
    });

    return true;
  }

  // Statistics tracking
  updateStatistic(stat: keyof ProgressionData['statistics'], value: number): void {
    if (stat === 'highestWave' || stat === 'highestCombo') {
      this.data.statistics[stat] = Math.max(this.data.statistics[stat], value);
    } else {
      this.data.statistics[stat] += value;
    }

    // Auto-save every 10 statistical updates
    if (Math.random() < 0.1) {
      this.saveData();
    }
  }

  // Achievement methods
  hasAchievement(achievementId: string): boolean {
    return this.data.achievements.includes(achievementId);
  }

  unlockAchievement(achievementId: string): boolean {
    if (this.hasAchievement(achievementId)) {
      return false;
    }

    this.data.achievements.push(achievementId);
    const starsEarned = this.earnStarsForAchievement(achievementId);
    this.saveData();

    (this as any).dispatchEvent({
      type: 'achievementUnlocked',
      achievement: achievementId,
      starsEarned
    });

    return true;
  }

  // Getters
  getTotalStars(): number {
    return this.data.totalStars;
  }

  getSessionStars(): number {
    return this.sessionStarsEarned;
  }

  getStatistics(): ProgressionData['statistics'] {
    return { ...this.data.statistics };
  }

  getUnlockedWeapons(): string[] {
    return [...this.data.unlockedWeapons];
  }

  getAchievements(): string[] {
    return [...this.data.achievements];
  }

  getProgressSummary(): {
    stars: number;
    weaponsUnlocked: number;
    achievementsUnlocked: number;
    highestWave: number;
    totalPlayTime: number;
  } {
    return {
      stars: this.data.totalStars,
      weaponsUnlocked: this.data.unlockedWeapons.length - 1, // Exclude standard
      achievementsUnlocked: this.data.achievements.length,
      highestWave: this.data.statistics.highestWave,
      totalPlayTime: this.data.statistics.totalPlayTime
    };
  }

  // Special unlock checks
  isEndlessModeUnlocked(): boolean {
    return this.data.totalStars >= this.UNLOCK_COSTS.endlessMode ||
           this.data.statistics.highestWave >= 20;
  }

  // Reset methods (for testing or player request)
  resetProgress(): void {
    if (confirm('Are you sure you want to reset all progression? This cannot be undone!')) {
      this.data = this.getDefaultData();
      this.sessionStarsEarned = 0;
      this.saveData();
      (this as any).dispatchEvent({ type: 'progressionReset' });
      window.location.reload(); // Reload to reset everything
    }
  }

  // Debug method (only works in development)
  grantStars(amount: number): void {
    // Check if running in development mode (can be toggled)
    const isDevelopment = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
      this.addStars(amount);
      console.log(`Granted ${amount} stars. Total: ${this.data.totalStars}`);
    }
  }
}