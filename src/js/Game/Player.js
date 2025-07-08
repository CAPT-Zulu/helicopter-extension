// Player class
export default class Player {
    constructor(camera, world, inputManager, ControllerClass) {
        // Initialize properties
        this.camera = camera;
        this.world = world;
        this.inputManager = inputManager;
        this.controller = new ControllerClass(camera, world, inputManager); // Double check this works
    }

    update(deltaTime) {
        // Delegate movement/physics to the controller
        this.controller.update(deltaTime);
        // Further player-specific logic could go below
    }

    getPosition() {
        // Return the current players world position
        return this.controller.getPosition();
    }

    getDirection() {
        // Return the current players direction
        return this.controller.getDirection();
    }

    // Future methods for more advanced enemy interactions
    // GetVelocity
    // getAcceleration

    dispose() {
        // idk what to dispose, if anything, leave for later
    }
}
