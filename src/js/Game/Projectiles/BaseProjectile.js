// General imports
import { Mesh, SphereGeometry, MeshBasicMaterial } from 'three';

// BaseProjectile class
export default class BaseProjectile {
    constructor(position, direction) {
        this.currentPosition = position.clone();
        this.direction = direction.clone().normalize();
        this.speed = 50;
        this.lifetime = 4.0; // seconds
        this.age = 0;
        this.active = true;

        // Default mesh: white sphere
        this.mesh = new Mesh(
            new SphereGeometry(0.4, 6, 6),
            new MeshBasicMaterial({ color: 0xffffff })
        );
        this.mesh.position.copy(this.currentPosition);
    }

    update(deltaTime) {
        if (!this.active) return;
        // Move in the direction
        this.currentPosition.addScaledVector(this.direction, this.speed * deltaTime);
        this.mesh.position.copy(this.currentPosition);
        // Update age and check for expiration
        this.age += 1 / 1000;
        if (this.age >= this.lifetime) {
            this.destroy();
        }
    }

    destroy() {
        this.active = false;
        // Optionally remove mesh from scene here
        if (this.mesh) {
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            // Dispose self
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}
