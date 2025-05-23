import * as THREE from 'three';
import SceneManager from './SceneManager.js';
import HelicopterController from './HelicopterController.js';

// Global variables
let sceneManager;
let helicopterController;
let clock;

// Init
function init() {
    // Get canvas element
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { console.error("Canvas not found!"); return; }

    // Set up the scene
    sceneManager = new SceneManager(canvas);
    
    // Set up the helicopter controller
    helicopterController = new HelicopterController(
        sceneManager.getCamera(),
        canvas,
        sceneManager.getGroundYPosition()
    );

    // Set up Weapon and Enemy AI systems (TODO)

    // Initiate the clock and start animation loop
    clock = new THREE.Clock();
    animate();
}

// Animation loop
function animate() {
    // Get animation frame and delta time
    const rafID = requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Try to update systems
    try {
        sceneManager.update();
        helicopterController.update(deltaTime);
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