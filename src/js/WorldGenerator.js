import * as THREE from 'three';
import { generateNoise } from './utils';

export default class WorldGenerator {
    constructor(scene) {
        // Set scene
        this.scene = scene;
        this.ground = null;

        // Setup world / environment
        this.setupTerrain();
        this.setupLights();
    }

    setupTerrain() {
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
        generateNoise(targetHeights, segments, minHeight, maxHeight);

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
}