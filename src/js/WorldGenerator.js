import * as THREE from 'three';
import { Terrain } from './THREE.Terrain.mjs';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import StructureFactory from './Structures.js';

export default class WorldGenerator {
    constructor(scene) {
        // Set scene
        this.scene = scene;
        this.worldOctree = null;
        // this.structureFactory = new StructureFactory();
        this.collisionGroup = new THREE.Group();
        this.ground = null;
        this.spawn = null;

        // Scene Variables
        // this.structureAmount = Math.floor(Math.random() * (5 - 2)) + 2;

        // Setup world / environment
        this.setupTerrain();
        this.setupLights();
        this.setupEnvironment();
        this.setupSpawn();
        this.setupOctree();
        // this.setupStructures();
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
        // this.worldOctree.fromGraphNode(this.ground.scene); // More efficient to use getTerrainHeightAt than using Octree for terrain mesh (O(1) vs O(logN))
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
        // Add spawn to scene and collision group
        // this.scene.add(this.spawn);
        this.collisionGroup.add(this.spawn);
        // this.worldOctree.fromGraphNode(this.spawn);
    }

    setupStructures() {
        // Create structures 
        for (let x = 0; x < this.structureAmount; x++) {
            // Temp structure
            // let tempStructure = new THREE.BoxGeometry(50, 50, 50);
            // let tempMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
            // let tempMesh = new THREE.Mesh(tempStructure, tempMaterial);
            let tempMesh = this.structureFactory.getRandomStructure();
            if (!tempMesh) {
                console.warn("No structure created, skipping this iteration.");
                continue;
            }
            // Random position between +-50 to +-450
            let tempPosition = [
                ((Math.random() < 0.5) ? Math.floor(Math.random() * (-51 - (-450) + 1)) + (-450) : Math.floor(Math.random() * (450 - 51 + 1)) + (51)),
                ((Math.random() < 0.5) ? Math.floor(Math.random() * (-51 - (-450) + 1)) + (-450) : Math.floor(Math.random() * (450 - 51 + 1)) + (51))
            ];
            let positionY = this.getTerrainHeightAt(tempPosition[0], tempPosition[1]);
            tempMesh.position.set(tempPosition[0], positionY + 15, tempPosition[1]);
            // Add model to scene and collision group
            this.scene.add(tempMesh);
            this.collisionGroup.add(tempMesh);
            // this.worldOctree.fromGraphNode(tempMesh);
        }
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

    setupOctree() {
        // Create octree for collision detection
        this.worldOctree = new Octree({
            overlapPct: 0.1,
            objectsThreshold: 8,
        });
        // Add collision group to octree
        if (this.collisionGroup && this.collisionGroup.children.length > 0) {
            this.scene.add(this.collisionGroup);
            this.worldOctree.fromGraphNode(this.collisionGroup);
        }
        // DEBUG: OctreeHelper
        const octreeHelper = new OctreeHelper(this.worldOctree);
        octreeHelper.visible = true;
        this.scene.add(octreeHelper);
    }

    getTerrainMesh() {
        // Return the terrain mesh if it exists
        return this.ground ? this.ground.mesh : null;
    }

    getTerrainHeightAt(worldX, worldZ) {
        const terrainMesh = this.getTerrainMesh();
        if (!terrainMesh || !terrainMesh.geometry) return -100;

        // Get terrain options
        const { xSize, ySize, xSegments, ySegments } = this.ground.options;
        const halfX = xSize / 2;
        const halfZ = ySize / 2;

        // Convert worldX/worldZ to local grid coordinates (u, v in [0,1])
        const u = (worldX + halfX) / xSize;
        const v = (worldZ + halfZ) / ySize;

        // Clamp to grid
        const gridX = Math.max(0, Math.min(xSegments - 1, u * xSegments));
        const gridZ = Math.max(0, Math.min(ySegments - 1, v * ySegments));
        const ix = Math.floor(gridX);
        const iz = Math.floor(gridZ);

        // Get vertex indices for the quad
        const xl = xSegments + 1;
        const position = terrainMesh.geometry.attributes.position;
        if (!position || !position.array) return -100;

        // Get the four corners of the quad
        const i00 = (iz) * xl + (ix);
        const i10 = (iz) * xl + (ix + 1);
        const i01 = (iz + 1) * xl + (ix);
        const i11 = (iz + 1) * xl + (ix + 1);

        // Get positions
        const getPos = (i) => ({
            x: position.array[i * 3 + 0],
            y: position.array[i * 3 + 2],
            z: position.array[i * 3 + 1],
        });
        const p00 = getPos(i00);
        const p10 = getPos(i10);
        const p01 = getPos(i01);
        const p11 = getPos(i11);

        // Local position within the quad (0..1)
        const fx = gridX - ix;
        const fz = gridZ - iz;

        // Determine which triangle of the quad the point is in
        let height;
        if (fx + fz < 1) {
            // Lower triangle (p00, p10, p01)
            // Barycentric interpolation
            const h0 = p00.y;
            const h1 = p10.y;
            const h2 = p01.y;
            height = h0 * (1 - fx - fz) + h1 * fx + h2 * fz;
        } else {
            // Upper triangle (p11, p10, p01)
            // Barycentric interpolation
            const h0 = p11.y;
            const h1 = p10.y;
            const h2 = p01.y;
            height = h0 * (fx + fz - 1) + h1 * (1 - fz) + h2 * (1 - fx);
        }

        return height;
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
        return this.worldOctree;
    }
}