import * as THREE from 'three';
import { ProgressionManager } from './ProgressionManager';

interface Achievement {
  id: string;
  name: string;
  description: string;
  stars: number;
  icon?: string; // Emoji or symbol
  hidden?: boolean; // Secret achievements
}

export class AchievementManager extends THREE.EventDispatcher {
  private static instance: AchievementManager;
  private progressionManager: ProgressionManager;
  private sessionData: {
    bubblesPopped: number;
    wavesCompleted: number;
    damageDealt: number;
    currentCombo: number;
    highestCombo: number;
    coinsEarned: number;
    perfectWaves: number;
    bombsUsed: number;
    damageTaken: number;
    accuracyShots: number;
    accuracyHits: number;
    consecutivePerfectWaves: number;
    weaponKills: { [key: string]: number };
    bubbleTypesPopped: { [key: string]: number };
    bossesDefeated: number;
  };

  private readonly achievements: Achievement[] = [
    // Beginner achievements
    { id: 'firstBlood', name: 'First Blood', description: 'Pop your first bubble', stars: 1, icon: '🎯' },
    { id: 'waveRookie', name: 'Wave Rookie', description: 'Complete Wave 1', stars: 1, icon: '🌊' },
    { id: 'centurion', name: 'Centurion', description: 'Pop 100 bubbles in total', stars: 2, icon: '💯' },

    // Combo achievements
    { id: 'comboStarter', name: 'Combo Starter', description: 'Achieve a 5x combo multiplier', stars: 2, icon: '🔥' },
    { id: 'comboMaster', name: 'Combo Master', description: 'Achieve a 10x combo multiplier', stars: 3, icon: '💥' },
    { id: 'comboLegend', name: 'Combo Legend', description: 'Achieve a 20x combo multiplier', stars: 5, icon: '⚡' },

    // Wave progression
    { id: 'waveWarrior', name: 'Wave Warrior', description: 'Reach Wave 10', stars: 5, icon: '⚔️' },
    { id: 'waveCommander', name: 'Wave Commander', description: 'Reach Wave 15', stars: 7, icon: '👑' },
    { id: 'waveLegend', name: 'Wave Legend', description: 'Reach Wave 20', stars: 10, icon: '🏆' },

    // Perfect play
    { id: 'untouchable', name: 'Untouchable', description: 'Complete a wave without taking damage', stars: 3, icon: '🛡️' },
    { id: 'perfectionist', name: 'Perfectionist', description: 'Complete 5 perfect waves', stars: 7, icon: '✨' },
    { id: 'flawless', name: 'Flawless Victory', description: 'Complete 3 consecutive waves perfectly', stars: 5, icon: '💎' },

    // Boss achievements
    { id: 'bossSlayer', name: 'Boss Slayer', description: 'Defeat your first boss', stars: 10, icon: '🐲' },
    { id: 'bossMaster', name: 'Boss Master', description: 'Defeat 3 bosses', stars: 15, icon: '👹' },

    // Weapon achievements
    { id: 'weaponCollector', name: 'Weapon Collector', description: 'Unlock 2 different weapons', stars: 3, icon: '🔫' },
    { id: 'weaponMaster', name: 'Weapon Master', description: 'Unlock all weapons', stars: 5, icon: '💫' },
    { id: 'rapidKiller', name: 'Rapid Killer', description: 'Pop 100 bubbles with Rapid Fire', stars: 3, icon: '🔥' },
    { id: 'spreadEagle', name: 'Spread Eagle', description: 'Pop 3 bubbles with one Spread Shot', stars: 4, icon: '🦅' },
    { id: 'piercer', name: 'Piercer', description: 'Hit 3 bubbles with one Pierce Shot', stars: 4, icon: '➡️' },

    // Special actions
    { id: 'bombExpert', name: 'Bomb Expert', description: 'Clear 20 bubbles with one bomb', stars: 3, icon: '💣' },
    { id: 'lastSecond', name: 'Last Second Hero', description: 'Win with 1 health remaining', stars: 5, icon: '⏰' },

    // Quantity achievements
    { id: 'bubblePopper', name: 'Bubble Popper', description: 'Pop 1000 total bubbles', stars: 2, icon: '🎈' },
    { id: 'bubbleDestroyer', name: 'Bubble Destroyer', description: 'Pop 5000 total bubbles', stars: 5, icon: '💥' },
    { id: 'millionaire', name: 'Millionaire', description: 'Earn 10000 total coins', stars: 8, icon: '💰' },

    // Hidden/Secret achievement
    { id: 'secretMaster', name: '???', description: 'Complete Wave 10 without buying any upgrades', stars: 15, icon: '🔮', hidden: true }
  ];

  private constructor() {
    super();
    this.progressionManager = ProgressionManager.getInstance();
    this.sessionData = this.getDefaultSessionData();
    this.resetSessionData();
  }

  private getDefaultSessionData() {
    return {
      bubblesPopped: 0,
      wavesCompleted: 0,
      damageDealt: 0,
      currentCombo: 0,
      highestCombo: 0,
      coinsEarned: 0,
      perfectWaves: 0,
      bombsUsed: 0,
      damageTaken: 0,
      accuracyShots: 0,
      accuracyHits: 0,
      consecutivePerfectWaves: 0,
      weaponKills: {} as { [key: string]: number },
      bubbleTypesPopped: {} as { [key: string]: number },
      bossesDefeated: 0
    };
  }

  static getInstance(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
    }
    return AchievementManager.instance;
  }

  private resetSessionData(): void {
    this.sessionData = {
      bubblesPopped: 0,
      wavesCompleted: 0,
      damageDealt: 0,
      currentCombo: 0,
      highestCombo: 0,
      coinsEarned: 0,
      perfectWaves: 0,
      bombsUsed: 0,
      damageTaken: 0,
      accuracyShots: 0,
      accuracyHits: 0,
      consecutivePerfectWaves: 0,
      weaponKills: {},
      bubbleTypesPopped: {},
      bossesDefeated: 0
    };
  }

  // Main check method - call this frequently
  checkAchievements(): void {
    const stats = this.progressionManager.getStatistics();

    // Check each achievement
    this.checkAchievement('firstBlood', stats.totalBubblesPopped > 0);
    this.checkAchievement('waveRookie', stats.totalWavesCompleted >= 1);
    this.checkAchievement('centurion', stats.totalBubblesPopped >= 100);

    // Combo achievements
    this.checkAchievement('comboStarter', stats.highestCombo >= 5);
    this.checkAchievement('comboMaster', stats.highestCombo >= 10);
    this.checkAchievement('comboLegend', stats.highestCombo >= 20);

    // Wave progression
    this.checkAchievement('waveWarrior', stats.highestWave >= 10);
    this.checkAchievement('waveCommander', stats.highestWave >= 15);
    this.checkAchievement('waveLegend', stats.highestWave >= 20);

    // Perfect play
    this.checkAchievement('untouchable', stats.perfectWaves >= 1);
    this.checkAchievement('perfectionist', stats.perfectWaves >= 5);
    this.checkAchievement('flawless', this.sessionData.consecutivePerfectWaves >= 3);

    // Boss achievements
    this.checkAchievement('bossSlayer', stats.totalBossesDefeated >= 1);
    this.checkAchievement('bossMaster', stats.totalBossesDefeated >= 3);

    // Weapon achievements
    const unlockedWeapons = this.progressionManager.getUnlockedWeapons();
    this.checkAchievement('weaponCollector', unlockedWeapons.length >= 3); // Including standard
    this.checkAchievement('weaponMaster', unlockedWeapons.length >= 5);

    // Quantity achievements
    this.checkAchievement('bubblePopper', stats.totalBubblesPopped >= 1000);
    this.checkAchievement('bubbleDestroyer', stats.totalBubblesPopped >= 5000);
    this.checkAchievement('millionaire', stats.totalCoinsEarned >= 10000);

    // Special condition checks are handled by specific event methods
  }

  private checkAchievement(id: string, condition: boolean): void {
    if (condition && !this.progressionManager.hasAchievement(id)) {
      this.unlockAchievement(id);
    }
  }

  private unlockAchievement(id: string): void {
    const achievement = this.achievements.find(a => a.id === id);
    if (!achievement) return;

    if (this.progressionManager.unlockAchievement(id)) {
      (this as any).dispatchEvent({
        type: 'achievementUnlocked',
        achievement: achievement,
        stars: achievement.stars
      });
    }
  }

  // Event handlers for specific tracking
  onBubblePopped(bubbleType: string, combo: number, weaponType: string): void {
    this.sessionData.bubblesPopped++;
    this.sessionData.currentCombo = combo;
    this.sessionData.highestCombo = Math.max(this.sessionData.highestCombo, combo);

    // Track weapon kills
    if (!this.sessionData.weaponKills[weaponType]) {
      this.sessionData.weaponKills[weaponType] = 0;
    }
    this.sessionData.weaponKills[weaponType]++;

    // Track bubble types
    if (!this.sessionData.bubbleTypesPopped[bubbleType]) {
      this.sessionData.bubbleTypesPopped[bubbleType] = 0;
    }
    this.sessionData.bubbleTypesPopped[bubbleType]++;

    // Update progression stats
    this.progressionManager.updateStatistic('totalBubblesPopped', 1);
    this.progressionManager.updateStatistic('highestCombo', combo);

    // Check weapon-specific achievements
    if (weaponType === 'rapidFire' && this.sessionData.weaponKills['rapidFire'] >= 100) {
      this.checkAchievement('rapidKiller', true);
    }

    this.checkAchievements();
  }

  onWaveCompleted(waveNumber: number, perfect: boolean): void {
    this.sessionData.wavesCompleted++;

    if (perfect) {
      this.sessionData.perfectWaves++;
      this.sessionData.consecutivePerfectWaves++;
    } else {
      this.sessionData.consecutivePerfectWaves = 0;
    }

    this.progressionManager.updateStatistic('totalWavesCompleted', 1);
    this.progressionManager.updateStatistic('highestWave', waveNumber);
    if (perfect) {
      this.progressionManager.updateStatistic('perfectWaves', 1);
    }

    this.checkAchievements();
  }

  onBossDefeated(): void {
    this.sessionData.bossesDefeated++;
    this.progressionManager.updateStatistic('totalBossesDefeated', 1);
    this.checkAchievements();
  }

  onBombUsed(bubblesCleared: number): void {
    this.sessionData.bombsUsed++;
    this.progressionManager.updateStatistic('totalBombsUsed', 1);

    // Check bomb expert achievement
    if (bubblesCleared >= 20) {
      this.checkAchievement('bombExpert', true);
    }

    this.checkAchievements();
  }

  onCoinsEarned(amount: number): void {
    this.sessionData.coinsEarned += amount;
    this.progressionManager.updateStatistic('totalCoinsEarned', amount);
    this.checkAchievements();
  }

  onDamageTaken(amount: number): void {
    this.sessionData.damageTaken += amount;
  }

  onProjectileFired(): void {
    this.sessionData.accuracyShots++;
  }

  onProjectileHit(): void {
    this.sessionData.accuracyHits++;
  }

  onGameOver(health: number, waveNumber: number, noPurchases: boolean = false): void {
    // Check last second hero
    if (health === 1 && waveNumber >= 5) {
      this.checkAchievement('lastSecond', true);
    }

    // Check secret achievement
    if (waveNumber >= 10 && noPurchases) {
      this.checkAchievement('secretMaster', true);
    }

    this.checkAchievements();
  }

  // Special checks for multi-hit achievements
  onSpreadShotMultiHit(hits: number): void {
    if (hits >= 3) {
      this.checkAchievement('spreadEagle', true);
    }
  }

  onPierceShotMultiHit(hits: number): void {
    if (hits >= 3) {
      this.checkAchievement('piercer', true);
    }
  }

  // Get achievement info
  getAchievement(id: string): Achievement | undefined {
    return this.achievements.find(a => a.id === id);
  }

  getAllAchievements(): Achievement[] {
    return this.achievements.filter(a => !a.hidden || this.progressionManager.hasAchievement(a.id));
  }

  getAchievementProgress(): {
    unlocked: number;
    total: number;
    percentage: number;
    unlockedAchievements: Achievement[];
    lockedAchievements: Achievement[];
  } {
    const unlockedIds = this.progressionManager.getAchievements();
    const visibleAchievements = this.getAllAchievements();
    const unlockedAchievements = visibleAchievements.filter(a => unlockedIds.includes(a.id));
    const lockedAchievements = visibleAchievements.filter(a => !unlockedIds.includes(a.id));

    return {
      unlocked: unlockedAchievements.length,
      total: visibleAchievements.length,
      percentage: Math.round((unlockedAchievements.length / visibleAchievements.length) * 100),
      unlockedAchievements,
      lockedAchievements
    };
  }

  // Session stats for end screen
  getSessionStats(): {
    bubblesPopped: number;
    wavesCompleted: number;
    highestCombo: number;
    perfectWaves: number;
    accuracy: number;
    achievementsUnlocked: number;
  } {
    return {
      bubblesPopped: this.sessionData.bubblesPopped,
      wavesCompleted: this.sessionData.wavesCompleted,
      highestCombo: this.sessionData.highestCombo,
      perfectWaves: this.sessionData.perfectWaves,
      accuracy: this.sessionData.accuracyShots > 0
        ? Math.round((this.sessionData.accuracyHits / this.sessionData.accuracyShots) * 100)
        : 0,
      achievementsUnlocked: this.progressionManager.getAchievements().length
    };
  }
}