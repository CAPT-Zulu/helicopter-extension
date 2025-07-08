import { Clock } from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/addons/libs/stats.module.js';
import SceneManager from './SceneManager.js';
import HelicopterController from './HelicopterController.js';
import EnemyManager from './EnemyManager.js';

// Main debugging
const orbitCameraOverride = false; // Set to true to use OrbitControls for debugging

// Global variables
let sceneManager;
let helicopterController;
let enemyManager;
let clock;
let statsInstance;
let spawnCounter;

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

    // Set up the controller
    if (orbitCameraOverride) {
        // Set up OrbitControls for debugging
        const controls = new OrbitControls(sceneManager.getCamera(), canvas);
        controls.minDistance = 100;
    } else {
        // Set up the helicopter controller
        helicopterController = new HelicopterController(
            sceneManager.getCamera(),
            canvas,
            sceneManager.getWorldGenerator()
        );
    }

    // Set up Weapon and Enemy AI systems (TODO)
    enemyManager = new EnemyManager(sceneManager.getScene(), sceneManager.getWorldGenerator());
    spawnCounter = 3000;

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
        if (!orbitCameraOverride) { helicopterController.update(deltaTime); }
        statsInstance.update();
        if (spawnCounter <= 0) {
            // Spawn a new enemy
            enemyManager.spawnEnemy();
            spawnCounter = 3000; // Reset counter
        } else {
            spawnCounter--;
        }
        enemyManager.updateEnemies(
            deltaTime,
            helicopterController.getPosition(),
            helicopterController.getDirection(),
            // helicopterController.getVelocity()
        );
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

// Handle scene disposal on page unload (Unsure if this is required?)
window.addEventListener('beforeunload', () => {
    let scene = sceneManager.getScene();
    let renderer = sceneManager.getRenderer();
    if (renderer) {
        renderer.dispose();
    }
    if (scene) {
        sc.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
    if (helicopterController) {
        helicopterController.dispose();
    }
});
