import * as THREE from 'three';
import { Terrain } from './THREE.Terrain.mjs';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';

export default class WorldGenerator {
    constructor(scene) {
        // Set scene
        this.scene = scene;
        this.worldOctree = new Octree();
        this.ground = null;
        this.spawn = null;

        // Setup world / environment
        this.setupTerrain();
        this.setupLights();
        this.setupEnvironment();
        this.setupSpawn();

        const octreeHelper = new OctreeHelper(this.worldOctree);
        octreeHelper.visible = true;
        this.scene.add(octreeHelper);
    }

    setupEnvironment() {
        var water = new THREE.Mesh(
            new THREE.PlaneGeometry(16384 + 1024, 16384 + 1024, 16, 16),
            new THREE.MeshLambertMaterial({ color: 0x006ba0, transparent: true, opacity: 0.6 })
        );
        water.position.y = -99;
        water.rotation.x = -0.5 * Math.PI;
        this.scene.add(water);
    }

    setupTerrain() {
        // Variables for terrain generation
        const segmentSize = 1024;
        const segments = 63;
        const minHeight = -100;
        const maxHeight = 100;
        const steps = 1;

        // Load textures
        const textureLoader = new THREE.TextureLoader();
        const t1 = textureLoader.load('textures/sand.jpg');
        const t2 = textureLoader.load('textures/grass.jpg');
        const t3 = textureLoader.load('textures/stone.jpg');
        const t4 = textureLoader.load('textures/snow.jpg');

        // Generate blended material
        const blendedMaterial = Terrain.generateBlendedMaterial([
            { texture: t1 },
            { texture: t2, levels: [-80, -35, 20, 50] },
            { texture: t3, levels: [20, 50, 60, 85] },
            { texture: t4, glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)' },
            { texture: t3, glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2' },
        ]);

        // Generate terrain using THREE.Terrain
        const terrainObject = new Terrain({
            heightmap: Terrain.PerlinDiamond,
            material: blendedMaterial,
            maxHeight: maxHeight,
            minHeight: minHeight,
            steps: steps,
            stretch: true,
            turbulent: false,
            xSize: segmentSize,
            ySize: segmentSize,
            xSegments: segments,
            ySegments: segments,
            edgeType: 'Box',
            edgeDirection: 'Normal',
            edgeDistance: 256,
            edgeCurve: Terrain.EaseInOut,
            easing: Terrain.Linear,
            frequency: 2.5,
        });
        this.ground = terrainObject;

        // Check if the terrain object has a valid mesh
        const groundMesh = terrainObject.mesh;
        if (!groundMesh || !groundMesh.geometry) {
            console.error("THREE.Terrain did not generate a valid mesh.");
            return;
        }
        const groundGeometry = groundMesh.geometry;

        // Update properties of the ground mesh
        groundMesh.receiveShadow = true;
        groundMesh.castShadow = true;
        groundGeometry.computeVertexNormals();

        // Add ground to the scene
        this.scene.add(this.ground.scene);
        this.worldOctree.fromGraphNode(this.ground.scene);
    }

    setupSpawn() {
        // Cylinder from -100 to (terrain height at 0,0) + 50
        const spawnHeight = this.getTerrainHeightAt(0, 0);
        const spawnGeometry = new THREE.CylinderGeometry(20, 20, 30, 12);
        const spawnMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 }); // Grey
        this.spawn = new THREE.Mesh(spawnGeometry, spawnMaterial);
        this.spawn.position.set(0, spawnHeight + 10); // Centered
        this.spawn.castShadow = true;
        this.spawn.receiveShadow = true;
        this.scene.add(this.spawn);
        this.worldOctree.fromGraphNode(this.spawn);
    }

    setupLights() {
        // Create ambient light and add it to the scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        // Create a directional light and add it to the scene
        const directionalLight = new THREE.DirectionalLight('#ffffff', 2);
        directionalLight.position.set(6.25, 3, 4);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(1024, 1024);
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

    getTerrainMesh() {
        // Return the terrain mesh if it exists
        return this.ground ? this.ground.mesh : null;
    }

    getTerrainHeightAt(worldX, worldZ) {
        const terrainMesh = this.getTerrainMesh();
        if (!terrainMesh || !terrainMesh.geometry) return -100;

        // Convert worldX/worldZ to local coordinates
        const { xSize, ySize, xSegments, ySegments } = this.ground.options;
        const halfX = xSize / 2;
        const halfZ = ySize / 2;
        const localX = ((worldX + halfX) / xSize) * xSegments;
        const localZ = ((worldZ + halfZ) / ySize) * ySegments;

        // Clamp to grid
        const ix = Math.floor(Math.max(0, Math.min(xSegments, localX)));
        const iz = Math.floor(Math.max(0, Math.min(ySegments, localZ)));

        // Get vertex index
        const xl = xSegments + 1;
        const position = terrainMesh.geometry.attributes.position;
        const idx = iz * xl + ix;
        if (!position || !position.array) return -100;
        return position.array[idx * 3 + 2]; // Z is up in this terrain
    }

    getWorldBounds() {
        // Terrain is centered at (0,0)
        const halfX = (1024 || 1024) / 2;
        const halfZ = (1024 || 1024) / 2;
        return {
            minX: -halfX,
            maxX: halfX,
            minZ: -halfZ,
            maxZ: halfZ,
            minY: 100,
            maxY: 100
        };
    }

    getWorldOctree() {
        // Return the octree for collision detection
        console.log("Octree triangles:", this.worldOctree.triangles.length);
        return this.worldOctree;
    }
}