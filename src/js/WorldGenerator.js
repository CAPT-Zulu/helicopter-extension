import * as THREE from 'three';
import { Terrain } from './THREE.Terrain.mjs';

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
        const segments = 128;

        const minHeight = -64;
        const maxHeight = 64;

        // Create terrain material
        const groundMaterial = new THREE.MeshStandardMaterial({
            metalness: 0.0,
            roughness: 0.5,
            vertexColors: true
        });

        // Generate terrain using THREE.Terrain
        const terrainObject = new Terrain({
            heightmap: Terrain.Hill,
            material: groundMaterial,
            maxHeight: maxHeight,
            minHeight: minHeight,
            xSize: segmentSize,
            ySize: segmentSize,
            xSegments: segments,
            ySegments: segments,
            easing: Terrain.Linear,
            frequency: 2.5,
        });
        this.ground = terrainObject;
        console.log("Terrain object:", terrainObject);

        // Check if the terrain object has a valid mesh
        const groundMesh = terrainObject.mesh;
        if (!groundMesh || !groundMesh.geometry) {
            console.error("THREE.Terrain did not generate a valid mesh.");
            return;
        }
        const groundGeometry = groundMesh.geometry;

        // Create textures for terrain as just base color
        const textureLoader = new THREE.TextureLoader();
        const t1 = textureLoader.load('sand1.jpg');
        const t2 = textureLoader.load('grass1.jpg');
        const t3 = textureLoader.load('stone1.jpg');
        const t4 = textureLoader.load('snow1.jpg');

        let material = Terrain.generateBlendedMaterial([
            // The first texture is the base; other textures are blended in on top.
            { texture: t1 },
            // Start blending in at height -80; opaque between -35 and 20; blend out by 50
            { texture: t2, levels: [-80, -35, 20, 50] },
            { texture: t3, levels: [20, 50, 60, 85] },
            // How quickly this texture is blended in depends on its x-position.
            { texture: t4, glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)' },
            // Use this texture if the slope is between 27 and 45 degrees
            { texture: t3, glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2' },

        ]);

        // Set the material to the terrain object
        terrainObject.material = material;
        // Set the material to the mesh
        groundMesh.material = material;

        // Update the mesh with the new material


        // Apply transformations and properties
        // this.ground.translateY(-0.01); // Small offset if needed

        // Set shadow properties on the mesh itself
        groundMesh.receiveShadow = true;
        groundMesh.castShadow = true;

        // Vertex colors are applied based on height (Y-coordinate)
        // console.log(groundGeometry)
        // const vertices = groundGeometry.attributes.position.array;
        // // const vertices = groundGeometry.vertices;
        // const colors = [];
        // const colorSand = new THREE.Color(0xc2b280);
        // const colorGrass = new THREE.Color(0x556B2F);
        // const colorRock = new THREE.Color(0x808080);
        // const colorSnow = new THREE.Color(0xffffff);

        // const numVertices = vertices.length / 3;
        // for (let i = 0; i < numVertices; i++) {
        //     const height = vertices[i * 3 + 1]; 
        //     let r, g, b;
        //     if (height > 80) { // Snow
        //         r = colorSnow.r; g = colorSnow.g; b = colorSnow.b;
        //     } else if (height > 40) { // Rock
        //         r = colorRock.r; g = colorRock.g; b = colorRock.b;
        //     } else if (height > 0) { // Grass
        //         r = colorGrass.r; g = colorGrass.g; b = colorGrass.b;
        //     } else { // Sand (or lower terrain)
        //         r = colorSand.r; g = colorSand.g; b = colorSand.b;
        //     }
        //     colors.push(r, g, b);
        // }
        // groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        // groundGeometry.attributes.color.needsUpdate = true;

        // Normals should be recomputed for correct lighting with new vertex positions and colors
        groundGeometry.computeVertexNormals();

        // Add ground to the scene
        this.scene.add(this.ground.scene);
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
}