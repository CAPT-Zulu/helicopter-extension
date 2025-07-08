// General imports
import { Mesh, BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';

// BaseEnemy class
export default class BaseEnemy {
    constructor(position, world, scene) {
        // Local variables
        this.state = 'idle'; // 'patrolling', 'attacking', etc.
        this.currentPosition = position.clone();
        this.objectivePosition = new Vector3(0, 0, 0);

        // this.player // to be used for targeting etc or maybe I could make them also able to attack friendly units?
        this.target = null;

        // Enemy properties
        // this.health = 100;
        // this.damage = 10;
        this.speed = 15;
        this.offset = 2.5;
        this.attackDelay = 0.3; 
        this.attackTimer = 0;
        this.projectiles = [];
        this.world = world;
        this.scene = scene; 
        this.worldBounds = this.world.getBounds();

        // Default mesh for the enemy
        this.mesh = new Mesh(
            new BoxGeometry(2.5, 2.5, 2.5),
            new MeshBasicMaterial({ color: 0xff0000 })
        );
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.copy(this.currentPosition);
    }

    setTarget(target) {
        this.target = target;
    }

    update(deltaTime) {
        // Update the state machine
        switch (this.state) {
            case 'idle':
                this.onIdle(deltaTime);
                break;
            case 'patrolling':
                this.onPatrol(deltaTime);
                break;
            case 'attacking':
                this.onAttack(deltaTime);
                break;
            default:
                console.warn('Unknown state:', this.state);
        }
        // Update projectile, if any
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            if (projectile.active) {
                projectile.update(deltaTime);
            } else {
                // Remove inactive projectiles
                this.projectiles.splice(i, 1);
            }
        }
    }

    onIdle(deltaTime) {
        // Pick a new patrol point nearby
        this.objectivePosition = this.getRandomNearbyPoint(100);
        this.state = 'patrolling';
    }

    onPatrol(deltaTime) {
        this.move(deltaTime);
        if (this.currentPosition.distanceTo(this.objectivePosition) < 1) {
            this.state = 'idle'; // Patrol again
        
        }
    }
    onAttack(deltaTime) {
        // Default: do nothing
    }

    move(deltaTime) {
        // Default movement: move towards target
        const direction = new Vector3().subVectors(this.objectivePosition, this.currentPosition).normalize();
        this.currentPosition.addScaledVector(direction, this.speed * deltaTime);
        this.clampToBounds();
        this.mesh.position.copy(this.currentPosition);
    }

    getRandomNearbyPoint(radius) {
        // Try up to 10 times to find a valid point within bounds
        let point;
        let attempts = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const x = this.currentPosition.x + Math.cos(angle) * dist;
            const z = this.currentPosition.z + Math.sin(angle) * dist;
            let y = this.currentPosition.y;
            y = this.world.getTerrainHeightAt(x, z);
            point = new Vector3(x, y, z);
            attempts++;
        } while (!this.isWithinBounds(point, this.worldBounds) && attempts < 10);
        // If no valid point found, return current position
        return (!this.isWithinBounds(point, this.worldBounds)) ? this.currentPosition.clone() : point;
    }

    isWithinBounds(point, bounds) {
        return (
            point.x >= bounds.minX && point.x <= bounds.maxX &&
            point.z >= bounds.minZ && point.z <= bounds.maxZ &&
            point.y >= bounds.minY && point.y <= bounds.maxY
        );
    }

    clampToBounds() {
        if (this.world && typeof this.world.getBounds === 'function') {
            this.currentPosition.x = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX, this.currentPosition.x));
            this.currentPosition.y = Math.max(this.worldBounds.minY, Math.min(this.worldBounds.maxY, this.currentPosition.y));
            this.currentPosition.z = Math.max(this.worldBounds.minZ, Math.min(this.worldBounds.maxZ, this.currentPosition.z));
        }
    }

    spawn() {
        // Add the enemy mesh to the scene
        if (this.scene) {
            this.scene.add(this.mesh);
        }
    }

    destroy() {
        // Remove the enemy mesh from the scene
        if (this.scene && this.mesh.parent) {
            this.scene.remove(this.mesh);
        }
        // Dispose of the mesh geometry and material
        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }
        if (this.mesh.material) {
            this.mesh.material.dispose();
        }
    }
}