// General imports
import { Clock } from 'three';
// Managers
import SceneManager from './sceneManager.js';
import EnemyManager from './EnemyManager.js';
import InputManager from './InputManager.js';
// import UIManager from './UIManager.js';
// Player
import Player from './Player.js';
// Worlds
import TerrainWorld from './Worlds/TerrainWorld.js';
// Controllers
import HelicopterController from './Controllers/HelicopterController.js';

// GameManager class
export default class GameManager {
    constructor(canvas) {
        // Core systems
        this.sceneManager = new SceneManager(canvas);
        this.inputManager = new InputManager(canvas);
        // this.uiManager = new UIManager();

        // Core components
        this.scene = this.sceneManager.getScene();
        this.camera = this.sceneManager.getCamera();

        // World generation
        this.world = new TerrainWorld(this.scene);

        // Game entities
        this.player = new Player(this.camera, this.world, this.inputManager, HelicopterController);
        this.enemyManager = new EnemyManager(this.scene, this.world);

        // Game state
        this.clock = new Clock();
    }

    update() {
        // Get delta time
        const deltaTime = this.clock.getDelta();

        // Update game systems
        this.player.update(deltaTime);
        // this.enemyManager.update(deltaTime, this.player);
        // this.uiManager.update(this);

        // Render the scene
        this.sceneManager.render();
        // Reset input deltas
        this.inputManager.resetDeltas();
    }

    dispose() {
        this.sceneManager.dispose();
        this.player.dispose();
        this.enemyManager.dispose();
        this.inputManager.dispose();
        // this.uiManager.dispose();
    }
}