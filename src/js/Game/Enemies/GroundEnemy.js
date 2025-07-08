// General imports
import { Vector3, Mesh, BoxGeometry, MeshBasicMaterial} from 'three';
// BaseEnemy class
import BaseEnemy from './BaseEnemy';

// GroundEnemy class
export class GroundEnemy extends BaseEnemy {
    constructor(position, world) {
        // Extend BaseEnemy
        super(position, world);

        // Test changing color
        this.mesh.material.color.set(0x00ff00);

        // Barrel mesh
        this.barrel = new Mesh(
            new BoxGeometry(1, 1, 8), // Adjust size as needed
            new MeshBasicMaterial({ color: 0x0000ff }) // Blue color for the barrel
        )
        this.barrel.castShadow = true;
        this.barrel.receiveShadow = true;
        this.mesh.add(this.barrel); // Add barrel to the enemy mesh
        this.barrel.position.set(0, 2.5, 0);
    }

    move(deltaTime) {
        // Move along XZ, but set Y to terrain height
        const direction = new Vector3().subVectors(this.objectivePosition, this.currentPosition);
        direction.y = 0;
        direction.normalize();
        this.currentPosition.addScaledVector(direction, (this.speed * 0.5) * deltaTime);
        // Snap to terrain height
        this.currentPosition.y = this.world.getTerrainHeightAt(this.currentPosition.x, this.currentPosition.z);
        this.clampToBounds();
        this.mesh.position.copy(this.currentPosition);
        // Update lookAt position to face target position
        this.mesh.lookAt(this.objectivePosition.clone()); // I would like to lerp this over time in the future as well as have it upwards from terrain normals but this is a start

        // Temp just also update onAttack for debugging purposes
        this.onAttack(deltaTime);
    }

    onAttack(deltaTime) {
        if (this.target) {
            // Rotate the barrel to face the target
            this.barrel.lookAt(this.target.getPosition());
        }
    }
}