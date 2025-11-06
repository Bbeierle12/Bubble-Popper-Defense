import './style.css';
import { Game } from './game/Game';

// Initialize the game
const game = new Game();
game.start();

// Handle window resize
window.addEventListener('resize', () => {
  game.handleResize();
});
