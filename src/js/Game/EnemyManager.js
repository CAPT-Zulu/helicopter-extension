// General imports
import { Vector3 } from 'three';
// Enemy types
import { GroundEnemy } from './Enemies/GroundEnemy';

// EnemyManager class
export default class EnemyManager {
    constructor(scene, world, player) {
        // Initialize properties
        this.scene = scene;
        this.world = world;
        this.player = player;

        // Local variables
        this.enemies = [];
        this.enemyCount = 0;
        this.spawnDelay = 4000; // 4 seconds
    }

    addEnemy(enemy) {
        // Add enemy to the list and scene, and increment the count
        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
        this.enemyCount++;
    }

    removeEnemy(enemy) {
        // Remove enemy from the list and scene, and decrement the count
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            this.enemies.splice(index, 1);
            this.scene.remove(enemy.mesh);
            this.enemyCount--;
        }
    }

    updateEnemies(deltaTime) {
        // Update all enemies' state machines
        for (const enemy of this.enemies) {
            enemy.update(deltaTime); 
        }
    }

    update(deltaTime) {
        // Update all enemies
        this.updateEnemies(deltaTime);
        // Check if it's time to spawn a new enemy
        if (this.enemyCount < 10) { // Limit to 10 enemies
            if (this.spawnDelay <= 0) {
                this.spawnEnemy();
                this.spawnDelay = 4000; // Reset spawn delay
            } else {
                this.spawnDelay -= deltaTime * 1000; // Convert deltaTime to milliseconds
            }
        }
    }

    getRandomSpawnPosition() {
        // User Math.random() and this.world.getBounds()
        const rand_x = Math.random() * (this.world.getBounds().maxX - this.world.getBounds().minX) + this.world.getBounds().minX;
        const rand_z = Math.random() * (this.world.getBounds().maxZ - this.world.getBounds().minZ) + this.world.getBounds().minZ;
        const terrain_y = this.world.getTerrainHeightAt(rand_x, rand_z);
        return new Vector3(rand_x, terrain_y, rand_z);
    }

    spawnEnemy() {
        // Create a basic ground enemy for now at a random position
        const spawnPosition = this.getRandomSpawnPosition();
        const enemy = new GroundEnemy(spawnPosition, this.world);
        enemy.mesh.position.set(spawnPosition.x, spawnPosition.y + enemy.offset, spawnPosition.z);
        this.addEnemy(enemy);
        enemy.setTarget(this.player); // Set the player as the target for the enemy
        console.log(`Spawned enemy at position: ${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z}`);
    }
}