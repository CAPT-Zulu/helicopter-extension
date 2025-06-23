import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import NoiseGenerator from './NoiseGenerator.js';
import alea from 'alea';
import { _TerrainVS, _TerrainFS, TerrainMaterial } from './Shaders.js';

export default class WorldGenerator {
    constructor(scene) {
        // Set the scene
        this.scene = scene;

        // World elements
        this.worldOctree = null;
        this.collisionGroup = new THREE.Group();
        this.ground = null;
        this.spawn = null;
        this.sunPosition = null;
        this.sunDirection = null;

        // Terrain Configuration
        this.terrainSeed = alea() // Random seed for noise generation
        this.noiseGenerator = new NoiseGenerator(this.terrainSeed);
        this.terrainSize = { width: 1024, height: 1024 }; // World units
        this.heightMapResolution = { width: 256, height: 256 }; // Texture resolution
        this.planeSegments = 256; // Number of segments in the terrain plane (should match heightMapResolution for optimal performance)
        this.terrainHeightLimits = { min: -100, max: 200 }; // World height limits

        // Noise parameters
        this.noiseParams = {
            scale: 500,         // Lower = more zoomed in, more features. Higher = smoother, larger features.
            octaves: 4,         // Number of noise layers (more = more detail, but slower)
            persistence: 0.5,   // How much detail is added or removed at each octave (0-1)
            lacunarity: 2.0,    // How much detail is added or removed at each octave (typically > 1)
            offsetX: 0,         // Offset, could be used in the future?
            offsetY: 0,         // Offset, could be used in the future?
        };

        // Debug options
        this.debugOctreeHelper = false; // Show octree helper in scene
        this.debugSaveNoiseMap = false; // Save generated heightmap to PNG for debugging

        // Setup world and environment
        this.setupTerrain();
        this.setupLights();
        this.setupEnvironment();
        this.setupSpawn();
        this.setupOctree();
    }

    setupEnvironment() {
        // HDRI Environment Map
        new RGBELoader()
            .setPath('textures/') // Folder containing your HDRI
            .load('hdri_1k.hdr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.environment = texture; // For PBR lighting/reflections
                this.scene.background = texture;  // For skybox background
            });
        // Water plane
        const water = new THREE.Mesh(
            new THREE.PlaneGeometry(this.terrainSize.width * 3, this.terrainSize.height * 3, 16, 16),
            new THREE.MeshLambertMaterial({ color: 0x006ba0 })
        )
        water.position.y = this.terrainHeightLimits.min + 30; // Slightly above the minimum height
        water.rotation.x = -0.5 * Math.PI;
        this.scene.add(water);
        // Sky fog - Color updated to match the hazy, low-sun horizon
        // this.scene.fog = new THREE.Fog(0xfab274, 100, 1500);
        // Skybox
        const skybox = new Sky();
        skybox.scale.setScalar(this.terrainSize.width);
        // this.scene.add(skybox);

        // Adjust Sky uniforms for a stylized, hazy look
        const skyUniforms = skybox.material.uniforms;
        skyUniforms['turbidity'].value = 10;
        skyUniforms['rayleigh'].value = 3;
        skyUniforms['mieCoefficient'].value = 0.005;
        skyUniforms['mieDirectionalG'].value = 0.7;

        // Skybox sun
        this.sunPosition = new THREE.Vector3();

        // Set sun lower on the horizon for more dramatic, stylized lighting
        const elevation = 2; // degrees above the horizon
        const azimuth = 180; // degrees (180 = from the south)
        const phi = THREE.MathUtils.degToRad(90 - elevation);
        const theta = THREE.MathUtils.degToRad(azimuth);
        this.sunPosition.setFromSphericalCoords(1, phi, theta);

        this.sunDirection = this.sunPosition.clone().normalize();
        skybox.material.uniforms['sunPosition'].value.copy(this.sunPosition);
    }

    setupTerrain() {
        // Generate heightmap using noise generator
        const heightDataResult = this.noiseGenerator.generateHeightData({
            width: this.heightMapResolution.width,
            height: this.heightMapResolution.height,
            ...this.noiseParams
        });
        // Debug: Save height map to PNG if enabled
        if (this.debugSaveNoiseMap) {
            this.noiseGenerator.saveDataToPNG(
                heightDataResult.data,
                heightDataResult.width,
                heightDataResult.height,
                `heightmap_seed_${this.terrainSeed}.png`
            );
        }
        // Create a DataTexture from the height data
        const heightMapTexture = new THREE.DataTexture(
            heightDataResult.data,
            heightDataResult.width,
            heightDataResult.height,
            THREE.RedFormat, // Using RedFormat as we only need one channel for height
            THREE.FloatType  // Using FloatType for precision
        );
        heightMapTexture.needsUpdate = true;
        heightMapTexture.magFilter = THREE.LinearFilter; // Smooth interpolation
        heightMapTexture.minFilter = THREE.LinearFilter;

        // Create terrain geometry (Plane for now, maybe later a more complex mesh so we can do culling?)
        const terrainGeometry = new THREE.PlaneGeometry(
            this.terrainSize.width,
            this.terrainSize.height,
            this.planeSegments,
            this.planeSegments
        );
        terrainGeometry.rotateX(-Math.PI / 2); // Orient plane horizontally

        // Load textures for terrain layers
        const textureLoader = new THREE.TextureLoader();
        const tSand = textureLoader.load('textures/sand_hd.jpg');
        const tGrass = textureLoader.load('textures/grass_hd.jpg');
        const tRock = textureLoader.load('textures/stone_hd.jpg');
        const tSnow = textureLoader.load('textures/snow_hd.jpg');
        [tSand, tGrass, tRock, tSnow].forEach(t => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping; // Repeat textures
        });

        // Setup the custom shader material for terrain (Based off SebLague's terrain shader)
        // const terrainMaterial = new THREE.ShaderMaterial({
        //     uniforms: {
        //         // Heightmap and displacement
        //         uHeightMap: { value: heightMapTexture },
        //         uMinHeight: { value: this.terrainHeightLimits.min },
        //         uMaxHeight: { value: this.terrainHeightLimits.max },

        //         // Textures
        //         uSandTexture: { value: tSand },
        //         uGrassTexture: { value: tGrass },
        //         uRockTexture: { value: tRock },
        //         uSnowTexture: { value: tSnow },
        //         uTextureRepeat: { value: new THREE.Vector2(100.0, 100.0) }, // How many times textures repeat over the terrain

        //         // Lighting (basic)
        //         uAmbientLightColor: { value: new THREE.Color(0x666666) },
        //         uDirectionalLightColor: { value: new THREE.Color(0xffffff) },
        //         uDirectionalLightDirection: { value: this.sunDirection ? this.sunDirection : new THREE.Vector3(0.5, 1, 0.75).normalize() },

        //         // Blending parameters
        //         uSandLevel: { value: this.terrainHeightLimits.min + 10 }, // Top of sand layer
        //         uGrassLevel: { value: 0 },          // Top of grass layer
        //         uRockLevel: { value: 80 },          // Top of rock layer (start of snow)
        //         uSnowLevel: { value: 120 },         // Full snow
        //         uBlendRange: { value: 25.0 },       // How far to blend between texture layers
        //         uSlopeThreshold: { value: 0.7 },    // Radians (approx 40 degrees for rock on slopes)
        //         uSlopeBlendRange: { value: 0.3 }
        //     },
        //     vertexShader: _TerrainVS,
        //     fragmentShader: _TerrainFS,
        //     extensions: {
        //         derivatives: true
        //     }
        // });

        const terrainMaterialPhong = new THREE.MeshPhongMaterial({
            color: 0xffffff,
        });

        // const terrainMaterialBlended = generateBlendedMaterial([
        //     { texture: tSand },
        //     { texture: tGrass, levels: [-80, -35, 20, 50] },
        //     { texture: tRock, levels: [20, 50, 60, 85] },
        //     { texture: tSnow, glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)' },
        //     { texture: tRock, glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2' },
        // ]);

        const terrainMaterial = new TerrainMaterial({
            textures: [
                { texture: tSand, levels: [-100, -80, -35, 20] }, // Sand layer
                { texture: tGrass, levels: [-80, -35, 20, 50] }, // Grass layer
                { texture: tRock, levels: [20, 50, 60, 85] }, // Rock layer
                { texture: tSnow, levels: [65, 80, 85, 100] }, // Snow layer
            ],
            heightMap: heightMapTexture,
            heightLimits: this.terrainHeightLimits,
            baseMaterial: new THREE.MeshPhongMaterial({ color: 0xffffff }),
        });

        // Create the terrain mesh
        const groundMesh = new THREE.Mesh(terrainGeometry, terrainMaterialPhong);
        groundMesh.receiveShadow = true;
        groundMesh.castShadow = true;

        // Add ground to the scene
        this.scene.add(groundMesh);
        // Store ground data
        this.ground = {
            mesh: groundMesh,
            rawHeightData: heightDataResult.data // Store for optimised height checks
        };

        // Noise offset for the terrain
        let pos = groundMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const height = this.getTerrainHeightAt(x, z);
            pos.setY(i, height); // Set the Y position based on the heightmap
        }
        pos.needsUpdate = true; // Notify Three.js that the position attribute has changed
        // Compute normals for lighting
        groundMesh.geometry.computeVertexNormals();
    }

    setupSpawn() {
        // Create a spawn point at the center of the terrain
        const spawnHeight = this.getTerrainHeightAt(0, 0);
        this.spawn = new THREE.Mesh(
            new THREE.CylinderGeometry(20, 20, 30, 12), // Cylinder for spawn point
            new THREE.MeshLambertMaterial({ color: 0x888888 })
        )
        this.spawn.position.set(0, spawnHeight + 5, 0); // Center on terrain
        this.spawn.castShadow = true;
        this.spawn.receiveShadow = true;
        this.collisionGroup.add(this.spawn);
    }

    setupLights() {
        // Create ambient light (Maybe, shader kinda handles it, maybe for structures and other objects)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        // Create a directional light (Place it based on the terrain's shader light)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        const sunDir = this.sunDirection ? this.sunDirection : new THREE.Vector3(0.5, 1, 0.75).normalize();
        directionalLight.position.copy(sunDir).multiplyScalar(100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(2048, 2048);
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = this.terrainSize.width;
        const shadowCamSize = Math.max(this.terrainSize.width, this.terrainSize.height) / 2;
        directionalLight.shadow.camera.left = -shadowCamSize;
        directionalLight.shadow.camera.right = shadowCamSize;
        directionalLight.shadow.camera.top = shadowCamSize;
        directionalLight.shadow.camera.bottom = -shadowCamSize;
        directionalLight.shadow.bias = -0.001;
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
        if (this.debugOctreeHelper) {
            const octreeHelper = new OctreeHelper(this.worldOctree);
            octreeHelper.visible = true;
            this.scene.add(octreeHelper);
        }
    }

    getTerrainMesh() {
        // Return the terrain mesh if it exists
        return this.ground ? this.ground.mesh : null;
    }

    /**
     * Gets terrain height at world (x, z) coordinates using bilinear interpolation on raw height data.
     * @param {number} worldX - World X coordinate.
     * @param {number} worldZ - World Z coordinate.
     * @returns {number} The terrain height, or minHeight if out of bounds.
     */
    getTerrainHeightAt(worldX, worldZ) {
        if (!this.ground || !this.ground.rawHeightData) {
            console.warn('Ground data not initialized. Returning min height.');
            return this.terrainHeightLimits.min;
        }
        const { rawHeightData } = this.ground;
        const dataWidth = this.heightMapResolution.width;
        const dataHeight = this.heightMapResolution.height;

        // Convert world coordinates to UV coordinates (0-1 range) for the heightmap
        const u = (worldX + this.terrainSize.width / 2) / this.terrainSize.width;
        // Z-axis might be flipped depending on plane orientation vs texture coords
        // Standard UVs: (0,0) is bottom-left or top-left. THREE.PlaneGeometry UVs (0,0) at one corner.
        // If plane rotated -PI/2 on X, original Y becomes Z.
        // UV.y typically maps to Z. Let's assume standard mapping for now.
        const v = 1.0 - ((worldZ + this.terrainSize.height / 2) / this.terrainSize.height); // Flipped v for typical image coords

        if (u < 0 || u > 1 || v < 0 || v > 1) {
            return this.terrainHeightLimits.min; // Out of bounds
        }

        // Convert UV to raw data array indices (float)
        const x_float = u * (dataWidth - 1);
        const y_float = v * (dataHeight - 1);

        const x1 = Math.floor(x_float);
        const y1 = Math.floor(y_float);
        const x2 = Math.min(x1 + 1, dataWidth - 1); // Clamp to bounds
        const y2 = Math.min(y1 + 1, dataHeight - 1); // Clamp to bounds

        // Interpolation weights
        const wx = x_float - x1;
        const wy = y_float - y1;

        // Get height values at the four corners (normalized 0-1)
        const h11 = rawHeightData[y1 * dataWidth + x1];
        const h21 = rawHeightData[y1 * dataWidth + x2];
        const h12 = rawHeightData[y2 * dataWidth + x1];
        const h22 = rawHeightData[y2 * dataWidth + x2];

        // Bilinear interpolation for normalized height
        const h_norm_top = h11 * (1 - wx) + h21 * wx;
        const h_norm_bottom = h12 * (1 - wx) + h22 * wx;
        const interpolated_h_norm = h_norm_top * (1 - wy) + h_norm_bottom * wy;

        // Scale to actual world height
        return this.terrainHeightLimits.min + interpolated_h_norm * (this.terrainHeightLimits.max - this.terrainHeightLimits.min);
    }

    getWorldBounds() {
        // Returns the world bounds based on terrain size and height limits
        return {
            minX: -this.terrainSize.width / 2,
            maxX: this.terrainSize.width / 2,
            minZ: -this.terrainSize.height / 2,
            maxZ: this.terrainSize.height / 2,
            minY: this.terrainHeightLimits.min,
            maxY: this.terrainHeightLimits.max
        };
    }

    getWorldOctree() {
        // Return the octree for collision detection
        return this.worldOctree;
    }
}