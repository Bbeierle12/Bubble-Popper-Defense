# Bubble Popper Defense - Copilot Instructions

This is a Three.js-based 3D arcade shooter game built with TypeScript and Vite.

## Project Context
- **Game Type**: Wave-based arcade shooter with first-person perspective
- **Tech Stack**: Three.js, TypeScript, Vite
- **Architecture**: Entity-Component System pattern

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow functional programming patterns where appropriate
- Use Three.js best practices for performance
- Keep game loop at 60 FPS target

### Game Systems
- **Player**: First-person view with gun visible in lower right
- **Bubbles**: Three sizes (large → medium → small) with split mechanics
- **Waves**: Progressive difficulty with spawn rate increases
- **Scoring**: Combo multipliers and currency system
- **UI**: HUD for health/score, shop between waves, crosshair for aiming

### File Organization
- Entities in `src/game/entities/`
- Systems in `src/game/systems/`
- Main game loop in `src/game/Game.ts`

### Performance Considerations
- Dispose Three.js geometries and materials when removing objects
- Use object pooling for particles if needed
- Limit particle counts for smooth performance

## Current Status
✅ Core gameplay loop implemented
✅ Player, bubbles, shooting mechanics working
✅ Wave system and UI functional
🚧 Particle effects basic implementation
⏳ Sound effects and advanced features pending

## Next Steps
1. Enhance particle effects and screen shake
2. Implement shop upgrade functionality
3. Add additional bubble types
4. Audio system integration
5. Additional game modes
