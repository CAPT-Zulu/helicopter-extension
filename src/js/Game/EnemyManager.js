// General imports
import { Mesh, BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';

// EnemyManager class
export default class EnemyManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.enemies = [];
        this.enemyCount = 0;
    }

    exampleEnemy() {
        const body = new Mesh(
            new BoxGeometry(5, 5, 5),
            new MeshBasicMaterial({ color: 0xff0000 })
        );
        body.castShadow = true;
        body.receiveShadow = true;
        const enemy = {
            mesh: body,
            offset: 2.5,
            update: (deltaTime, playerPosition, playerDirection) => {
                // Example update logic for the enemy
                const direction = new Vector3().subVectors(playerPosition, body.position).normalize();
                body.position.addScaledVector(direction, deltaTime * 30); // Move towards player
                body.lookAt(playerPosition); // Face the player
            }
        };
        return enemy;
    }

    addEnemy(enemy) {
        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
        this.enemyCount++;
    }

    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            this.enemies.splice(index, 1);
            this.scene.remove(enemy.mesh);
            this.enemyCount--;
        }
    }

    updateEnemies(deltaTime, playerPosition, playerDirection) { // , playerDirection, playerVelocity
        for (const enemy of this.enemies) {
            enemy.update(deltaTime, playerPosition, playerDirection); // , playerDirection, playerVelocity
        }
    }

    getEnemyCount() {
        return this.enemyCount;
    }

    getRandomSpawnPosition() {
        // User Math.random() and this.world.getBounds()
        const rand_x = Math.random() * (this.world.getBounds().maxX - this.world.getBounds().minX) + this.world.getBounds().minX;
        const rand_z = Math.random() * (this.world.getBounds().maxZ - this.world.getBounds().minZ) + this.world.getBounds().minZ;
        const terrain_y = this.world.getTerrainHeightAt(rand_x, rand_z);
        return new Vector3(rand_x, terrain_y, rand_z);
    }

    spawnEnemy() {
        const enemy = this.exampleEnemy();
        const spawnPosition = this.getRandomSpawnPosition();
        enemy.mesh.position.set(spawnPosition.x, spawnPosition.y + enemy.offset, spawnPosition.z);
        this.addEnemy(enemy);
        console.log(`Spawned enemy at position: ${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z}`);
    }
}