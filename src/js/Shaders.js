import * as THREE from 'three';

// Terrain vertex and fragment shaders
const _TerrainVS = `
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
`;
const _TerrainFS = `
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

    float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
    float sum(vec3 v) { return v.x + v.y + v.z; }
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

    // Function to compute normal using derivatives 
    vec3 getNormal() { return normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition))); }

    // Simple noise function
    float noise(vec2 p){
        vec2 ip = floor(p);
        vec2 u = fract(p);
        u = u*u*(3.0-2.0*u);
        
        float res = mix(
            mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
            mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
        return res*res;
    }
    // Perlin noise function
    float perlinNoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
            dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }
    
    // Function to sample texture without obvious tiling
    vec4 textureNoTile( sampler2D samp, vec2 uv ){
        // sample variation pattern
        float k = perlinNoise(0.15 * uv); // use procedural noise instead of texture lookup

        // compute index
        float l = k*8.0;
        float f = fract(l);

        float ia = floor(l);
        float ib = ia + 1.0;

        // offsets for the different virtual patterns
        float v = 0.4;
        vec2 offa = sin(vec2(3.0,7.0)*ia); // can replace with any other hash
        vec2 offb = sin(vec2(3.0,7.0)*ib); // can replace with any other hash

        // compute derivatives for mip-mapping
        vec2 dx = dFdx(uv), dy = dFdy(uv);

        // sample the two closest virtual patterns
        vec3 cola = texture2DGradEXT( samp, uv + v*offa, dx, dy ).xyz;
        vec3 colb = texture2DGradEXT( samp, uv + v*offb, dx, dy ).xyz;

        // interpolate between the two virtual patterns
        vec3 col = mix( cola, colb, smoothstep(0.2,0.8,f-0.1*sum(cola-colb)) );
        return vec4(col,1.0);
    }

    void main() {
        vec3 normal = getNormal();
        float h = vHeight;

        // Sample textures based on UV coordinates
        vec2 repeatedUv = vUv * uTextureRepeat;
        vec4 sandColor = textureNoTile(uSandTexture, repeatedUv);
        vec4 grassColor = textureNoTile(uGrassTexture, repeatedUv);
        vec4 rockColor = textureNoTile(uRockTexture, repeatedUv);
        vec4 snowColor = textureNoTile(uSnowTexture, repeatedUv);

        // --- Add noise to blend transitions ---
        float blendNoise = (noise(vUv * 20.0) - 0.5) * uBlendRange * 0.7; // scale noise and strength

        // Sand/Grass blend
        float grassWeight = smoothstep(uSandLevel - uBlendRange + blendNoise, uSandLevel + blendNoise, h) *
                            (1.0 - smoothstep(uGrassLevel + blendNoise, uGrassLevel + uBlendRange + blendNoise, h));
        grassWeight = clamp(grassWeight, 0.0, 1.0);

        // Rock layer (height based)
        float rockHeightWeight = smoothstep(uGrassLevel - uBlendRange + blendNoise, uGrassLevel + blendNoise, h) *
                                (1.0 - smoothstep(uRockLevel + blendNoise, uRockLevel + uBlendRange + blendNoise, h));
        // Rock layer (slope based)
        float slope = acos(clamp(normal.y, 0.0, 1.0));
        float rockSlopeWeight = smoothstep(uSlopeThreshold - uSlopeBlendRange, uSlopeThreshold, slope);
        float totalRockWeight = max(rockHeightWeight, rockSlopeWeight);

        // Snow layer
        float snowWeight = smoothstep(uRockLevel - uBlendRange + blendNoise, uRockLevel + blendNoise, h);

        // Layered blending: start with a base and mix upwards
        vec3 finalColor = sandColor.rgb;
        finalColor = mix(finalColor, grassColor.rgb, grassWeight);
        finalColor = mix(finalColor, rockColor.rgb, rockHeightWeight); // Instead of totalRockWeight
        finalColor = mix(finalColor, snowColor.rgb, snowWeight);

        // Basic lighting
        float diffuseStrength = max(0.0, dot(normal, uDirectionalLightDirection));
        vec3 diffuse = uDirectionalLightColor * diffuseStrength;
        vec3 lighting = uAmbientLightColor + diffuse;

        gl_FragColor = vec4(finalColor * lighting, 1.0);
    }
`;

function generateBlendedMaterial(textures, baseMaterial = new THREE.MeshLambertMaterial()) {
    function format(n) {
        return n === (n | 0) ? `${n}.0` : `${n}`;
    }

    let uniforms = {};
    let declarations = '';
    let blendingCode = '';

    // Base texture setup
    const baseTex = textures[0].texture;
    const baseRepeat = baseTex.repeat;
    const baseOffset = baseTex.offset;
    uniforms[`texture_0`] = { value: baseTex };
    declarations += `uniform sampler2D texture_0;\n`;
    blendingCode += `
        vec4 color = texture2D(texture_0, MyvUv * vec2(${format(baseRepeat.x)}, ${format(baseRepeat.y)}) + vec2(${format(baseOffset.x)}, ${format(baseOffset.y)}));`;

    for (let i = 1; i < textures.length; i++) {
        const tex = textures[i].texture;
        const repeat = tex.repeat;
        const offset = tex.offset;
        const uniformName = `texture_${i}`;
        uniforms[uniformName] = { value: tex };
        declarations += `uniform sampler2D ${uniformName};\n`;

        let blendExpr = '1.0'; // Default blend factor

        if (textures[i].levels) {
            const [minOut, maxOut, minIn, maxIn] = textures[i].levels.map(format);
            blendExpr = `1.0 - smoothstep(${minOut}, ${maxOut}, vPosition.z) + smoothstep(${minIn}, ${maxIn}, vPosition.z)`;
        } else if (textures[i].glsl) {
            blendExpr = textures[i].glsl;
        }

        blendingCode += `
        color = mix(
            texture2D(${uniformName}, MyvUv * vec2(${format(repeat.x)}, ${format(repeat.y)}) + vec2(${format(offset.x)}, ${format(offset.y)})),
            color,
            clamp(${blendExpr}, 0.0, 1.0)
        );`;
    }

    const varyings = `
        varying vec2 MyvUv;
        varying vec3 vPosition;
        varying vec3 myNormal;
    `;

    const blendingLogic = `
        float slope = acos(clamp(dot(normalize(myNormal), vec3(0.0, 1.0, 0.0)), -1.0, 1.0));
        ${blendingCode}
        diffuseColor.rgb = color.rgb;
    `;

    baseMaterial.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);

        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `${varyings}\n#include <common>`
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <uv_vertex>',
            `
                MyvUv = uv;
                vPosition = position;
                myNormal = normal;
                #include <uv_vertex>
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `${declarations}\n${varyings}\n#include <common>`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            blendingLogic
        );
    };

    return baseMaterial;
}

// Terrain Material
class TerrainMaterial {
    constructor({ baseMaterial, textures, heightMap, heightLimits }) {
        this.textures = textures;
        this.heightMap = heightMap;
        this.heightLimits = heightLimits;
        this.material = baseMaterial;

        this._patchMaterial();
        return this.material;
    }

    _patchMaterial() {
        const mat = this.material;
        const textures = this.textures;
        const heightMap = this.heightMap;
        const [minH, maxH] = [this.heightLimits.min, this.heightLimits.max];

        mat.onBeforeCompile = (shader) => {
            // Inject varyings + uniforms
            shader.uniforms.heightMap = { value: heightMap };
            shader.uniforms.time = { value: 0 }; // Optional, for animation (Later use)

            // Add texture uniforms
            textures.forEach((tex, i) => {
                shader.uniforms[`tex${i}`] = { value: tex.texture };
            });

            // Vertex shader injection
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `
                #include <common>
                varying vec3 vPositionW;
                varying vec3 vNormalW;
                varying vec2 vUvCustom;
                uniform float time;
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                vec3 transformed = position;
                vUvCustom = uv;
                vPositionW = (modelMatrix * vec4(position, 1.0)).xyz;
                vNormalW = normalize(normalMatrix * normal);
                `
            );

            // Fragment shader injection
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `
                #include <common>
                varying vec3 vPositionW;
                varying vec3 vNormalW;
                varying vec2 vUvCustom;
                uniform sampler2D heightMap;
                ${textures.map((_, i) => `uniform sampler2D tex${i};`).join('\n')}
                `
            );

            // Replace map fragment for blending
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                vec4 tex0 = texture2D(tex0, vUvCustom * 8.0);
                vec4 blended = tex0;

                ${textures.slice(1).map((tex, i) => {
                    const idx = i + 1;
                    
                    const [in1, out1, in2, out2] = [tex.levels[0], tex.levels[1], tex.levels[2], tex.levels[3]].map(n => n !== undefined ? n : 0);
                    const slopeCutoff = tex.slopeLimit ?? null;
                    let blendExpr = `smoothstep(${in1.toFixed(1)}, ${out1.toFixed(1)}, vPositionW.y) * (1.0 + smoothstep(${in2.toFixed(1)}, ${out2.toFixed(1)}, vPositionW.y))`;
                    // if (slopeCutoff !== null) {
                    //     blendExpr += ` * step(${Math.cos(THREE.MathUtils.degToRad(slopeCutoff)).toFixed(3)}, dot(vNormalW, vec3(0.0, 1.0, 0.0)))`;
                    // }

                    return `
                    vec4 tex${idx} = texture2D(tex${idx}, vUvCustom * 8.0);
                    float blend${idx} = clamp(${blendExpr}, 0.0, 1.0);
                    blended = mix(blended, tex${idx}, blend${idx});
                    `;
                }).join('\n')}

                diffuseColor = vec4(blended.rgb * diffuse, opacity);
                `
            );
        };
    }
}

export { _TerrainVS, _TerrainFS, generateBlendedMaterial, TerrainMaterial };


// Export the shaders
// export { _TerrainVS, _TerrainFS };