import * as THREE from 'three';

export default class SceneManager {
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

        // Set up ground, lights, and grid
        this.setupGround();
        this.setupLights();
        this.setupGrid();

        // Set up resize observer to handle window resizing
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                     this.onWindowResize(entry.contentRect.width, entry.contentRect.height);
                }
            }
        });
        this.resizeObserver.observe(document.body);
    }

    buildScene() {
        // Create a new scene with a light blue background
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        return scene;
    }

    buildRenderer({ width, height }) {
        // Create a WebGL renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        return renderer;
    }

    buildCamera({ width, height }) {
        // Create a perspective camera
        const aspectRatio = width / height;
        const fov = 60;
        const nearPlane = 0.1;
        const farPlane = 2000;
        const camera = new THREE.PerspectiveCamera(fov, aspectRatio, nearPlane, farPlane);
        return camera;
    }

    setupGround() {
        // Create a large plane to act as the ground
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000); // (TODO: Make randomly generated terrain)
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x556B2F,
            roughness: 0.9,
            metalness: 0.1
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.01; // Slightly below the camera to avoid z-fighting
        this.ground.receiveShadow = true;
        // Add the ground to the scene
        this.scene.add(this.ground);
    }

    setupGrid() {
        // Create a grid helper for visual reference (DEV)
        const size = 1000;
        const divisions = 100;
        const gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0xaaaaaa);
        // Add the grid to the scene
        this.scene.add(gridHelper);
    }

    setupLights() {
        // Create ambient light and add it to the scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        // Create a directional light and add it to the scene
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(100, 150, 75);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -300;
        directionalLight.shadow.camera.right = 300;
        directionalLight.shadow.camera.top = 300;
        directionalLight.shadow.camera.bottom = -300;
        this.scene.add(directionalLight);
    }

    getCamera() {
        // Return the camera object
        return this.camera;
    }

    getGroundYPosition() {
        // Return the Y position of the ground
        return this.ground.position.y;
    }

    update() {
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

    dispose() {
        // Dispose of the scene manager resources (Unknown if needed?)
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else if (object.material.dispose) {
                        object.material.dispose();
                    }
                }
                if (object.texture && object.texture.dispose) {
                     object.texture.dispose();
                }
            });
            this.scene = null;
        }
        this.camera = null;
        this.ground = null;
    }
}