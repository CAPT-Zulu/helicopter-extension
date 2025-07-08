// InputManager class
export default class InputManager {
    constructor(domElement) {
        // Initialize properties
        this.keys = {};
        this.mouseDelta = { x: 0, y: 0 };
        this.isPointerLocked = false;
        this.domElement = domElement;

        // Bind event handlers
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onPointerLockChange = this.onPointerLockChange.bind(this);

        // Add event listeners
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        this.domElement.addEventListener('click', () => this.domElement.requestPointerLock());
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
    }

    onKeyDown(e) { this.keys[e.key.toLowerCase()] = true; }

    onKeyUp(e) { this.keys[e.key.toLowerCase()] = false; }

    onMouseMove(e) {
        if (this.isPointerLocked) {
            this.mouseDelta.x = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
            this.mouseDelta.y = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
        }
    }

    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.domElement;
        if (this.isPointerLocked) {
            document.addEventListener('mousemove', this.onMouseMove);
        } else {
            document.removeEventListener('mousemove', this.onMouseMove);
        }
    }

    resetDeltas() {
        // Reset mouse deltas after rendering
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
    }

    dispose() {
        // Remove event listeners
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('mousemove', this.onMouseMove);
    }
}