# Bubble Popper Defense - Implementation Roadmap
*Created: November 5, 2025*

## Quick Start Guide

### Immediate Next Task (Do This First!)
**Add Basic Audio System** - The game desperately needs sound for engagement
```typescript
// 1. Create src/game/systems/AudioManager.ts
// 2. Add these basic sounds:
//    - Shoot: "pew" sound at 150-250Hz
//    - Pop: Different pitch per bubble size
//    - Hit: Shield/core damage sound
//    - Wave complete: Victory fanfare
// 3. Use Web Audio API or Howler.js
```

---

## Week 1: Game Feel Essentials 🎮

### Day 1-2: Audio Foundation
**File**: `src/game/systems/AudioManager.ts` (new)
```typescript
class AudioManager {
  // Core sounds
  shoot: { base: 'pew.wav', pitchVariation: 0.1 }
  popSmall: { base: 'pop_high.wav', volume: 0.5 }
  popMedium: { base: 'pop_mid.wav', volume: 0.6 }
  popLarge: { base: 'pop_low.wav', volume: 0.7 }

  // Combo pitch rising
  playPop(size, comboCount) {
    pitch = basePitch * (1 + comboCount * 0.05)
  }
}
```

### Day 3: Screen Shake & Juice
**File**: `src/game/Game.ts` (modify)
```typescript
// Add screen shake
addScreenShake(intensity: number, duration: number) {
  // Save original camera position
  // Apply random offset each frame
  // Decay over duration
  // 2-3 pixel shake on shot
  // 5-7 pixel shake on player hit
}
```

### Day 4-5: Special Bubble Types (Pick 2)
**File**: `src/game/entities/Bubble.ts` (modify)
```typescript
enum BubbleType {
  STANDARD,   // Current implementation
  SPEED,      // 1.5x speed, yellow, motion trails
  ARMOR,      // 2 hits, silver, metallic sheen
  ZIGZAG,     // Sine wave movement, purple
}

// Add to Bubble class
switch(this.type) {
  case BubbleType.SPEED:
    this.speed *= 1.5;
    this.material.color.setHex(0xffff00);
    break;
  case BubbleType.ARMOR:
    this.health = 2;
    this.material.metalness = 0.8;
    break;
}
```

### Day 6-7: Projectile Visualization
**File**: `src/game/entities/Projectile.ts` (new)
```typescript
class Projectile {
  // Replace instant raycast with visible projectiles
  mesh: THREE.Mesh  // Small sphere or laser
  velocity: THREE.Vector3
  trail: THREE.Line  // Optional trail effect

  update(delta) {
    // Move projectile
    // Check collisions
    // Leave trail
  }
}
```

---

## Week 2: Economy & Progression 💰

### Day 8-9: Economy Balancing
**File**: `src/game/systems/ScoreManager.ts` (modify)
```typescript
// Wave reward scaling
const WAVE_REWARDS = {
  1: 15,
  2: 20,
  3: 30,
  5: 60,
  10: 400,
  // Formula: base * (1.5 ^ (wave/3))
}

// Upgrade costs (Fibonacci-like)
const UPGRADE_COSTS = {
  fireRate: [50, 100, 200, 500],
  damage: [75, 150, 300, 750],
  pierce: [200, 400, 800],
  spread: [300, 600, 1200],
}
```

### Day 10-11: New Weapons
**File**: `src/game/entities/Player.ts` (modify)
```typescript
enum WeaponType {
  STANDARD,
  RAPID,     // 2x fire rate
  PIERCE,    // Goes through bubbles
  SPREAD,    // 3-shot spread
  LASER,     // Continuous beam
}

// Weapon switching logic
fireWeapon() {
  switch(this.weaponType) {
    case WeaponType.SPREAD:
      // Fire 3 projectiles at angles
      break;
    case WeaponType.PIERCE:
      // Projectile doesn't destroy on hit
      break;
  }
}
```

### Day 12: Meta Progression
**File**: `src/game/systems/ProgressionManager.ts` (new)
```typescript
class ProgressionManager {
  stars: number  // Persistent
  unlocks: Set<string>

  // Unlock tree
  UNLOCKS = {
    10: 'weapon_rapid',
    25: 'weapon_pierce',
    40: 'weapon_spread',
    60: 'weapon_laser',
    100: 'mode_endless'
  }

  // Save to localStorage
  save() { localStorage.setItem('progression', ...) }
}
```

### Day 13-14: Boss Bubble
**File**: `src/game/entities/BossBubble.ts` (new)
```typescript
class BossBubble extends Bubble {
  health: 10
  phase: number

  // Phase behaviors
  updatePhase() {
    if (health < 7) this.phase = 2  // Faster, spawn minions
    if (health < 4) this.phase = 3  // Zigzag, rapid spawns
  }

  // Special patterns
  spawnMinions() { /* Create small bubbles */ }
  movePattern() { /* Circular or figure-8 */ }
}
```

---

## Week 3: Polish & Content 🎨

### Day 15-16: Visual Effects
**File**: `src/game/systems/EffectsManager.ts` (new)
```typescript
class EffectsManager {
  // Shield effects
  createShieldRipple(position) { /* Expanding ring */ }
  createShieldShatter() { /* Glass break particles */ }

  // Core damage
  updateCoreCracks(health) {
    // 80%: small cracks
    // 60%: medium cracks
    // 40%: large cracks
    // 20%: critical, red glow
  }

  // Chromatic aberration
  addChromaticAberration(intensity, duration) { }
}
```

### Day 17-18: UI Polish
**File**: `src/game/systems/UIManager.ts` (modify)
```typescript
// Improved HUD
class HUD {
  // Animated score counter
  animateScore(from, to, duration)

  // Combo indicator with fire effect
  showComboFire(multiplier)

  // Wave progress bar
  waveProgressBar: HTMLElement

  // Upgrade tooltips
  showTooltip(upgrade, cost, effect)
}
```

### Day 19-20: Game Modes
**File**: `src/game/modes/` (new folder)
```typescript
// GameMode.ts - Base class
abstract class GameMode {
  abstract getWaveSettings(wave: number)
  abstract getVictoryCondition()
}

// EndlessMode.ts
class EndlessMode extends GameMode {
  // Exponential scaling
  // No wave limit
  // Increasing spawn rates
}

// ZenMode.ts
class ZenMode extends GameMode {
  // No failure
  // Relaxing pace
  // Focus on high scores
}
```

### Day 21: Settings & Pause
**File**: `src/game/systems/SettingsManager.ts` (new)
```typescript
class SettingsManager {
  // Audio volumes
  masterVolume: number
  sfxVolume: number
  musicVolume: number

  // Graphics
  particleQuality: 'low' | 'medium' | 'high'
  screenShake: boolean

  // Accessibility
  colorblindMode: 'none' | 'protanopia' | 'deuteranopia'

  // Pause handling
  pauseGame() { /* Stop all updates, show menu */ }
}
```

---

## Week 4: Final Polish 🏁

### Day 22-23: Leaderboards
**File**: `src/game/systems/LeaderboardManager.ts` (new)
```typescript
class LeaderboardManager {
  // Local storage for now
  highScores: Array<{name, score, wave, date}>

  // Stats tracking
  stats: {
    totalBubblesPopped: number
    highestCombo: number
    favoriteWeapon: string
    totalPlayTime: number
  }
}
```

### Day 24-25: Achievements
**File**: `src/game/systems/AchievementManager.ts` (new)
```typescript
const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Pop', condition: 'Pop 1 bubble' },
  { id: 'combo_10', name: 'Combo Master', condition: '10x multiplier' },
  { id: 'perfect_wave', name: 'Flawless', condition: 'No damage in wave' },
  { id: 'bubble_1000', name: 'Pop Goes The Thousand', condition: '1000 bubbles' },
  // ... 50+ achievements
]
```

### Day 26-27: Balance & Testing
- Playtest all weapons
- Tune difficulty curve
- Verify economy balance
- Fix any remaining bugs

### Day 28: Release Preparation
- Build optimization
- Performance profiling
- Final bug fixes
- Create itch.io page

---

## File Priority Order

### Must Create First:
1. `AudioManager.ts` - Most impactful addition
2. `Projectile.ts` - Visual feedback needed
3. `EffectsManager.ts` - Game juice

### Should Modify First:
1. `Bubble.ts` - Add special types
2. `Game.ts` - Add screen shake
3. `ScoreManager.ts` - Balance economy

### Can Wait:
1. Meta progression
2. Achievements
3. Leaderboards

---

## Quick Win Implementations

### 1. Screen Shake (30 minutes)
```typescript
// In Game.ts animate()
if (this.shakeIntensity > 0) {
  camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
  camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
  this.shakeIntensity *= 0.9; // Decay
}
```

### 2. Speed Bubbles (1 hour)
```typescript
// In WaveManager.ts spawnEnemy()
const type = wave > 4 && Math.random() < 0.3 ? 'speed' : 'standard';
// In Bubble.ts constructor
if (type === 'speed') {
  this.speed *= 1.5;
  this.mesh.material.color.setHex(0xffff00);
}
```

### 3. Basic Sound (2 hours)
```typescript
// Quick Web Audio implementation
const audioContext = new AudioContext();
function playSound(frequency, duration) {
  const osc = audioContext.createOscillator();
  osc.frequency.value = frequency;
  osc.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}
// Use: playSound(200, 0.1) for pops
```

---

## Testing Checklist

### Core Gameplay
- [ ] All bubble types spawn correctly
- [ ] Weapons function as expected
- [ ] Score/combo system accurate
- [ ] Shop purchases work
- [ ] Wave progression balanced

### Polish
- [ ] Audio plays correctly
- [ ] Visual effects perform well
- [ ] UI is responsive
- [ ] No memory leaks
- [ ] Settings save/load

### Edge Cases
- [ ] Game over triggers properly
- [ ] Restart cleans everything
- [ ] Pause stops all updates
- [ ] Window resize handled
- [ ] Performance at wave 20+

---

## Success Criteria

The game is ready when:
1. **15-minute sessions** feel complete and satisfying
2. **Audio feedback** makes actions feel impactful
3. **3+ bubble types** provide variety
4. **Progression system** gives goals
5. **No major bugs** interrupt gameplay

Focus on these five criteria above all else!