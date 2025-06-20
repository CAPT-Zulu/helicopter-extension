import { Clock } from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import SceneManager from './SceneManager.js';
import HelicopterController from './HelicopterController.js';

// Global variables
let sceneManager;
let helicopterController;
let clock;
let statsInstance;

// Init
function init() {
    // Get canvas element
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { console.error("Canvas not found!"); return; }

    // Set up stats for performance monitoring
    statsInstance = new Stats();
    canvas.parentNode.appendChild(statsInstance.dom);

    // Set up the scene
    sceneManager = new SceneManager(canvas);
    
    // Set up the helicopter controller
    helicopterController = new HelicopterController(
        sceneManager.getCamera(),
        canvas,
        sceneManager.getScene(),
        sceneManager.getWorldGenerator()
    );

    // Set up Weapon and Enemy AI systems (TODO)

    // Initiate the clock and start animation loop
    clock = new Clock();
    animate();
}

// Animation loop
function animate() {
    // Get animation frame and delta time
    const rafID = requestAnimationFrame(animate);
    const deltaTime = Math.min(clock.getDelta(), 0.1);

    // Try to update systems
    try {
        sceneManager.update();
        helicopterController.update(deltaTime);
        statsInstance.update();
    } catch (error) {
        console.error("Error during animation loop:", error);
        cancelAnimationFrame(rafID);
    }
}

// Handle page startup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// TODO: reimplement proper disposal