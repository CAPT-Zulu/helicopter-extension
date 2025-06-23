import { Clock } from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
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
    // helicopterController = new HelicopterController(
    //     sceneManager.getCamera(),
    //     canvas,
    //     sceneManager.getWorldGenerator()
    // );

    // Set up debug controls (OrbitControls)
    const controls = new OrbitControls(sceneManager.getCamera(), canvas);
    controls.enableDamping = true; // Smooth damping
    controls.dampingFactor = 0.1; // Damping factor for smooth movement
    controls.screenSpacePanning = false; // Prevent panning in screen space
    controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation
    controls.minDistance = 100; // Minimum distance from the camera to the target
    controls.maxDistance = 1000; // Maximum distance from the camera to the target

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
        // helicopterController.update(deltaTime);
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
    // if (helicopterController) {
    //     helicopterController.dispose();
    // }
});
