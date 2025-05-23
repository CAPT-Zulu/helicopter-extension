import * as THREE from 'three';
import { generateDiamondSquare } from './utils.js';

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
        // this.setupGrid();

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
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        return renderer;
    }

    buildCamera({ width, height }) {
        // Create a perspective camera
        const aspectRatio = width / height;
        const fov = 90;
        const nearPlane = 0.1;
        const farPlane = 2000;
        const camera = new THREE.PerspectiveCamera(fov, aspectRatio, nearPlane, farPlane);
        return camera;
    }

    setupGround() {
        // Generate noise for terrain
        const segmentSize = 512;
        const segments = 1024;

        // Create a plane geometry for the ground
        const groundGeometry = new THREE.PlaneGeometry(segmentSize, segmentSize, segments, segments);
        this.ground = new THREE.Mesh(
            groundGeometry,
            new THREE.MeshStandardMaterial({
                metalness: 0.0,
                roughness: 0.5,
                vertexColors: true
            })
        );
        this.ground.rotateX(-Math.PI / 2);
        this.ground.translateY(-0.01);
        this.ground.receiveShadow = true;
        this.ground.castShadow = true;

        // Generate a height map using the diamond-square algorithm
        let vertices = groundGeometry.attributes.position.array;
        var targetHeights = new Float32Array(vertices.length / 3);
        for (let i = 0; i < targetHeights.length; i++) {
            targetHeights[i] = 0;
        }
        const minHeight = -128; 
        const maxHeight = 256;
        generateDiamondSquare(targetHeights, segments, minHeight, maxHeight);

        // Handle color based on height
        const colors = [];
        const colorSand = new THREE.Color(0xc2b280);
        const colorGrass = new THREE.Color(0x556B2F);
        const colorRock = new THREE.Color(0x808080);
        const colorSnow = new THREE.Color(0xffffff);
        for (let i = 0; i < targetHeights.length; i++) {
            vertices[i * 3 + 2] = targetHeights[i];
            // Determine color based on height
            const height = targetHeights[i];
            let r, g, b;
            if (height > 80) { // Snow
                r = colorSnow.r; g = colorSnow.g; b = colorSnow.b;
            } else if (height > 40) { // Rock
                r = colorRock.r; g = colorRock.g; b = colorRock.b;
            } else if (height > 0) { // Grass
                r = colorGrass.r; g = colorGrass.g; b = colorGrass.b;
            } else { // Sand (or lower terrain)
                r = colorSand.r; g = colorSand.g; b = colorSand.b;
            }
            colors.push(r, g, b);
        }
        groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // Update positions and normals
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();

        // Add ground to the scene
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
        const directionalLight = new THREE.DirectionalLight( '#ffffff', 2 );
        directionalLight.position.set( 6.25, 3, 4 );
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set( 1024, 1024 );
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 30;
        directionalLight.shadow.camera.top = 8;
        directionalLight.shadow.camera.right = 8;
        directionalLight.shadow.camera.bottom = - 8;
        directionalLight.shadow.camera.left = - 8;
        directionalLight.shadow.normalBias = 0.05;
        directionalLight.shadow.bias = 0;
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