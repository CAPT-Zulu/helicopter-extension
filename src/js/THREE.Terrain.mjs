/**
 * THREE.Terrain.js ES Module Version (Custom made for helicopter-extension)
 * Based on THREE.Terrain.js 2.0.0-20220705
 *
 * @author Isaac Sukin (http://www.isaacsukin.com/)
 * @license MIT
 */
import * as THREE from 'three';

// Was unable to find an working ES6 import for THREE.Terrain.js
// So this custom version was made for use with the helicopter-extension.

// Noise functions (Simplex and Perlin)
// Adapted from https://github.com/josephg/noisejs
class Grad {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    dot2(x, y) {
        return this.x * x + this.y * y;
    }

    dot3(x, y, z) {
        return this.x * x + this.y * y + this.z * z;
    }
}

const grad3 = [
    new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0),
    new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1),
    new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)
];

const p_noise = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103,
    30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94,
    252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171,
    168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
    60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
    1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159,
    86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147,
    118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183,
    170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129,
    22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239,
    107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4,
    150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215,
    61, 156, 180
];

const perm = new Array(512);
const gradP = new Array(512);

export function seedNoise(seedValue) {
    if (seedValue > 0 && seedValue < 1) {
        seedValue *= 65536;
    }

    seedValue = Math.floor(seedValue);
    if (seedValue < 256) {
        seedValue |= seedValue << 8;
    }

    for (let i = 0; i < 256; i++) {
        const v = i & 1 ? p_noise[i] ^ (seedValue & 255) : p_noise[i] ^ ((seedValue >> 8) & 255);
        perm[i] = perm[i + 256] = v;
        gradP[i] = gradP[i + 256] = grad3[v % 12];
    }
}

// Initialize noise seed
seedNoise(Math.random());

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
// const F3 = 1 / 3; // Not used in 2D
// const G3 = 1 / 6; // Not used in 2D

export function simplexNoise(xin, yin) {
    let n0, n1, n2;
    const s = (xin + yin) * F2;
    let i = Math.floor(xin + s);
    let j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - i + t;
    const y0 = yin - j + t;

    let i1, j1;
    if (x0 > y0) {
        i1 = 1; j1 = 0;
    } else {
        i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    i &= 255; // Ensure index is within bounds for perm array
    j &= 255;

    const gi0 = gradP[i + perm[j]];
    const gi1 = gradP[i + i1 + perm[j + j1]];
    const gi2 = gradP[i + 1 + perm[j + 1]];

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
        n0 = 0;
    } else {
        t0 *= t0;
        n0 = t0 * t0 * gi0.dot2(x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
        n1 = 0;
    } else {
        t1 *= t1;
        n1 = t1 * t1 * gi1.dot2(x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
        n2 = 0;
    } else {
        t2 *= t2;
        n2 = t2 * t2 * gi2.dot2(x2, y2);
    }

    return 70 * (n0 + n1 + n2);
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    return (1 - t) * a + t * b;
}

export function perlinNoise(x, y) {
    let X = Math.floor(x);
    let Y = Math.floor(y);

    x = x - X;
    y = y - Y;

    X &= 255; // Ensure index is within bounds for perm array
    Y &= 255;

    const n00 = gradP[X + perm[Y]].dot2(x, y);
    const n01 = gradP[X + perm[Y + 1]].dot2(x, y - 1);
    const n10 = gradP[X + 1 + perm[Y]].dot2(x - 1, y);
    const n11 = gradP[X + 1 + perm[Y + 1]].dot2(x - 1, y - 1);

    const u = fade(x);

    return lerp(
        lerp(n00, n10, u),
        lerp(n01, n11, u),
        fade(y)
    );
}

export default class Terrain {
    constructor(options = {}) {
        const defaultOptions = {
            after: null,
            easing: Terrain.Linear,
            heightmap: Terrain.DiamondSquare,
            material: null,
            maxHeight: 100,
            minHeight: -100,
            optimization: Terrain.NONE,
            frequency: 2.5,
            steps: 1,
            stretch: true,
            turbulent: false,
            xSegments: 63,
            xSize: 1024,
            ySegments: 63,
            ySize: 1024,
        };

        this.options = { ...defaultOptions, ...options };
        this.options.material = this.options.material || new THREE.MeshBasicMaterial({ color: 0xee6633 });

        this.scene = new THREE.Object3D();
        // Planes are initialized on the XY plane, so rotate the plane to make it lie flat.
        this.scene.rotation.x = -0.5 * Math.PI;

        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.options.xSize, this.options.ySize, this.options.xSegments, this.options.ySegments),
            this.options.material
        );

        // Assign elevation data to the terrain plane from a heightmap or function.
        const zs = Terrain.toArray1D(this.mesh.geometry.attributes.position.array);
        if (this.options.heightmap instanceof HTMLCanvasElement || this.options.heightmap instanceof Image) {
            Terrain.fromHeightmap(zs, this.options);
        } else if (typeof this.options.heightmap === 'function') {
            this.options.heightmap(zs, this.options);
        } else {
            console.warn('An invalid value was passed for `options.heightmap`: ' + this.options.heightmap);
        }
        Terrain.fromArray1D(this.mesh.geometry.attributes.position.array, zs);
        Terrain.Normalize(this.mesh, this.options);

        this.scene.add(this.mesh);
    }

    getScene() {
        return this.scene;
    }

    static Normalize(mesh, options) {
        const zs = Terrain.toArray1D(mesh.geometry.attributes.position.array);
        if (options.turbulent) {
            Terrain.Turbulence(zs, options);
        }
        if (options.steps > 1) {
            Terrain.Step(zs, options.steps);
            Terrain.Smooth(zs, options); // Pass options for xSegments/ySegments
        }

        Terrain.Clamp(zs, options);

        if (typeof options.after === 'function') {
            options.after(zs, options);
        }
        Terrain.fromArray1D(mesh.geometry.attributes.position.array, zs);

        mesh.geometry.computeBoundingSphere();
        mesh.geometry.computeVertexNormals();
    }

    static toArray1D(vertices) {
        const tgt = new Float32Array(vertices.length / 3);
        for (let i = 0, l = tgt.length; i < l; i++) {
            tgt[i] = vertices[i * 3 + 2];
        }
        return tgt;
    }

    static fromArray1D(vertices, src) {
        for (let i = 0, l = Math.min(vertices.length / 3, src.length); i < l; i++) {
            vertices[i * 3 + 2] = src[i];
        }
    }

    static toArray2D(vertices1D, options) {
        const tgt = new Array(options.xSegments + 1);
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;
        for (let i = 0; i < xl; i++) {
            tgt[i] = new Float32Array(yl);
            for (let j = 0; j < yl; j++) {
                tgt[i][j] = vertices1D[j * xl + i];
            }
        }
        return tgt;
    }

    static fromArray2D(vertices1D, src) {
        const xl = src.length;
        if (xl === 0) return;
        const yl = src[0].length;
        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                vertices1D[j * xl + i] = src[i][j];
            }
        }
    }

    static heightmapArray(method, options) {
        const arr = new Array((options.xSegments + 1) * (options.ySegments + 1));
        arr.fill(0);
        const newOptions = { ...options }; // Clone options to avoid modifying the original
        newOptions.minHeight = newOptions.minHeight || 0;
        newOptions.maxHeight = typeof newOptions.maxHeight === 'undefined' ? 1 : newOptions.maxHeight;
        newOptions.stretch = typeof newOptions.stretch === 'undefined' ? false : newOptions.stretch;

        method(arr, newOptions);
        Terrain.Clamp(arr, newOptions);
        return arr;
    }


    static Clamp(g, options) {
        let min = Infinity;
        let max = -Infinity;
        const l = g.length;

        options.easing = options.easing || Terrain.Linear;
        for (let i = 0; i < l; i++) {
            if (g[i] < min) min = g[i];
            if (g[i] > max) max = g[i];
        }

        const actualRange = max - min;
        const optMax = typeof options.maxHeight !== 'number' ? max : options.maxHeight;
        const optMin = typeof options.minHeight !== 'number' ? min : options.minHeight;

        let targetMax = options.stretch ? optMax : (max < optMax ? max : optMax);
        let targetMin = options.stretch ? optMin : (min > optMin ? min : optMin);
        let range = targetMax - targetMin;

        if (targetMax < targetMin) { // This case implies options.stretch is false and data is outside options range
            targetMax = optMax;
            range = targetMax - targetMin; // Recalculate range based on new targetMax and original targetMin
            // This matches the original THREE.Terrain.js behavior,
            // though it can lead to a negative range if optMax < originally calculated targetMin.
            // Users should be aware of this if using no-stretch with restrictive maxHeight/minHeight.
        }

        if (actualRange === 0) { // Avoid division by zero if all heights are the same
            for (let i = 0; i < l; i++) {
                // Map to the middle of the target range or just targetMin
                g[i] = targetMin + range * 0.5;
            }
            return;
        }

        for (let i = 0; i < l; i++) {
            g[i] = options.easing((g[i] - min) / actualRange) * range + targetMin;
        }
    }

    static Turbulence(g, options) {
        const range = options.maxHeight - options.minHeight;
        for (let i = 0, l = g.length; i < l; i++) {
            g[i] = options.minHeight + Math.abs((g[i] - options.minHeight) * 2 - range);
        }
    }

    static Step(g, levelsInput) {
        const l = g.length;
        let levels = levelsInput;
        if (typeof levels === 'undefined' || levels <= 0) {
            levels = Math.floor(Math.pow(l * 0.5, 0.25));
            if (levels < 1) levels = 1;
        }
        if (levels === 1) { // No stepping needed, or heights array might be too small
            // Potentially find overall min/max and set to average if we want one flat level.
            // For now, if levels is 1, original algorithm would have issues with inc.
            // If the intent of steps:1 is "no steps", then we can return.
            // If it means "one single step level", then all points become the average.
            // The original logic implies multiple steps, so if levels is 1, buckets might be weird.
            // The loop `for (i = 0; i < levels; i++)` would run once. inc = l. subset is all heights.
            // This seems to correctly make everything one average level.
        }


        const heights = new Array(l);
        const buckets = new Array(levels);
        const inc = Math.floor(l / levels);
        if (inc === 0 && l > 0) { // Prevent inc=0 if levels > l
            // This means more levels requested than data points.
            // Each point could be its own "level" or clamp levels to l.
            // For simplicity, if inc is 0, it means levels is too high.
            // We can just return, or set levels = l.
            // The original code doesn't explicitly handle this, slice(i*0, (i+1)*0) is empty.
            // Let's assume levels <= l for meaningful bucketing.
            // If levels is 1, inc will be l.
            // If l=0, code is fine.
            // If inc=0 and l > 0, it implies levels > l.
            // Defaulting to no stepping for this edge case.
            console.warn("Terrain.Step: Number of levels is too high for the data, or data is too small. Skipping step transformation.");
            return;
        }


        for (let i = 0; i < l; i++) {
            heights[i] = g[i];
        }

        heights.sort((a, b) => a - b);

        for (let i = 0; i < levels; i++) {
            const subset = heights.slice(i * inc, (i + 1) * inc);
            if (subset.length === 0) { // Should not happen if inc > 0 or levels = 1
                buckets[i] = { min: 0, max: 0, avg: 0 }; // Default for empty subset
                if (i > 0) { // Try to use previous bucket's values
                    buckets[i] = { ...buckets[i - 1] };
                }
                continue;
            }
            const sum = subset.reduce((a, b) => a + b, 0);
            const avg = sum / subset.length;

            buckets[i] = {
                min: subset[0],
                max: subset[subset.length - 1],
                avg: avg
            };
        }
        // If levels doesn't divide l perfectly, the last bucket might miss some sorted heights.
        // The original code does not explicitly handle this remainder.
        // For points outside all defined bucket min/max (e.g. last few if remainder exists),
        // they would not be changed. This is likely fine.

        for (let i = 0; i < l; i++) {
            const startHeight = g[i];
            let assigned = false;
            for (let j = 0; j < levels; j++) {
                // Ensure bucket j exists and has properties, especially if subset was empty
                if (buckets[j] && typeof buckets[j].min !== 'undefined' && startHeight >= buckets[j].min && startHeight <= buckets[j].max) {
                    g[i] = buckets[j].avg;
                    assigned = true;
                    break;
                }
            }
            if (!assigned && levels > 0) {
                // If not assigned (e.g. falls in a gap or outside all ranges, or last element of sorted 'heights' if 'l' is not multiple of 'levels')
                // Assign to the closest bucket average or last bucket average
                g[i] = buckets[levels - 1].avg;
            }
        }
    }

    static Smooth(g, options, weight = 0) {
        const heightmap = new Float32Array(g.length);
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;

        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                let sum = 0;
                let c = 0;
                for (let n = -1; n <= 1; n++) {
                    for (let m = -1; m <= 1; m++) {
                        const key = (j + n) * xl + i + m;
                        if (typeof g[key] !== 'undefined' && (i + m) >= 0 && (j + n) >= 0 && (i + m) < xl && (j + n) < yl) {
                            sum += g[key];
                            c++;
                        }
                    }
                }
                heightmap[j * xl + i] = c > 0 ? sum / c : g[j * xl + i]; // if c is 0, keep original
            }
        }

        const w = 1 / (1 + weight);
        for (let k = 0, l = g.length; k < l; k++) {
            g[k] = (heightmap[k] + g[k] * weight) * w;
        }
    }

    static fromHeightmap(g, options) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const rows = options.ySegments + 1;
        const cols = options.xSegments + 1;
        const spread = options.maxHeight - options.minHeight;

        canvas.width = cols;
        canvas.height = rows;
        context.drawImage(options.heightmap, 0, 0, canvas.width, canvas.height);
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const i = row * cols + col;
                const idx = i * 4;
                g[i] = (data[idx] + data[idx + 1] + data[idx + 2]) / 765 * spread + options.minHeight;
            }
        }
    }

    static toHeightmap(gGeom, options) { // gGeom is mesh.geometry.attributes.position.array
        const g = Terrain.toArray1D(gGeom); // Convert to 1D height data first
        const hasMax = typeof options.maxHeight !== 'undefined';
        const hasMin = typeof options.minHeight !== 'undefined';
        let max = hasMax ? options.maxHeight : -Infinity;
        let min = hasMin ? options.minHeight : Infinity;

        if (!hasMax || !hasMin) {
            let max2 = -Infinity, min2 = Infinity;
            for (let k = 0, l = g.length; k < l; k++) {
                if (g[k] > max2) max2 = g[k];
                if (g[k] < min2) min2 = g[k];
            }
            if (!hasMax) max = max2;
            if (!hasMin) min = min2;
        }

        const canvas = options.heightmap instanceof HTMLCanvasElement ? options.heightmap : document.createElement('canvas');
        const context = canvas.getContext('2d');
        const rows = options.ySegments + 1;
        const cols = options.xSegments + 1;
        const spread = (max - min === 0) ? 1 : (max - min); // Avoid division by zero if spread is 0

        canvas.width = cols;
        canvas.height = rows;
        const d = context.createImageData(canvas.width, canvas.height);
        const data = d.data;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const i = row * cols + col;
                const idx = i * 4;
                let val = 0;
                if (spread !== 0) { // only normalize if there is a spread
                    val = Math.round(((g[i] - min) / spread) * 255);
                } else { // if spread is 0, all points are same, map to mid-gray or 0
                    val = 128;
                }
                data[idx] = data[idx + 1] = data[idx + 2] = val;
                data[idx + 3] = 255;
            }
        }
        context.putImageData(d, 0, 0);
        return canvas;
    }

    // Easing Functions
    static Linear(x) { return x; }
    static EaseIn(x) { return x * x; }
    static EaseOut(x) { return -x * (x - 2); }
    static EaseInOut(x) { return x * x * (3 - 2 * x); }
    static InEaseOut(x) { const y = 2 * x - 1; return 0.5 * y * y * y + 0.5; }
    static EaseInWeak(x) { return Math.pow(x, 1.55); }
    static EaseInStrong(x) { return Math.pow(x, 7); }

    // Optimization types
    static NONE = 0;
    static GEOMIPMAP = 1;
    static GEOCLIPMAP = 2;
    static POLYGONREDUCTION = 3;

    // Filters
    static Edges(g, options, direction, distance, easing, edges) {
        const numXSegments = Math.floor(distance / (options.xSize / options.xSegments)) || 1;
        const numYSegments = Math.floor(distance / (options.ySize / options.ySegments)) || 1;
        const peak = direction ? options.maxHeight : options.minHeight;
        const blendFunc = direction ? Math.max : Math.min; // Renamed 'max' to 'blendFunc'
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;

        easing = easing || Terrain.EaseInOut;
        edges = typeof edges === 'object' ? edges : { top: true, bottom: true, left: true, right: true };

        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < numYSegments; j++) {
                const multiplier = easing(1 - j / numYSegments);
                const k1 = j * xl + i;
                const k2 = (options.ySegments - j) * xl + i;
                if (edges.top && typeof g[k1] !== 'undefined') {
                    g[k1] = blendFunc(g[k1], (peak - g[k1]) * multiplier + g[k1]);
                }
                if (edges.bottom && typeof g[k2] !== 'undefined') {
                    g[k2] = blendFunc(g[k2], (peak - g[k2]) * multiplier + g[k2]);
                }
            }
        }
        for (let i = 0; i < yl; i++) {
            for (let j = 0; j < numXSegments; j++) {
                const multiplier = easing(1 - j / numXSegments);
                const k1 = i * xl + j;
                const k2 = i * xl + (options.xSegments - j); // Corrected k2 for right edge
                if (edges.left && typeof g[k1] !== 'undefined') {
                    g[k1] = blendFunc(g[k1], (peak - g[k1]) * multiplier + g[k1]);
                }
                if (edges.right && typeof g[k2] !== 'undefined') {
                    g[k2] = blendFunc(g[k2], (peak - g[k2]) * multiplier + g[k2]);
                }
            }
        }
        Terrain.Clamp(g, {
            maxHeight: options.maxHeight,
            minHeight: options.minHeight,
            stretch: true,
            easing: options.easing // Preserve original easing for final clamp
        });
    }

    static RadialEdges(g, options, direction, distance, easing) {
        easing = easing || Terrain.EaseInOut;
        const peak = direction ? options.maxHeight : options.minHeight;
        const blendFunc = direction ? Math.max : Math.min;
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;
        const centerX = options.xSize * 0.5;
        const centerY = options.ySize * 0.5;
        const xVertexStep = options.xSize / options.xSegments;
        const yVertexStep = options.ySize / options.ySegments;
        // The 'distance' parameter defines the start of the effect from the center.
        // We need to calculate the max radius of the terrain to determine the full extent of the effect.
        const maxTerrainRadius = Math.sqrt(centerX * centerX + centerY * centerY);
        const effectOuterRadius = maxTerrainRadius; // Effect extends to the corners
        const effectInnerRadius = distance; // User-defined distance from center where effect starts to fade out (towards edges)

        if (effectInnerRadius >= effectOuterRadius) return; // No region for effect

        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                const vertexX = i * xVertexStep;
                const vertexY = j * yVertexStep;
                const distFromCenter = Math.sqrt(Math.pow(vertexX - centerX, 2) + Math.pow(vertexY - centerY, 2));

                if (distFromCenter > effectInnerRadius) {
                    let normalizedDistance = (distFromCenter - effectInnerRadius) / (effectOuterRadius - effectInnerRadius);
                    normalizedDistance = Math.max(0, Math.min(1, normalizedDistance)); // Clamp to [0, 1]
                    const multiplier = easing(normalizedDistance); // Easing applied from inner to outer radius
                    const k = j * xl + i;
                    if (typeof g[k] !== 'undefined') {
                        g[k] = blendFunc(g[k], (peak - g[k]) * multiplier + g[k]);
                    }
                }
            }
        }
        Terrain.Clamp(g, {
            maxHeight: options.maxHeight,
            minHeight: options.minHeight,
            stretch: true, // Typically, after edge ops, we want to ensure range.
            easing: options.easing
        });
    }

    static SmoothMedian(g, options) {
        const heightmap = new Float32Array(g.length);
        const neighborValues = [];
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;

        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                neighborValues.length = 0; // Clear for current vertex
                for (let n = -1; n <= 1; n++) {
                    for (let m = -1; m <= 1; m++) {
                        const ni = i + m;
                        const nj = j + n;
                        if (ni >= 0 && nj >= 0 && ni < xl && nj < yl) {
                            neighborValues.push(g[nj * xl + ni]);
                        }
                    }
                }
                neighborValues.sort((a, b) => a - b);
                const mid = Math.floor(neighborValues.length / 2);
                let median;
                if (neighborValues.length % 2 === 1) {
                    median = neighborValues[mid];
                } else {
                    median = (neighborValues[mid - 1] + neighborValues[mid]) * 0.5;
                }
                heightmap[j * xl + i] = median;
            }
        }
        for (let k = 0, l = g.length; k < l; k++) {
            g[k] = heightmap[k];
        }
    }

    static SmoothConservative(g, options, multiplierInput) {
        const multiplier = typeof multiplierInput === 'number' ? multiplierInput : 1;
        const heightmap = new Float32Array(g.length);
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;

        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                let maxNeighbor = -Infinity;
                let minNeighbor = Infinity;
                let isCenter = true; // Flag to skip center point in neighbor check
                for (let n = -1; n <= 1; n++) {
                    for (let m = -1; m <= 1; m++) {
                        if (n === 0 && m === 0) continue; // Skip the center point itself for neighbor min/max
                        const ni = i + m;
                        const nj = j + n;
                        if (ni >= 0 && nj >= 0 && ni < xl && nj < yl) {
                            const val = g[nj * xl + ni];
                            if (val < minNeighbor) minNeighbor = val;
                            if (val > maxNeighbor) maxNeighbor = val;
                        }
                    }
                }

                const currentKey = j * xl + i;
                let currentVal = g[currentKey];

                if (minNeighbor === Infinity) { // No valid neighbors (e.g., 1x1 terrain)
                    heightmap[currentKey] = currentVal;
                    continue;
                }

                let range = maxNeighbor - minNeighbor;
                let allowedMin = minNeighbor - range * (multiplier - 1) * 0.5;
                let allowedMax = maxNeighbor + range * (multiplier - 1) * 0.5;

                heightmap[currentKey] = Math.max(allowedMin, Math.min(allowedMax, currentVal));
            }
        }
        for (let k = 0, l = g.length; k < l; k++) {
            g[k] = heightmap[k];
        }
    }

    // Generators
    static MultiPass(g, options, passes) {
        const clonedOptions = { ...options };
        const range = clonedOptions.maxHeight - clonedOptions.minHeight;
        for (let i = 0, l = passes.length; i < l; i++) {
            const amp = typeof passes[i].amplitude === 'undefined' ? 1 : passes[i].amplitude;
            const freq = typeof passes[i].frequency === 'undefined' ? clonedOptions.frequency : passes[i].frequency;
            const move = 0.5 * (range - range * amp);

            const passOptions = { ...clonedOptions };
            passOptions.maxHeight = clonedOptions.maxHeight - move;
            passOptions.minHeight = clonedOptions.minHeight + move;
            passOptions.frequency = freq;

            // If the pass itself is a generator that might zero-out previous values,
            // we might need a temporary array to sum results.
            // However, most generators are additive (+ Math.random()...).
            // If a method fully overwrites, then MultiPass needs a different strategy (e.g. weighted average).
            // Assuming additive for now as per original behavior.
            passes[i].method(g, passOptions);
        }
    }

    static Curve(g, options, curveFunc) {
        const range = (options.maxHeight - options.minHeight); // Original used *0.5, but most generators use full range difference then clamp
        const scalar = options.frequency / (Math.min(options.xSegments, options.ySegments) + 1);
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;
        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                g[j * xl + i] += curveFunc(i * scalar, j * scalar) * range;
            }
        }
    }

    static Cosine(g, options) {
        const amplitude = (options.maxHeight - options.minHeight) * 0.5; // Cosine outputs -2 to 2, so 0.5 amp is correct
        const frequencyScalar = options.frequency * Math.PI / (Math.min(options.xSegments, options.ySegments) + 1);
        const phase = Math.random() * Math.PI * 2;
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;
        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                g[j * xl + i] += amplitude * (Math.cos(i * frequencyScalar + phase) + Math.cos(j * frequencyScalar + phase));
            }
        }
    }

    static CosineLayers(g, options) {
        Terrain.MultiPass(g, options, [
            { method: Terrain.Cosine, frequency: 2.5 },
            { method: Terrain.Cosine, amplitude: 0.1, frequency: 12 },
            { method: Terrain.Cosine, amplitude: 0.05, frequency: 15 },
            { method: Terrain.Cosine, amplitude: 0.025, frequency: 20 },
        ]);
    }

    static DiamondSquare(g, options) {
        const segments = THREE.MathUtils.ceilPowerOfTwo(Math.max(options.xSegments, options.ySegments) + 1);
        const size = segments + 1;
        const heightmap = [];
        let smoothing = (options.maxHeight - options.minHeight); // Initial roughness
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;

        for (let i = 0; i <= segments; i++) {
            heightmap[i] = new Float64Array(segments + 1).fill(0); // Initialize with 0s
        }

        // Seed initial corners (optional, original implies they start at 0 and DS adds to it)
        // If g is pre-filled (e.g. with 0s from heightmapArray), this is fine.
        // If not, DS needs initial values. Original adds to existing g values.
        // Let's assume g is already an array of numbers (heights).

        for (let l = segments; l >= 2; l /= 2) {
            const half = Math.round(l * 0.5);
            smoothing /= 2.0; // Reduce roughness each step

            // Square step
            for (let x = 0; x < segments; x += l) {
                for (let y = 0; y < segments; y += l) {
                    const avg = (
                        heightmap[x][y] +
                        heightmap[x + l][y] +
                        heightmap[x][y + l] +
                        heightmap[x + l][y + l]
                    ) * 0.25;
                    const offset = (Math.random() * 2 - 1) * smoothing;
                    heightmap[x + half][y + half] = avg + offset;
                }
            }

            // Diamond step
            for (let x = 0; x < segments; x += half) {
                for (let y = (x + half) % l; y < segments; y += l) {
                    const avg = (
                        heightmap[(x - half + size) % size][y] + // Left
                        heightmap[(x + half) % size][y] +      // Right
                        heightmap[x][(y - half + size) % size] + // Top
                        heightmap[x][(y + half) % size]        // Bottom
                    ) * 0.25;
                    const offset = (Math.random() * 2 - 1) * smoothing;
                    heightmap[x][y] = avg + offset;

                    // Wrap edges for seamless terrain (optional, original did this)
                    if (x === 0) heightmap[segments][y] = avg + offset;
                    if (y === 0) heightmap[x][segments] = avg + offset;
                }
            }
        }

        // Apply heightmap to the geometry vertices
        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                // Ensure we don't read out of bounds from generated heightmap if x/ySegments not PoT+1
                const read_i = Math.min(i, segments);
                const read_j = Math.min(j, segments);
                g[j * xl + i] += heightmap[read_i][read_j];
            }
        }
    }

    static Fault(g, options) {
        const d = Math.sqrt(options.xSegments * options.xSegments + options.ySegments * options.ySegments);
        const iterations = d * options.frequency;
        const range = (options.maxHeight - options.minHeight); // Using full range for displacement scaling
        let displacement = range / iterations; // Initial displacement per iteration
        const minDisplacement = 0.01; // Prevent displacement from becoming too small

        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;

        for (let k = 0; k < iterations; k++) {
            const p1x = Math.random() * xl;
            const p1y = Math.random() * yl;
            const p2x = Math.random() * xl;
            const p2y = Math.random() * yl;

            const currentDisplacement = Math.max(minDisplacement, range * (1 - k / iterations)); // Displacement decreases over iterations

            for (let i = 0; i < xl; i++) {
                for (let j = 0; j < yl; j++) {
                    // Using a filter width based on decreasing displacement
                    const filterWidth = currentDisplacement * 0.5; // Adjust filter width dynamically

                    // Check which side of the line (p1x,p1y)-(p2x,p2y) the point (i,j) is on
                    const side = (p2x - p1x) * (j - p1y) - (p2y - p1y) * (i - p1x);

                    if (Math.abs(side) < filterWidth * d) { // Apply smoothing near the fault line
                        const factor = (1 - Math.abs(side) / (filterWidth * d));
                        g[j * xl + i] += (side > 0 ? currentDisplacement : -currentDisplacement) * factor * factor; // Smoother transition
                    } else if (side > 0) {
                        g[j * xl + i] += currentDisplacement;
                    } else {
                        g[j * xl + i] -= currentDisplacement;
                    }
                }
            }
        }
    }

    static Hill(g, options, featureFunc, shapeFunc) {
        featureFunc = featureFunc || Terrain.Influences.Hill;
        const frequency = options.frequency * 2; // Original scaling
        const numFeatures = Math.max(1, Math.floor(frequency * frequency * 10)); // Ensure at least one feature
        const heightRange = options.maxHeight - options.minHeight;

        // Adjust min/max height/radius based on frequency to allow for feature accumulation
        const minFeatureHeight = heightRange / Math.max(1, frequency * frequency);
        const maxFeatureHeight = heightRange / Math.max(1, frequency);
        const smallerSideLength = Math.min(options.xSize, options.ySize);
        const minFeatureRadius = smallerSideLength / Math.max(1, frequency * frequency * 2); // Make min radius smaller
        const maxFeatureRadius = smallerSideLength / Math.max(1, frequency * 0.5); // Make max radius larger

        const coords = { x: 0, y: 0 };
        for (let i = 0; i < numFeatures; i++) {
            const radius = Math.random() * (maxFeatureRadius - minFeatureRadius) + minFeatureRadius;
            const height = Math.random() * (maxFeatureHeight - minFeatureHeight) + minFeatureHeight;

            coords.x = Math.random(); // 0-1 range for percentage
            coords.y = Math.random(); // 0-1 range for percentage
            if (typeof shapeFunc === 'function') {
                shapeFunc(coords); // Modifies coords.x, coords.y
            }

            Terrain.Influence(
                g, options,
                featureFunc,
                coords.x, coords.y, // These are % locations
                radius, height,     // These are world-unit sizes
                THREE.AdditiveBlending, // Hills are additive
                Terrain.EaseInOut // Falloff for hills, original used EaseInStrong
            );
        }
    }

    static HillIsland(g, options, featureFunc) {
        const islandShape = function (coords) { // coords.x, coords.y are Math.random() [0,1]
            const theta = Math.random() * Math.PI * 2;
            // Bias towards center: random radius (coords.x) and random angle
            // coords.x used as magnitude, scaled to be within ~40% of center
            const magnitude = coords.x * 0.4; // Max 40% from center
            coords.x = 0.5 + Math.cos(theta) * magnitude;
            coords.y = 0.5 + Math.sin(theta) * magnitude;
        };
        Terrain.Hill(g, options, featureFunc, islandShape);
    }

    static Particles(g, options) {
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;
        const iterations = Math.floor(Math.sqrt(xl * yl) * options.frequency * 300);
        const displacementPerParticle = (options.maxHeight - options.minHeight) / iterations * 1000; // Heuristic from original

        function deposit(current_g, current_i, current_j, local_xl, particleDisp) {
            let ci = current_i;
            let cj = current_j;

            for (let k = 0; k < 8; k++) { // Check up to 8 neighbors to find a lower one, limited attempts
                const r = Math.floor(Math.random() * 8); // Pick a random neighbor index
                let ni = ci, nj = cj;
                // dx, dy for 8 directions
                const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
                const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

                ni += dx[r];
                nj += dy[r];

                if (ni >= 0 && ni < local_xl && nj >= 0 && nj < yl) { // Check bounds
                    const currentKey = cj * local_xl + ci;
                    const neighborKey = nj * local_xl + ni;
                    if (current_g[neighborKey] < current_g[currentKey]) {
                        ci = ni; // Move to lower neighbor
                        cj = nj;
                        k = -1; // Restart neighbor check from new position (original logic implies recursive drop)
                        continue;
                    }
                }
            }
            // Deposit particle at the point where it settled
            const finalKey = cj * local_xl + ci;
            current_g[finalKey] += particleDisp;
        }

        // Optimized random start point generation for deposition iterations
        let start_i = Math.floor(Math.random() * xl);
        let start_j = Math.floor(Math.random() * yl);
        let xDeviation = 0, yDeviation = 0;

        for (let k = 0; k < iterations; k++) {
            if (k % 1000 === 0) { // Occasionally reset deviation
                xDeviation = (Math.random() * 0.4 - 0.2) * xl; // Deviation in terms of # vertices
                yDeviation = (Math.random() * 0.4 - 0.2) * yl;
            }
            if (k % 100 === 0) { // Pick new general area for deposition
                const angle = Math.random() * Math.PI * 2;
                const radiusFactor = Math.random() * 0.5; // Max 50% of segment dimension
                start_i = Math.floor(xl * 0.5 + xDeviation + Math.cos(angle) * xl * radiusFactor);
                start_j = Math.floor(yl * 0.5 + yDeviation + Math.sin(angle) * yl * radiusFactor);
                start_i = Math.max(0, Math.min(xl - 1, start_i)); // Clamp to bounds
                start_j = Math.max(0, Math.min(yl - 1, start_j));
            }
            // Add slight random jitter to the exact deposition point for this particle
            let current_i = start_i + Math.floor(Math.random() * 5) - 2;
            let current_j = start_j + Math.floor(Math.random() * 5) - 2;
            current_i = Math.max(0, Math.min(xl - 1, current_i));
            current_j = Math.max(0, Math.min(yl - 1, current_j));

            deposit(g, current_i, current_j, xl, displacementPerParticle);
        }
    }

    static Perlin(g, options) {
        seedNoise(Math.random()); // Ensure noise is re-seeded for unique results per call if desired
        const range = (options.maxHeight - options.minHeight) * 0.5; // Perlin output is ~[-1, 1]
        const divisor = (Math.min(options.xSegments, options.ySegments) + 1) / options.frequency;
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;
        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                g[j * xl + i] += perlinNoise(i / divisor, j / divisor) * range;
            }
        }
    }

    static PerlinDiamond(g, options) {
        Terrain.MultiPass(g, options, [
            { method: Terrain.Perlin },
            { method: Terrain.DiamondSquare, amplitude: 0.75 },
            { method: (gPass, oPass) => Terrain.SmoothMedian(gPass, oPass) },
        ]);
    }

    static PerlinLayers(g, options) {
        Terrain.MultiPass(g, options, [
            { method: Terrain.Perlin, frequency: 1.25 },
            { method: Terrain.Perlin, amplitude: 0.05, frequency: 2.5 },
            { method: Terrain.Perlin, amplitude: 0.35, frequency: 5 },
            { method: Terrain.Perlin, amplitude: 0.15, frequency: 10 },
        ]);
    }

    static Simplex(g, options) {
        seedNoise(Math.random()); // Ensure noise is re-seeded
        const range = (options.maxHeight - options.minHeight) * 0.5; // Simplex output is ~[-1, 1]
        const divisor = (Math.min(options.xSegments, options.ySegments) + 1) * 2 / options.frequency; // Original scaling
        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;
        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                g[j * xl + i] += simplexNoise(i / divisor, j / divisor) * range;
            }
        }
    }

    static SimplexLayers(g, options) {
        Terrain.MultiPass(g, options, [
            { method: Terrain.Simplex, frequency: 1.25 },
            { method: Terrain.Simplex, amplitude: 0.5, frequency: 2.5 },
            { method: Terrain.Simplex, amplitude: 0.25, frequency: 5 },
            { method: Terrain.Simplex, amplitude: 0.125, frequency: 10 },
            { method: Terrain.Simplex, amplitude: 0.0625, frequency: 20 },
        ]);
    }

    static Value(g, options) {
        function WhiteNoisePass(gPass, opts, scale, segments, rangeToApply, data) {
            if (scale > segments || scale <= 0) return;
            const xlGeo = opts.xSegments + 1; // Geometry dimensions
            const ylGeo = opts.ySegments + 1;

            const inc = Math.floor(segments / scale);
            if (inc === 0) return; // Scale too high for segment count

            // Fill data with noise at `scale` resolution
            for (let r = 0; r <= segments; r += inc) { // row in noise data
                for (let c = 0; c <= segments; c += inc) { // col in noise data
                    data[r * (segments + 1) + c] = (Math.random() - 0.5) * 2 * rangeToApply; // Noise in [-rangeToApply, rangeToApply]
                }
            }

            // Interpolate from noise data to geometry vertices
            for (let j = 0; j < ylGeo; j++) { // y-vertex in geometry
                for (let i = 0; i < xlGeo; i++) { // x-vertex in geometry
                    // Corresponding position in the full 'segments' grid
                    const si = (i / opts.xSegments) * segments;
                    const sj = (j / opts.ySegments) * segments;

                    const x1 = Math.floor(si / inc) * inc;
                    const y1 = Math.floor(sj / inc) * inc;
                    const x2 = Math.min(x1 + inc, segments);
                    const y2 = Math.min(y1 + inc, segments);

                    const fx = (si - x1) / inc;
                    const fy = (sj - y1) / inc;

                    const v1 = data[y1 * (segments + 1) + x1];
                    const v2 = data[y1 * (segments + 1) + x2];
                    const v3 = data[y2 * (segments + 1) + x1];
                    const v4 = data[y2 * (segments + 1) + x2];

                    const i1 = lerp(v1, v2, fx);
                    const i2 = lerp(v3, v4, fx);
                    const interpolatedValue = lerp(i1, i2, fy);

                    gPass[j * xlGeo + i] += interpolatedValue;
                }
            }
        }
        const segments = THREE.MathUtils.ceilPowerOfTwo(Math.max(options.xSegments, options.ySegments) + 1);
        const data = new Float64Array((segments + 1) * (segments + 1)); // Temporary noise grid
        const baseRange = options.maxHeight - options.minHeight;

        for (let i = 2; i < 7; i++) { // Iterate through octaves
            const scale = Math.pow(2, i); // Resolution of noise for this octave
            const octaveRange = baseRange * Math.pow(2, 2.4 - i * 1.2); // Amplitude for this octave
            WhiteNoisePass(g, options, scale, segments, octaveRange, data);
        }
        // Value noise often requires clamping afterwards
        Terrain.Clamp(g, {
            maxHeight: options.maxHeight,
            minHeight: options.minHeight,
            stretch: true, // Stretch to full range after all octaves
            easing: options.easing
        });
    }

    static Weierstrass(g, options) {
        const range = (options.maxHeight - options.minHeight) * 0.5; // Weierstrass output can be large, scale
        const dir1 = Math.random() < 0.5 ? 1 : -1;
        const dir2 = Math.random() < 0.5 ? 1 : -1;
        // Random parameters for the Weierstrass function for variety
        const r11 = 0.5 + Math.random() * 1.0; // a
        const r12 = 3.0 + Math.random() * 4.0; // b (should be > 1)
        const r13 = (0.025 + Math.random() * 0.10) * options.frequency; // scaling for x input
        const r14 = -1.0 + Math.random() * 2.0; // phase/offset for x input

        const r21 = 0.5 + Math.random() * 1.0; // a for y-component
        const r22 = 3.0 + Math.random() * 4.0; // b for y-component
        const r23 = (0.025 + Math.random() * 0.10) * options.frequency; // scaling for y input
        const r24 = -1.0 + Math.random() * 2.0; // phase/offset for y input

        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;
        const numTerms = 10; // Number of terms in the Weierstrass sum

        for (let i = 0; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                let sum = 0;
                const xPos = i / xl; // Normalized position [0,1]
                const yPos = j / yl;

                for (let k = 0; k < numTerms; k++) {
                    const termX = Math.pow(r11, -k) * Math.cos(Math.pow(r12, k) * (xPos + r14 * yPos) * Math.PI * r13);
                    const termY = Math.pow(r21, -k) * Math.cos(Math.pow(r22, k) * (yPos + r24 * xPos) * Math.PI * r23);
                    // Original formula uses sum of cos(b^n * pi * x) / a^n.
                    // The provided one had exp(dir*x*x + dir*y*y) which is more like Gaussian blobs.
                    // Using the classic Weierstrass form:
                    sum += dir1 * termX + dir2 * termY;
                }
                g[j * xl + i] += sum * range;
            }
        }
        Terrain.Clamp(g, options); // Clamp after generation
    }

    // Materials and Scattering
    static generateBlendedMaterial(textures, material) {
        function glslifyNumber(n) {
            return n === (n | 0) ? n + '.0' : String(n);
        }

        let declare = '';
        let assign = '';
        const t0 = textures[0].texture; // Base texture
        const t0Repeat = t0.repeat;
        const t0Offset = t0.offset;

        for (let i = 0, l = textures.length; i < l; i++) {
            const texData = textures[i];
            texData.texture.wrapS = texData.texture.wrapT = THREE.RepeatWrapping;
            // texData.texture.needsUpdate = true; // Usually handled by Three.js if properties change

            declare += `uniform sampler2D texture_${i};\n`;
            if (i !== 0) { // For textures other than the base
                const v = texData.levels;
                const p = texData.glsl;
                const useLevels = typeof v !== 'undefined';
                const tiRepeat = texData.texture.repeat;
                const tiOffset = texData.texture.offset;

                let blendAmount;
                if (useLevels) {
                    const v0 = glslifyNumber(v[0]);
                    let v1 = glslifyNumber(v[1]);
                    let v2 = glslifyNumber(v[2]);
                    const v3 = glslifyNumber(v[3]);
                    // Ensure blend regions have non-zero width
                    if (parseFloat(v1) - parseFloat(v0) < 0.001 && parseFloat(v1) - parseFloat(v0) > -0.001) v1 = glslifyNumber(parseFloat(v0) + 0.001);
                    if (parseFloat(v3) - parseFloat(v2) < 0.001 && parseFloat(v3) - parseFloat(v2) > -0.001) v2 = glslifyNumber(parseFloat(v3) - 0.001);

                    blendAmount = `1.0 - smoothstep(${v0}, ${v1}, vPosition.z) + smoothstep(${v2}, ${v3}, vPosition.z)`;
                } else {
                    blendAmount = p;
                }
                assign += `
        color = mix(
            texture2D(texture_${i}, MyvUv * vec2(${glslifyNumber(tiRepeat.x)}, ${glslifyNumber(tiRepeat.y)}) + vec2(${glslifyNumber(tiOffset.x)}, ${glslifyNumber(tiOffset.y)})),
            color,
            clamp(${blendAmount}, 0.0, 1.0)
        );\n`;
            }
        }

        const fragBlend = `
    float slope = acos(clamp(dot(myNormal, vec3(0.0, 0.0, 1.0)), -1.0, 1.0));
    // diffuseColor = vec4(diffuse, opacity); // This is from Lambert, might vary for other materials
    vec4 color = texture2D(texture_0, MyvUv * vec2(${glslifyNumber(t0Repeat.x)}, ${glslifyNumber(t0Repeat.y)}) + vec2(${glslifyNumber(t0Offset.x)}, ${glslifyNumber(t0Offset.y)})); // base
    ${assign}
    // Instead of replacing diffuseColor directly, mix into it or use it as the map's result
    // For MeshStandardMaterial, this would affect 'reflectedLight.directDiffuse' or 'reflectedLight.indirectDiffuse'
    // For simplicity with MeshLambertMaterial, replacing diffuseColor.rgb is common.
    // A more general approach is to output to 'gl_FragColor' if no lighting, or affect material specific properties.
    // Let's assume lambert-like modification for now:
    diffuseColor.rgb = color.rgb; 
    // Or if you want this to be the final color regardless of lighting (like unlit):
    // gl_FragColor = color; return; 
`;

        const fragPars = `
    ${declare}
    varying vec2 MyvUv;
    varying vec3 vPosition;
    varying vec3 myNormal;
`;
        const mat = material || new THREE.MeshLambertMaterial(); // Default to Lambert

        mat.onBeforeCompile = function (shader) {
            // Patch vertexShader
            shader.vertexShader = shader.vertexShader.replace('#include <common>', `
                varying vec2 MyvUv;
                varying vec3 vPosition;
                varying vec3 myNormal;
                #include <common>
            `);
            shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `
                MyvUv = uv;
                #include <uv_vertex> 
                // Position and normal in world space are better for some effects, model space here
                vPosition = position; 
                myNormal = normal; 
            `);
            // For world space position/normal (if needed by GLSL expressions):
            // shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `
            //    #include <worldpos_vertex>
            //    vPosition = worldPosition.xyz; // Or (modelMatrix * vec4(position, 1.0)).xyz;
            //    myNormal = normalize(mat3(modelMatrix) * normal); // If normal attribute is in object space
            // `);


            // Patch fragmentShader
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
                ${fragPars}
                #include <common>
            `);

            // Find appropriate place to insert blending logic.
            // For Lambert: before light calculations, affecting diffuse color.
            // For Standard: more complex, usually inside <map_fragment> or before lighting.
            if (shader.fragmentShader.includes('#include <map_fragment>')) {
                shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', fragBlend);
            } else { // Fallback for simpler shaders, might need adjustment
                shader.fragmentShader = shader.fragmentShader.replace(
                    /vec4 diffuseColor = vec4\( diffuse, opacity \);/,
                    `vec4 diffuseColor = vec4( diffuse, opacity ); ${fragBlend}`
                );
            }


            // Add custom texture uniforms
            for (let i = 0, l = textures.length; i < l; i++) {
                shader.uniforms[`texture_${i}`] = { value: textures[i].texture };
            }
        };
        return mat;
    }

    static ScatterMeshes(geometry, options) {
        if (!options.mesh) {
            console.error('options.mesh is required for Terrain.ScatterMeshes');
            return null;
        }
        const scene = options.scene || new THREE.Object3D(); // Use provided scene or create new
        const defaultScatterOptions = {
            spread: 0.025,
            smoothSpread: 0,
            sizeVariance: 0.1,
            randomness: Math.random,
            maxSlope: 0.6283185307179586, // ~36 degrees
            maxTilt: Infinity,
            // w, h are implicitly options.xSegments, options.ySegments from the terrain options
        };
        const scatterOpt = { ...defaultScatterOptions, ...options };

        const spreadIsNumber = typeof scatterOpt.spread === 'number';
        let randomHeightmap, randomnessFunc;
        if (spreadIsNumber) {
            randomHeightmap = (typeof scatterOpt.randomness === 'function') ? scatterOpt.randomness() : scatterOpt.randomness;
            randomnessFunc = Array.isArray(randomHeightmap) ? (k) => randomHeightmap[k] : Math.random;
        }

        const nonIndexedGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
        const positions = nonIndexedGeometry.attributes.position.array;
        const vertex1 = new THREE.Vector3();
        const vertex2 = new THREE.Vector3();
        const vertex3 = new THREE.Vector3();
        const faceNormal = new THREE.Vector3();
        const upVector = scatterOpt.mesh.up.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.5 * Math.PI); // Terrain up is Z after rotation

        for (let i = 0; i < positions.length; i += 9) { // 3 vertices per face, 3 coords per vertex
            vertex1.fromArray(positions, i);
            vertex2.fromArray(positions, i + 3);
            vertex3.fromArray(positions, i + 6);
            THREE.Triangle.getNormal(vertex1, vertex2, vertex3, faceNormal);

            let place = false;
            const faceIndex = i / 9;
            if (spreadIsNumber) {
                const rv = randomnessFunc(faceIndex);
                if (rv < scatterOpt.spread) {
                    place = true;
                } else if (scatterOpt.smoothSpread > 0 && rv < scatterOpt.spread + scatterOpt.smoothSpread) {
                    const spreadRange = 1 / scatterOpt.smoothSpread;
                    place = Terrain.EaseInOut((rv - scatterOpt.spread) * spreadRange) * scatterOpt.spread > Math.random();
                }
            } else { // spread is a function
                place = scatterOpt.spread(vertex1, faceIndex, faceNormal, i); // Pass face normal and original index
            }

            if (place) {
                if (faceNormal.angleTo(upVector) > scatterOpt.maxSlope) {
                    continue;
                }
                const newMesh = scatterOpt.mesh.clone();
                newMesh.position.addVectors(vertex1, vertex2).add(vertex3).divideScalar(3); // Centroid of face

                if (scatterOpt.maxTilt > 0 && scatterOpt.maxTilt !== Infinity) {
                    const targetLookAt = newMesh.position.clone().add(faceNormal);
                    newMesh.lookAt(targetLookAt);
                    const tiltAngle = faceNormal.angleTo(upVector);
                    if (tiltAngle > scatterOpt.maxTilt) {
                        const ratio = scatterOpt.maxTilt / tiltAngle;
                        // This quaternion slerp is more robust for partial tilting
                        const currentQuaternion = newMesh.quaternion.clone();
                        newMesh.up = upVector.clone(); // Align to terrain's up before partial tilt
                        newMesh.lookAt(newMesh.position.clone().add(upVector)); // Look "straight up" from terrain perspective
                        const upQuaternion = newMesh.quaternion.clone();
                        newMesh.quaternion.slerpQuaternions(upQuaternion, currentQuaternion, ratio);
                    }
                } else if (scatterOpt.maxTilt === Infinity) { // Align perfectly with normal
                    const targetLookAt = newMesh.position.clone().add(faceNormal);
                    newMesh.lookAt(targetLookAt);
                }
                // else if maxTilt is 0, mesh remains aligned with its default up (usually world Y)

                // Common rotation adjustments after lookAt
                newMesh.rotation.x += 0.5 * Math.PI; // Often needed if original mesh is Y-up and terrain is XZ plane
                newMesh.rotateY(Math.random() * 2 * Math.PI); // Random rotation around its new local Y

                if (scatterOpt.sizeVariance > 0) {
                    const variance = (Math.random() * 2 - 1) * scatterOpt.sizeVariance; // From -sizeVariance to +sizeVariance
                    newMesh.scale.multiplyScalar(1 + variance);
                }
                newMesh.updateMatrix();
                scene.add(newMesh);
            }
        }
        return scene;
    }

    static ScatterHelper(method, terrainOptions, skip = 1, threshold = 0.25) {
        const clonedOptions = { ...terrainOptions }; // Use options from the main terrain for consistency
        // For scatter helper, we usually want a normalized probability map [0,1]
        clonedOptions.maxHeight = 1;
        clonedOptions.minHeight = 0;
        clonedOptions.stretch = true; // Ensure it uses the full 0-1 range
        // Scatter helper often benefits from higher detail than the visual terrain mesh
        // but must match segment count if the output array is indexed directly by face index later.
        // The original example multiplied segments by 2, but this makes direct face indexing tricky.
        // For now, let's assume it generates a map for the *current* terrain resolution.
        // clonedOptions.xSegments *= 2;
        // clonedOptions.ySegments *= 2; 

        const heightmap = Terrain.heightmapArray(method, clonedOptions);

        // Process the heightmap to be a probability map (0=place, 1=don't place)
        // This interpretation comes from the original THREE.Terrain.js
        for (let i = 0, l = heightmap.length; i < l; i++) {
            // Heightmap values are [0,1]. Lower values = higher probability of placement (original interpretation).
            // If value is below threshold, it's a candidate.
            // And skip faces.
            if (i % skip !== 0 || heightmap[i] > threshold) { // If skip or random > threshold (original was Math.random() > threshold for direct probability)
                // Assuming heightmap[i] IS the probability, then if heightmap[i] > threshold, DON'T place.
                // Let's follow original: lower heightmap value (e.g. from Perlin) means more likely to place.
                // So if heightmap[i] (which is a terrain height 0-1) is low, it's a "valley" for placement.
                // The `threshold` parameter here becomes a height threshold.
                heightmap[i] = 1; // Don't place
            } else {
                heightmap[i] = 0; // Place
            }
        }
        return function () { // Return a function that returns the map
            return heightmap;
        };
    }

    // Influences
    static Influence(g, options, f, xPercent, yPercent, radius, height, blendMode, falloffEase) {
        f = f || Terrain.Influences.Hill;
        xPercent = typeof xPercent === 'undefined' ? 0.5 : xPercent;
        yPercent = typeof yPercent === 'undefined' ? 0.5 : yPercent;
        radius = typeof radius === 'undefined' ? 64 : radius;
        height = typeof height === 'undefined' ? 64 : height;
        blendMode = typeof blendMode === 'undefined' ? THREE.NormalBlending : blendMode;
        falloffEase = falloffEase || Terrain.EaseIn;

        const xl = options.xSegments + 1;
        const yl = options.ySegments + 1;

        // Convert percentage location to vertex location and radius to vertex units
        const featureCenterX_vertex = xPercent * options.xSegments; // Center X in terms of vertex index
        const featureCenterY_vertex = yPercent * options.ySegments; // Center Y in terms of vertex index

        const radiusX_world = radius;
        const radiusY_world = radius; // Assuming circular in world units, could be radius.x, radius.y

        const segmentWidth = options.xSize / options.xSegments;
        const segmentHeight = options.ySize / options.ySegments;

        // Iterate over all vertices in the grid
        for (let j_vert = 0; j_vert < yl; j_vert++) { // y-vertex index
            for (let i_vert = 0; i_vert < xl; i_vert++) { // x-vertex index
                // World coordinates of the current vertex
                const currentVertexX_world = i_vert * segmentWidth;
                const currentVertexY_world = j_vert * segmentHeight;
                // World coordinates of the feature center
                const featureCenterX_world = xPercent * options.xSize;
                const featureCenterY_world = yPercent * options.ySize;

                // Distance from current vertex to feature center in world units
                const dx_world = currentVertexX_world - featureCenterX_world;
                const dy_world = currentVertexY_world - featureCenterY_world;
                const dist_world = Math.sqrt(dx_world * dx_world + dy_world * dy_world);

                if (dist_world < radius) { // If vertex is within feature's radius
                    const k = j_vert * xl + i_vert; // 1D index of the vertex

                    // Normalized distance (0 at center, 1 at edge of radius)
                    const normalized_dist_radial = dist_world / radius;
                    // Normalized distances along axes (useful for some feature functions)
                    const normalized_dist_x = dx_world / radiusX_world;
                    const normalized_dist_y = dy_world / radiusY_world;

                    // Calculate displacement from feature shape, scale by height, and apply falloff
                    const displacement = f(normalized_dist_radial, normalized_dist_x, normalized_dist_y) * height * (1 - falloffEase(normalized_dist_radial, normalized_dist_x, normalized_dist_y));

                    if (typeof g[k] === 'undefined') continue;

                    // Apply blending mode
                    if (blendMode === THREE.AdditiveBlending) g[k] += displacement;
                    else if (blendMode === THREE.SubtractiveBlending) g[k] -= displacement;
                    else if (blendMode === THREE.MultiplyBlending) g[k] *= displacement; // Careful: if g[k] or disp is 0
                    else if (blendMode === THREE.NoBlending) g[k] = displacement;
                    else if (blendMode === THREE.NormalBlending) {
                        // Normal blending: dstColor = srcColor * srcAlpha + dstColor * (1 - srcAlpha)
                        // Here, displacement is like srcColor, falloff can be srcAlpha
                        const srcAlpha = (1 - falloffEase(normalized_dist_radial, normalized_dist_x, normalized_dist_y));
                        g[k] = displacement * srcAlpha + g[k] * (1 - srcAlpha); // This is one interpretation.
                        // Original was: g[k]  = falloffEase(fdr, fdxr, fdyr) * g[k] + d; which is more like a lerp
                        // Let's stick to original interpretation:
                        // g[k] = falloffEase(normalized_dist_radial) * g[k] + displacement; // This seems off.
                        // Original: d = f(...) * h * (1 - e(...)); ... g[k] = e(...) * g[k] + d
                        // Let d_raw = f(...) * h
                        // Let falloff_factor = (1 - falloffEase(...))
                        // d_final = d_raw * falloff_factor
                        // new_g[k] = (1-falloff_factor) * g[k] + d_final // This is Lerp(g[k], d_raw, falloff_factor)
                        // So the original interpretation was:
                        // current_falloff = falloffEase(normalized_dist_radial, normalized_dist_x, normalized_dist_y)
                        // raw_displacement_from_feature = f(normalized_dist_radial, normalized_dist_x, normalized_dist_y) * height
                        // g[k] = current_falloff * g[k] + (1 - current_falloff) * raw_displacement_from_feature; // Lerp
                        // This is equivalent to:
                        g[k] = lerp(f(normalized_dist_radial, normalized_dist_x, normalized_dist_y) * height, g[k], falloffEase(normalized_dist_radial, normalized_dist_x, normalized_dist_y));

                    } else if (typeof blendMode === 'function') {
                        g[k] = blendMode(g[k], displacement, normalized_dist_radial, normalized_dist_x, normalized_dist_y);
                    }
                }
            }
        }
    }


    static Influences = {
        Mesa: function (r) { return 1.25 * Math.min(0.8, Math.exp(-(r * r * 4))); }, // Adjusted for r in [0,1]
        Hole: function (r) { return -Terrain.Influences.Mesa(r); },
        // Hill: radial distance `r` is from 0 (center) to 1 (edge of influence)
        Hill: function (r) { return (1 - r * r) * (1 - r * r); }, // Smooth cosine-like hill: (cos(r * PI/2))^2
        Valley: function (r) { return -Terrain.Influences.Hill(r); },
        Dome: function (r) { return (1 - r * r); }, // Simple parabola for dome
        Flat: function () { return 0; },
        Volcano: function (r) { // r from 0 to 1
            const rim = 0.5; // Position of the rim
            const craterDepth = 0.8;
            const outerSlope = Math.exp(-Math.pow(r / 0.8, 2) * 5); // Outer slope shape
            const innerSlope = 1 - Math.exp(-Math.pow(Math.abs(r - rim) / (rim * 0.5), 2) * 8); // Inner crater shape
            if (r < rim) {
                return outerSlope * (1 - craterDepth * innerSlope);
            }
            return outerSlope;
        }
    };
}

export { Terrain };