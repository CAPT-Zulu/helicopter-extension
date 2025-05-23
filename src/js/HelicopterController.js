import * as THREE from 'three';

// --- ROTATIONAL CONTROL PARAMETERS ---
// How quickly the helicopter tries to align to the target orientation. Lower = more lag/heft.
const ROTATIONAL_LERP_FACTOR = 0.05;
// How much rotational speed is reduced each frame. Lower = spins longer.
const ROTATIONAL_DAMPING = 0.92;
// Sensitivity for mouse pitch/roll input.
const MOUSE_SENSITIVITY = 0.0015;
// Speed of yaw control with A/D keys.
const YAW_KEY_SPEED = 0.025;

// --- MOVEMENT PHYSICS PARAMETERS ---
// Max thrust force applied along the helicopter's local UP vector.
const MAIN_THRUST_FORCE = 35.0;
// Force applied downwards when 'S' is pressed.
const DOWNWARD_THRUST_FORCE = 15.0;
// Strength of gravity.
const GRAVITY_STRENGTH = 9.8;
// General air resistance / linear damping.
const LINEAR_DAMPING = 0.99;
// Mass of the helicopter
const HELICOPTER_MASS = 2.0;

// --- OTHER ---
// Radius of the helicopter for collision detection
const HELICOPTER_RADIUS = 0.5; 


export default class HelicopterController {
    constructor(camera, domElement, groundY) {
        // Set camera and DOM element
        this.camera = camera;
        this.domElement = domElement;

        // Set up ground collision parameters
        this.helicopterClearance = HELICOPTER_RADIUS * 2;
        this.groundCollisionY = groundY + this.helicopterClearance;
        
        // Set up initial position and orientation
        this.initialPosition = new THREE.Vector3(0, 10, 20);
        this.initialOrientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ'));

        // Linear motion
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        // Rotational motion
        this.targetOrientationQuaternion = new THREE.Quaternion(); // Desired orientation
        this.camera.quaternion.copy(this.initialOrientation);      // Start with initial orientation
        this.targetOrientationQuaternion.copy(this.camera.quaternion);
        // Euler angles for input
        this.inputEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.inputEuler.setFromQuaternion(this.camera.quaternion, 'YXZ');

        // Key states
        this.keys = { w: false, s: false, a: false, d: false, r: false };
        this.isMouseLocked = false;

        // Initialize event listeners
        this.initEventListeners();
        this.reset();
    }

    reset() {
        // Reset camera position and orientation
        this.camera.position.copy(this.initialPosition);
        this.camera.quaternion.copy(this.initialOrientation);
        // Reset input Euler angles
        this.targetOrientationQuaternion.copy(this.camera.quaternion);
        this.inputEuler.setFromQuaternion(this.camera.quaternion, 'YXZ');
        // Reset velocity and acceleration
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
    }

    initEventListeners() {
        // Bind keyboard and mouse events
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onPointerLockChange = this.onPointerLockChange.bind(this);
        this.onPointerLockError = this.onPointerLockError.bind(this);
        this.onClick = this.onClick.bind(this);
        document.addEventListener('keydown', this.onKeyDown, false);
        document.addEventListener('keyup', this.onKeyUp, false);
        document.addEventListener('pointerlockchange', this.onPointerLockChange, false);
        document.addEventListener('mozpointerlockchange', this.onPointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', this.onPointerLockChange, false);
        document.addEventListener('pointerlockerror', this.onPointerLockError, false);
        // Request pointer lock on click
        this.domElement.addEventListener('click', this.onClick, false);
    }

    dispose() {
        // Clean up event listeners (Needed?)
        document.removeEventListener('keydown', this.onKeyDown, false);
        document.removeEventListener('keyup', this.onKeyUp, false);
        this.domElement.removeEventListener('click', this.onClick, false);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange, false);
        document.removeEventListener('mozpointerlockchange', this.onPointerLockChange, false);
        document.removeEventListener('webkitpointerlockchange', this.onPointerLockChange, false);
        document.removeEventListener('pointerlockerror', this.onPointerLockError, false);
        // If mouse is locked, remove mouse move listener
        if (this.isMouseLocked) {
            document.removeEventListener('mousemove', this.onMouseMove, false);
            document.exitPointerLock();
            this.isMouseLocked = false;
        }
    }

    onClick() {
        // Check if the pointer lock is already active
        if (!this.isMouseLocked) {
            this.domElement.requestPointerLock = this.domElement.requestPointerLock ||
                                                this.domElement.mozRequestPointerLock ||
                                                this.domElement.webkitRequestPointerLock;
            if (this.domElement.requestPointerLock) {
                // Request pointer lock
                this.domElement.requestPointerLock();
            } else {
                // Pointer lock not supported (Could happen apparently)
                console.warn("Pointer Lock API not available.");
            }
        }
    }

    onPointerLockChange() {
        // Check if the pointer lock is active
        if (document.pointerLockElement === this.domElement ||
            document.mozPointerLockElement === this.domElement ||
            document.webkitPointerLockElement === this.domElement) {
            // Pointer lock is active
            this.isMouseLocked = true;
            document.addEventListener("mousemove", this.onMouseMove, false);
        } else {
            // Pointer lock is not active
            this.isMouseLocked = false;
            document.removeEventListener("mousemove", this.onMouseMove, false);
        }
    }

    onPointerLockError(e) {
        // Handle pointer lock error
        console.error('Pointer Lock Error:', e);
        this.isMouseLocked = false;
    }

    onKeyDown(event) {
        // Handle key presses
        const key = event.key.toLowerCase();
        this.keys[key] = true;
        if (key === 'r') this.reset();
    }

    onKeyUp(event) {
        // Handle key releases
        this.keys[event.key.toLowerCase()] = false;
    }

    onMouseMove(event) {
        // Handle mouse movement
        if (!this.isMouseLocked) return; // Ignore if not locked
        // Get mouse movement
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        // Update inputEuler based on mouse
        this.inputEuler.x -= movementY * MOUSE_SENSITIVITY; // Pitch
        // this.inputEuler.y -= movementX * MOUSE_SENSITIVITY; // Yaw (Optional, but I prefer roll)
        this.inputEuler.z -= movementX * MOUSE_SENSITIVITY; // Roll
        // Clamp pitch to prevent flipping (e.g., +/- 85 degrees)
        this.inputEuler.x = Math.max(-Math.PI / 2 * 0.9, Math.min(Math.PI / 2 * 0.9, this.inputEuler.x));
    }

    update(deltaTime) {
        // 1. Handle Rotational Input & Update Target Orientation
        // Yaw from keys (A/D)
        this.inputEuler.y += (this.keys.a - this.keys.d) * YAW_KEY_SPEED * deltaTime * 60;
        // Convert the accumulated inputEuler to our targetQuaternion
        this.targetOrientationQuaternion.setFromEuler(this.inputEuler);

        // 2. Smoothly Interpolate Current Orientation Towards Target
        this.camera.quaternion.slerp(
            this.targetOrientationQuaternion,
            ROTATIONAL_LERP_FACTOR * (deltaTime * 60)
        );

        // 3. Calculate Forces
        this.acceleration.set(0, 0, 0); // Reset acceleration
        // Get helicopter's local up direction in world space
        const localUp = new THREE.Vector3(0, 1, 0);
        localUp.applyQuaternion(this.camera.quaternion);
        // Calculate thrust based on key presses
        let thrustMagnitude = (this.keys.w ? MAIN_THRUST_FORCE : 0) - (this.keys.s ? DOWNWARD_THRUST_FORCE : 0);
        // If thrust not zero, apply it in the local up direction
        if (thrustMagnitude !== 0) {
            const thrustForce = localUp.clone().multiplyScalar(thrustMagnitude);
            this.applyForce(thrustForce);
        }
        // Gravity (always downwards)
        const gravity = new THREE.Vector3(0, -GRAVITY_STRENGTH * HELICOPTER_MASS, 0);
        this.applyForce(gravity);

        // 4. Update Velocity & Position
        // V_new = V_old + A * dt
        this.velocity.addScaledVector(this.acceleration, deltaTime);
        // Apply linear damping (air resistance)
        this.velocity.multiplyScalar(Math.pow(LINEAR_DAMPING, deltaTime * 30)); // Better way of doing this? (TODO)
        // P_new = P_old + V_new * dt
        this.camera.position.addScaledVector(this.velocity, deltaTime);

        // 5. Ground Collision (TODO: Will need to be updated for terrain)
        if (this.camera.position.y < this.groundCollisionY) {
            this.camera.position.y = this.groundCollisionY;
            this.velocity.y = Math.max(0, this.velocity.y * -0.1);
            // Apply some friction on ground
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
        }
    }

    // Helper to apply force (F = ma -> a = F/m)
    applyForce(forceVector) {
        // Assuming mass is incorporated in force strength or is 1
        this.acceleration.addScaledVector(forceVector, 1 / HELICOPTER_MASS);
    }
}