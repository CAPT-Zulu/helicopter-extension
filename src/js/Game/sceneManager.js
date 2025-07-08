// General imports
import { Scene, Color, WebGLRenderer, PerspectiveCamera, PCFSoftShadowMap } from 'three';

// SceneManager class
export default class sceneManager {
    constructor(canvas) {
        // Set canvas and get its dimensions
        this.canvas = canvas;
        this.screenDimensions = {
            width: this.canvas.clientWidth,
            height: this.canvas.clientHeight
        };

        // Build scene, camera, and renderer
        this.scene = this.buildScene();
        this.renderer = this.buildRenderer(this.screenDimensions);
        this.camera = this.buildCamera(this.screenDimensions);

        // Set up resize observer to handle window resizing
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    this.onWindowResize(entry.contentRect.width, entry.contentRect.height);
                }
            }
        });
        this.resizeObserver.observe(document.body);


        ///// Double check if this is correct //////
        // canvas.addEventListener('resize', () => {
        //     this.onWindowResize(this.canvas.clientWidth, this.canvas.clientHeight);
        // });
    }

    buildScene() {
        // Create a new scene with a light blue background
        const scene = new Scene();
        scene.background = new Color(0x87ceeb);
        return scene;
    }

    buildRenderer({ width, height }) {
        // Create a WebGL renderer
        const renderer = new WebGLRenderer({
            canvas: this.canvas
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = PCFSoftShadowMap;
        return renderer;
    }

    buildCamera({ width, height }) {
        // Create a perspective camera
        const aspectRatio = width / height;
        const fov = 90;
        const nearPlane = 0.1;
        const farPlane = 2000;
        const camera = new PerspectiveCamera(fov, aspectRatio, nearPlane, farPlane);
        return camera;
    }

    getGroundYPosition() {
        // Return the Y position of the ground
        if (this.worldGenerator) {
            return this.worldGenerator.getTerrainHeightAt(worldX, worldZ);
        }
        return 0;
    }

    render() {
        // Render the scene for the current frame
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onWindowResize(width, height) {
        // Handle window resizing
        if (width === 0 || height === 0) return;
        this.screenDimensions.width = width;
        this.screenDimensions.height = height;
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }
}