import GameManager from './Game/GameManager.js';
import Stats from 'three/addons/libs/stats.module.js';

// Global variables
let gameManager;
let statsInstance;

// Init
function init() {
    // Get canvas element
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { console.error("Canvas not found!"); return; }

    // Set up the game manager
    gameManager = new GameManager(canvas);

    // Set up stats for performance monitoring
    statsInstance = new Stats();
    canvas.parentNode.appendChild(statsInstance.dom);

    // Start the game loop
    animate();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update the game manager
    gameManager.update();

    // Update stats
    statsInstance.update();
}

// Handle page startup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (gameManager) {
        gameManager.dispose();
    }
});
