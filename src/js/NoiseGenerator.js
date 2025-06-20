import { createNoise2D } from 'simplex-noise';

export default class NoiseGenerator {
    constructor(seed) {
        // Create a 2D simplex noise instance with the seed
        this.simplexNoise = createNoise2D(seed);
        this.evaluateNoise = (x, y) => this.simplexNoise(x, y);
    }

    /**
     * Generates a 2D height data array using Fractional Brownian Motion (FBM).
     * @param {object} config - Configuration object.
     * @param {number} config.width - Width of the noise map.
     * @param {number} config.height - Height of the noise map.
     * @param {number} config.scale - Scale of the noise (lower is more zoomed in).
     * @param {number} config.octaves - Number of noise layers.
     * @param {number} config.persistence - How much detail is added or removed at each octave (0-1).
     * @param {number} config.lacunarity - How much detail is added or removed at each octave (typically > 1).
     * @param {number} [config.offsetX=0] - X offset for the noise field.
     * @param {number} [config.offsetY=0] - Y offset for the noise field.
     * @returns {object} { data: Float32Array, width: number, height: number } - Normalized height data (0-1).
     */
    generateHeightData({
        width,
        height,
        scale = 500.0,
        octaves = 6,
        persistence = 0.5,
        lacunarity = 2.0,
        offsetX = 0,
        offsetY = 0
    }) {
        const data = new Float32Array(width * height);
        let minNoiseHeight = Infinity;
        let maxNoiseHeight = -Infinity;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let amplitude = 1;
                let frequency = 1;
                let noiseHeight = 0;

                for (let i = 0; i < octaves; i++) {
                    const sampleX = (x + offsetX) / scale * frequency;
                    const sampleY = (y + offsetY) / scale * frequency;
                    
                    const perlinValue = this.evaluateNoise(sampleX, sampleY); // Output: -1 to 1
                    noiseHeight += perlinValue * amplitude;

                    amplitude *= persistence;
                    frequency *= lacunarity;
                }

                if (noiseHeight > maxNoiseHeight) maxNoiseHeight = noiseHeight;
                if (noiseHeight < minNoiseHeight) minNoiseHeight = noiseHeight;
                
                data[y * width + x] = noiseHeight;
            }
        }

        // Normalize the data to 0-1 range
        for (let i = 0; i < data.length; i++) {
            if (maxNoiseHeight === minNoiseHeight) { // Prevent division by zero if noise is flat
                 data[i] = 0.5; // Or some other default
            } else {
                data[i] = (data[i] - minNoiseHeight) / (maxNoiseHeight - minNoiseHeight);
            }
        }
        
        return { data, width, height };
    }

    // Debug, save the generated noise data to a PNG file
    saveDataToPNG(data, width, height, filename = 'noise_map.png') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);

        for (let i = 0; i < data.length; i++) {
            const _Rvalue = Math.floor(data[i] * 255);
            imageData.data[i * 4] =_Rvalue;     // R
            imageData.data[i * 4 + 1] =_Rvalue; // G
            imageData.data[i * 4 + 2] =_Rvalue; // B
            imageData.data[i * 4 + 3] = 255;    // A
        }
        ctx.putImageData(imageData, 0, 0);

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link); // Required for Firefox
        link.click();
        document.body.removeChild(link);
    }
}