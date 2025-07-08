// General imports
import { Sphere, Vector3, Quaternion, Euler } from 'three';

// --- ROTATIONAL CONTROL PARAMETERS ---
// How quickly the helicopter tries to align to the target orientation. Lower = more lag/heft.
const ROTATIONAL_LERP_FACTOR = 0.05;
// How much rotational speed is reduced each frame. Lower = spins longer.
const ROTATIONAL_DAMPING = 0.92; // This was actually removed so I should add it back if I want to use it
// Sensitivity for mouse pitch/roll input.
const MOUSE_SENSITIVITY = 0.001;
// Speed of yaw control with A/D keys.
const YAW_KEY_SPEED = 0.025;

// --- MOVEMENT PHYSICS PARAMETERS ---
// Max thrust force applied along the helicopter's local UP vector.
const MAIN_THRUST_FORCE = 17.0;
// Force applied downwards when 'S' is pressed.
const DOWNWARD_THRUST_FORCE = 15.0;
// Strength of gravity.
const GRAVITY_STRENGTH = 9.8;
// General air resistance / linear damping.
const LINEAR_DAMPING = 0.997;
// Mass of the helicopter
const HELICOPTER_MASS = 0.8;

// --- OTHER ---
// Radius of the helicopter for collision detection
const HELICOPTER_RADIUS = 2;

// HelicopterController class
export default class HelicopterController {
    constructor(camera, world, inputManager) {
        // Initialize properties
        this.camera = camera;
        this.world = world;
        this.inputManager = inputManager;
        this.bounds = this.world.getBounds();

        // Set up helicopter collider as a sphere
        this.helicopterCollider = new Sphere(new Vector3(0, 0, 0), HELICOPTER_RADIUS);

        // Local States
        this.velocity = new Vector3();
        this.acceleration = new Vector3();
        this.targetAngle = new Quaternion();
        this.inputEuler = new Euler(0, 0, 0, 'YXZ');
        this.keys = this.inputManager.keys;
        this.mouseDelta = this.inputManager.mouseDelta;

        // Set up initial camera position and orientation
        this.reset();
    }

    reset() {
        // Reset initial positions and orientation
        const initialPosition = new Vector3(0, this.world.getTerrainHeightAt(0, 0) + 20 + HELICOPTER_RADIUS + 1.5, 0);
        const initialOrientation = new Quaternion().setFromEuler(new Euler(0, 0, 0, 'YXZ'));
        // Reset camera position and orientation
        this.camera.position.copy(initialPosition);
        this.camera.quaternion.copy(initialOrientation);
        // Reset collider position
        this.helicopterCollider.center.copy(this.camera.position);
        // Reset input Euler angles
        this.targetAngle.copy(this.camera.quaternion);
        this.inputEuler.setFromQuaternion(this.camera.quaternion, 'YXZ');
        // Reset velocity and acceleration
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
    }

    update(deltaTime) {
        // 1. Handle Rotational Input & Update Target Orientation
        // Get mouse movement delta
        if (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0) {
            // Update inputEuler based on mouse movement
            this.inputEuler.x -= this.mouseDelta.y * MOUSE_SENSITIVITY; // Pitch
            // this.inputEuler.y -= mouseDelta.x * MOUSE_SENSITIVITY; // Yaw (Optional, but I prefer roll)
            this.inputEuler.z -= this.mouseDelta.x * MOUSE_SENSITIVITY; // Roll
            // Clamp pitch to prevent flipping (e.g., +/- 85 degrees)
            this.inputEuler.x = Math.max(-Math.PI / 2 * 0.9, Math.min(Math.PI / 2 * 0.9, this.inputEuler.x));
        }
        // Yaw from keys (A/D)
        this.inputEuler.y += (!!this.keys.a - !!this.keys.d) * YAW_KEY_SPEED * deltaTime * 60;
        // Convert the accumulated inputEuler to our targetQuaternion
        this.targetAngle.setFromEuler(this.inputEuler);

        // 2. Smoothly Interpolate Current Orientation Towards Target
        this.camera.quaternion.slerp(
            this.targetAngle,
            ROTATIONAL_LERP_FACTOR * (deltaTime * 60)
        );

        // 3. Calculate Forces
        this.acceleration.set(0, 0, 0); // Reset acceleration
        // Get helicopter's local up direction in world space
        const localUp = new Vector3(0, 1, -0.25); // Add slight forward tilt
        localUp.applyQuaternion(this.camera.quaternion);
        // Calculate thrust based on key presses
        let thrustMagnitude = (this.keys.w ? MAIN_THRUST_FORCE : 0) - (this.keys.s ? DOWNWARD_THRUST_FORCE : 0);
        // If thrust not zero, apply it in the local up direction
        if (thrustMagnitude !== 0) {
            const thrustForce = localUp.clone().multiplyScalar(thrustMagnitude);
            this.applyForce(thrustForce);
        }
        // Gravity (always downwards)
        const gravity = new Vector3(0, -GRAVITY_STRENGTH * HELICOPTER_MASS, 0);
        this.applyForce(gravity);

        // 4. Update Velocity & Position
        // V_new = V_old + A * dt
        this.velocity.addScaledVector(this.acceleration, deltaTime);
        // Apply linear damping (air resistance)
        this.velocity.multiplyScalar(Math.pow(LINEAR_DAMPING, deltaTime * 60)); // Better way of doing this? (TODO)

        // 5. Collision Detection & Resolution
        // Calculate potential next position
        const potentialPosition = this.camera.position.clone().addScaledVector(this.velocity, deltaTime);
        // Update helicopter collider's position
        this.helicopterCollider.center.copy(potentialPosition);
        // First Check if a collision has occurred with scene objects
        const collisionResult = this.world.getOctree() ? this.world.getOctree().sphereIntersect(this.helicopterCollider) : null;
        if (collisionResult) {
            // If collision detected, adjust position to resolve penetration
            potentialPosition.addScaledVector(collisionResult.normal, collisionResult.depth);
            // Adjust velocity based on collision normal (bounce)
            const restitution = 0.15; // How much bounce (0 = no bounce, 1 = perfect bounce)
            this.velocity.addScaledVector(collisionResult.normal, -this.velocity.dot(collisionResult.normal) * (1 + restitution));
            // Apply friction/damping if on a surface
            if (collisionResult.normal.y > 0.5) { // Ground-like surface
                const groundFrictionConstant = 8.0;
                const groundDampingFactor = Math.exp(-groundFrictionConstant * deltaTime);
                this.velocity.x *= groundDampingFactor;
                this.velocity.z *= groundDampingFactor;
                // If settling on a flat surface and not trying to thrust up, stop vertical movement
                if (Math.abs(this.velocity.y) < 0.5 && !this.keys.w && collisionResult.normal.y > 0.9) {
                    this.velocity.y = 0;
                }
            }
        }
        // Second Check if a collision has occurred with Terrain (Faster than handling Terrain in the Octree)
        const terrainHeight = this.world.getTerrainHeightAt(potentialPosition.x, potentialPosition.z);
        let currentTerrainCollisionY = terrainHeight + HELICOPTER_RADIUS;
        if (potentialPosition.y < currentTerrainCollisionY) {
            potentialPosition.y = currentTerrainCollisionY;
            // Dampen vertical velocity and apply friction if moving horizontally
            if (this.velocity.y < 0) { // Only if moving downwards
                this.velocity.y *= -0.2; // Small bounce or stop
            }
            // Apply more friction when on ground
            this.velocity.x *= 0.80;
            this.velocity.z *= 0.80;

            // If thrusting upwards while on ground, allow liftoff
            if (this.keys.w && localUp.y > 0.1) { // Check if trying to lift and somewhat upright
                // Allow some upward velocity to overcome being stuck
            } else if (this.velocity.y < 0.1) { // If settling
                this.velocity.y = 0;
            }
        }
        // Third Check if the helicopter is outside world bounds
        // X Border
        if (potentialPosition.x > this.bounds.maxX - HELICOPTER_RADIUS) {
            potentialPosition.x = this.bounds.maxX - HELICOPTER_RADIUS;
            this.velocity.x *= -0.3; // Softer bounce
        } else if (potentialPosition.x < this.bounds.minX + HELICOPTER_RADIUS) {
            potentialPosition.x = this.bounds.minX + HELICOPTER_RADIUS;
            this.velocity.x *= -0.3;
        }
        // Z Border
        if (potentialPosition.z > this.bounds.maxZ - HELICOPTER_RADIUS) {
            potentialPosition.z = this.bounds.maxZ - HELICOPTER_RADIUS;
            this.velocity.z *= -0.3;
        } else if (potentialPosition.z < this.bounds.minZ + HELICOPTER_RADIUS) {
            potentialPosition.z = this.bounds.minZ + HELICOPTER_RADIUS;
            this.velocity.z *= -0.3;
        }

        // 6. Apply Final Position
        this.camera.position.copy(potentialPosition);
    }

    applyForce(forceVector) {
        // Assuming mass is incorporated in force strength or is 1 (F = ma -> a = F/m)
        this.acceleration.addScaledVector(forceVector, 1 / HELICOPTER_MASS);
    }
}