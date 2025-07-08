// General imports
import { Vector3 } from 'three';
// BaseEnemy class
import BaseEnemy from './BaseEnemy';

// GroundEnemy class
export class GroundEnemy extends BaseEnemy {
    constructor(position, world) {
        // Extend BaseEnemy
        super(position, world);

        // Test changing color
        this.mesh.material.color.set(0x00ff00);
    }

    move(deltaTime) {
        // Move along XZ, but set Y to terrain height
        const direction = new Vector3().subVectors(this.targetPosition, this.currentPosition);
        direction.y = 0;
        direction.normalize();
        this.currentPosition.addScaledVector(direction, (this.speed * 0.5) * deltaTime);
        // Snap to terrain height
        this.currentPosition.y = this.world.getTerrainHeightAt(this.currentPosition.x, this.currentPosition.z);
        this.clampToBounds();
        this.mesh.position.copy(this.currentPosition);
        // Update lookAt position to face target position
        this.mesh.lookAt(this.targetPosition.clone()); // I would like to lerp this over time in the future as well as have it upwards from terrain normals but this is a start
    }
}