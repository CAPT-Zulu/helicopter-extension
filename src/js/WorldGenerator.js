import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import NoiseGenerator from './NoiseGenerator.js';
// import StructureFactory from './Structures.js';

export default class WorldGenerator {
    constructor(scene) {
        // Set scene
        this.scene = scene;
        this.worldOctree = null;
        // this.structureFactory = new StructureFactory();
        this.collisionGroup = new THREE.Group();
        this.ground = null; // This will now hold mesh and height data (Maybe more in the future)
        this.spawn = null;

        // Terrain Configuration
        this.terrainSeed = Math.floor(Math.random() * 100000); // Seed for noise generation
        this.noiseGenerator = new NoiseGenerator(this.terrainSeed);
        this.terrainSize = { width: 4096, depth: 4096 }; // World units
        this.heightMapResolution = { width: 512, height: 512 }; // Texture resolution
        this.terrainHeightLimits = { min: -100, max: 400 }; // World height limits

        // Noise parameters
        this.noiseParams = {
            scale: 1000,        // Lower = more zoomed in, more features. Higher = smoother, larger features.
            octaves: 8,         // Number of noise layers (more = more detail, but slower)
            persistence: 0.5,   // How much detail is added or removed at each octave (0-1)
            lacunarity: 2.0,    // How much detail is added or removed at each octave (typically > 1)
            offsetX: 0,         // Offset, could be used in the future?
            offsetY: 0,         // Offset, could be used in the future?
        };

        // Debug options
        this.debugOctreeHelper = false; // Show octree helper in scene
        this.debugSaveNoiseMap = false; // Save generated heightmap to PNG for debugging


        // Setup world / environment
        this.setupTerrain();
        this.setupLights();
        this.setupEnvironment();
        this.setupSpawn();
        this.setupOctree();
        // this.setupStructures();
    }

    setupEnvironment() {
        // Water plane
        const water = new THREE.Mesh(
            new THREE.PlaneGeometry(this.terrainSize.width * 2, this.terrainSize.depth * 2, 16, 16),
            new THREE.MeshLambertMaterial({ color: 0x006ba0, transparent: true, opacity: 0.7 })
        )
        water.position.y = this.terrainHeightLimits.min + 1; // Slightly above the minimum height
        water.rotation.x = -0.5 * Math.PI;
        this.scene.add(water);
        // Sky fog
        this.scene.fog = new THREE.Fog(0x87ceeb, 100, 1500);
    }

    setupTerrain() {
        // Generate heightmap using noise generator
        console.log(`Generating terrain with seed: ${this.terrainSeed}`);
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
        // Create a THREE.DataTexture from the height data
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
        const planeSegments = 255; // Should ideally match heightMapResolution.width/height
        const terrainGeometry = new THREE.PlaneGeometry(
            this.terrainSize.width,
            this.terrainSize.depth,
            planeSegments,
            planeSegments
        );
        terrainGeometry.rotateX(-Math.PI / 2); // Orient plane horizontally

        // Load textures for terrain layers
        const textureLoader = new THREE.TextureLoader();
        const tSand = textureLoader.load('textures/sand.jpg');
        const tGrass = textureLoader.load('textures/grass.jpg');
        const tRock = textureLoader.load('textures/stone.jpg');
        const tSnow = textureLoader.load('textures/snow.jpg');
        [tSand, tGrass, tRock, tSnow].forEach(t => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping; // Repeat textures
        });

        // Setup the custom shader material for terrain (Based off SebLague's terrain shader)
        const terrainMaterial = new THREE.ShaderMaterial({
            uniforms: {
                // Heightmap and displacement
                uHeightMap: { value: heightMapTexture },
                uMinHeight: { value: this.terrainHeightLimits.min },
                uMaxHeight: { value: this.terrainHeightLimits.max },

                // Textures
                uSandTexture: { value: tSand },
                uGrassTexture: { value: tGrass },
                uRockTexture: { value: tRock },
                uSnowTexture: { value: tSnow },
                uTextureRepeat: { value: new THREE.Vector2(100.0, 100.0) }, // How many times textures repeat over the terrain

                // Lighting (basic)
                uAmbientLightColor: { value: new THREE.Color(0x666666) },
                uDirectionalLightColor: { value: new THREE.Color(0xffffff) },
                uDirectionalLightDirection: { value: new THREE.Vector3(0.5, 1, 0.75).normalize() }, // Example light direction

                // Blending parameters
                uSandLevel: { value: this.terrainHeightLimits.min + 10 }, // Top of sand layer
                uGrassLevel: { value: 0 },          // Top of grass layer
                uRockLevel: { value: 80 },          // Top of rock layer (start of snow)
                uSnowLevel: { value: 120 },         // Full snow
                uBlendRange: { value: 15.0 },       // How far to blend between texture layers
                uSlopeThreshold: { value: 0.7 },    // Radians (approx 40 degrees for rock on slopes)
                uSlopeBlendRange: { value: 0.3 }
            },
            vertexShader: `
                uniform sampler2D uHeightMap;
                uniform float uMinHeight;
                uniform float uMaxHeight;

                varying vec2 vUv;
                varying float vHeight;
                varying vec3 vWorldPosition;
                varying vec3 vViewPosition; // For normal calculation if using dFdx/dFdy in fragment shader

                void main() {
                    vUv = uv;
                    float heightSample = texture2D(uHeightMap, uv).r; // 0-1 range
                    vHeight = uMinHeight + heightSample * (uMaxHeight - uMinHeight);

                    vec3 displacedPosition = position + vec3(0.0, vHeight, 0.0);
                    
                    vec4 modelViewPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
                    vViewPosition = -modelViewPosition.xyz; // For view direction

                    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
                    vWorldPosition = worldPosition.xyz;


                    gl_Position = projectionMatrix * modelViewPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D uSandTexture;
                uniform sampler2D uGrassTexture;
                uniform sampler2D uRockTexture;
                uniform sampler2D uSnowTexture;
                uniform vec2 uTextureRepeat;

                uniform vec3 uAmbientLightColor;
                uniform vec3 uDirectionalLightColor;
                uniform vec3 uDirectionalLightDirection;

                uniform float uSandLevel;
                uniform float uGrassLevel;
                uniform float uRockLevel;
                uniform float uSnowLevel;
                uniform float uBlendRange;
                uniform float uSlopeThreshold;
                uniform float uSlopeBlendRange;

                varying vec2 vUv;
                varying float vHeight; // Actual world height
                varying vec3 vWorldPosition;
                varying vec3 vViewPosition;


                // Function to compute normal using derivatives (requires standard derivatives extension)
                vec3 getNormal() {
                    // Using dFdx/dFdy on world position to get surface normal
                    // Be careful with signs depending on coordinate system / winding.
                    return normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
                }
                
                float getTextureWeight(float levelLow, float levelHigh, float currentVal, float blend) {
                    float w = smoothstep(levelLow - blend, levelLow, currentVal) * 
                              (1.0 - smoothstep(levelHigh, levelHigh + blend, currentVal));
                    return w;
                }


                void main() {
                    vec3 normal = getNormal();
                    
                    // Texture blending based on height
                    vec2 repeatedUv = vUv * uTextureRepeat;
                    vec4 sandColor = texture2D(uSandTexture, repeatedUv);
                    vec4 grassColor = texture2D(uGrassTexture, repeatedUv);
                    vec4 rockColor = texture2D(uRockTexture, repeatedUv);
                    vec4 snowColor = texture2D(uSnowTexture, repeatedUv);

                    float h = vHeight; // Using the interpolated world height

                    // Layered blending: start with a base and mix upwards
                    vec3 finalColor = sandColor.rgb;

                    float grassMix = smoothstep(uSandLevel - uBlendRange, uSandLevel + uBlendRange, h) *
                                     (1.0 - smoothstep(uGrassLevel - uBlendRange, uGrassLevel + uBlendRange, h));
                    grassMix = clamp(grassMix, 0.0, 1.0); // Ensure it's between 0 and 1 before mixing
                                     
                    // If h is between sandLevel and grassLevel, grassMix should be 1.
                    // If h is higher than grassLevel, grassMix should fade out.
                    // If h is lower than sandLevel, grassMix should fade out.
                    
                    // Simplified blending:
                    // Sand dominates at low levels
                    // Grass layer
                    float grassWeight = smoothstep(uSandLevel - uBlendRange, uSandLevel, h) * 
                                        (1.0 - smoothstep(uGrassLevel, uGrassLevel + uBlendRange, h));
                    finalColor = mix(finalColor, grassColor.rgb, grassWeight);

                    // Rock layer (height based)
                    float rockHeightWeight = smoothstep(uGrassLevel - uBlendRange, uGrassLevel, h) *
                                           (1.0 - smoothstep(uRockLevel, uRockLevel + uBlendRange, h));
                    
                    // Rock layer (slope based)
                    float slope = acos(clamp(normal.y, 0.0, 1.0)); // 0 (flat) to PI/2 (vertical)
                    float rockSlopeWeight = smoothstep(uSlopeThreshold - uSlopeBlendRange, uSlopeThreshold, slope);
                    
                    float totalRockWeight = max(rockHeightWeight, rockSlopeWeight);
                    finalColor = mix(finalColor, rockColor.rgb, totalRockWeight);
                    
                    // Snow layer
                    float snowWeight = smoothstep(uRockLevel - uBlendRange, uRockLevel, h);
                                      // Optional: (1.0 - smoothstep(uSnowLevel, uSnowLevel + uBlendRange, h)); for a top cap
                    finalColor = mix(finalColor, snowColor.rgb, snowWeight);


                    // Basic lighting
                    float diffuseStrength = max(0.0, dot(normal, uDirectionalLightDirection));
                    vec3 diffuse = uDirectionalLightColor * diffuseStrength;
                    vec3 lighting = uAmbientLightColor + diffuse;

                    gl_FragColor = vec4(finalColor * lighting, 1.0);
                }
            `,
            extensions: {
                derivatives: true
            }
        });

        // Create the terrain mesh
        const groundMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
        groundMesh.receiveShadow = true;
        groundMesh.castShadow = true;

        // Add ground to the scene
        this.scene.add(groundMesh);
        // Store ground data
        this.ground = {
            mesh: groundMesh,
            rawHeightData: heightDataResult.data // Store for optimised height checks
            // Not required, tho could be useful for debugging or for structure generation so I'm leaving it here
            // heightMapResolution: this.heightMapResolution, 
            // terrainSize: this.terrainSize,
            // minHeight: this.terrainHeightLimits.min,
            // maxHeight: this.terrainHeightLimits.max
        };
    }

    setupSpawn() {
        // Create a spawn point at the center of the terrain
        const spawnHeight = this.getTerrainHeightAt(0, 0);
        this.spawn = new THREE.Mesh(
            new THREE.CylinderGeometry(20, 20, 30, 12), // Cylinder for spawn point
            new THREE.MeshBasicMaterial({ color: 0x888888 })
        )
        this.spawn.position.set(0, spawnHeight + 15, 0); // Center on terrain
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
        directionalLight.position.set(
            this.ground.mesh.material.uniforms.uDirectionalLightDirection.value.x,
            this.ground.mesh.material.uniforms.uDirectionalLightDirection.value.y,
            this.ground.mesh.material.uniforms.uDirectionalLightDirection.value.z
        ).multiplyScalar(100); // Position it far away along the direction vector
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(2048, 2048);
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = this.terrainSize.width;
        const shadowCamSize = Math.max(this.terrainSize.width, this.terrainSize.depth) / 2;
        directionalLight.shadow.camera.left = -shadowCamSize;
        directionalLight.shadow.camera.right = shadowCamSize;
        directionalLight.shadow.camera.top = shadowCamSize;
        directionalLight.shadow.camera.bottom = -shadowCamSize;
        directionalLight.shadow.bias = -0.001;
        this.scene.add(directionalLight);

        // Add a shadow camera helper for debugging?
        const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
        this.scene.add(shadowHelper);
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
        // Standard UVs: (0,0) is bottom-left or top-left. PlaneGeometry UVs (0,0) at one corner.
        // If plane rotated -PI/2 on X, original Y becomes Z.
        // UV.y typically maps to Z. Let's assume standard mapping for now.
        const v = 1.0 - ((worldZ + this.terrainSize.depth / 2) / this.terrainSize.depth); // Flipped v for typical image coords

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
            minZ: -this.terrainSize.depth / 2,
            maxZ: this.terrainSize.depth / 2,
            minY: this.terrainHeightLimits.min,
            maxY: this.terrainHeightLimits.max
        };
    }

    getWorldOctree() {
        // Return the octree for collision detection
        return this.worldOctree;
    }
}