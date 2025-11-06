# 🎮 Bubble Popper Defense

A 3D arcade shooter built with Three.js where you defend against waves of floating bubbles in first-person perspective.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🎯 How to Play

- **Mouse Movement**: Aim your weapon
- **Left Click**: Shoot (hold to auto-fire)
- **Objective**: Pop bubbles before they reach your core
- **Strategy**: Create combos for higher multipliers and more coins

## 🎮 Game Mechanics

### Bubble System
- **Large Bubbles** (10 pts) → Split into 2-3 **Medium Bubbles** (25 pts) → Split into 2-3 **Small Bubbles** (50 pts)
- Bubbles have floaty physics with drift movement
- 3 depth layers for spatial complexity

### Defense System
- **Shield**: 3 hits (regenerates +1 between waves)
- **Core Health**: 5 hits (game over when depleted)
- Visual feedback for damage states

### Progression
- **Wave-based**: Enemies increase with each wave
- **Score Multiplier**: Builds with combos (up to 10x)
- **Shop System**: Spend coins between waves on upgrades
- **Currency**: Earn coins from popping bubbles (70% of score value)

## 🛠️ Tech Stack

- **Three.js**: 3D rendering and physics
- **TypeScript**: Type-safe game logic
- **Vite**: Fast development and building
- **CSS3**: Modern UI styling

## 📁 Project Structure

```
src/
├── game/
│   ├── Game.ts              # Main game loop
│   ├── entities/
│   │   ├── Player.ts        # Stick figure with IK aiming
│   │   └── Bubble.ts        # Bubble enemy class
│   └── systems/
│       ├── BubbleManager.ts # Spawning & collision
│       ├── WaveManager.ts   # Wave progression
│       ├── InputManager.ts  # Mouse controls
│       ├── ParticleSystem.ts# Visual effects
│       ├── ScoreManager.ts  # Points & currency
│       └── UIManager.ts     # HUD & menus
├── main.ts                  # Entry point
└── style.css               # Game UI styles
```

## 🎨 Features Implemented

### Phase 1: Core Prototype ✅
- ✅ Three.js environment with side-view camera
- ✅ Stick figure character with arm IK
- ✅ Bubble spawning with split mechanics
- ✅ Shield and core health system
- ✅ Wave 1-5 progression

### In Progress
- Particle effects and screen shake
- Weapon upgrade system
- Sound effects and music
- Additional bubble types (Speed, Armor, Zigzag, etc.)

## 🎯 Roadmap

See the full development plan in the project files for:
- Phase 2: Game Feel (weapon juice, particles, audio)
- Phase 3: Economy & Progression
- Phase 4: Wave Design (20+ waves)
- Phase 5: Visual Polish
- Phase 6: Audio Design
- Phase 7: Game Modes (Endless, Challenge, Zen)

## 📊 Success Metrics

- Novice score: ~50,000 by wave 10
- Expert score: ~500,000+ by wave 10
- Average session: 15-20 minutes

## 🤝 Contributing

This is a personal project following a specific design document. Feel free to fork and create your own version!

## 📄 License

MIT License - Feel free to use and modify!

---

**Made with ❤️ using Three.js and TypeScript**
