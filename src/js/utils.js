// Diamond-Square Algorithm based from https://github.com/IceCreamYou/THREE.Terrain
function generateDiamondSquare(map, segmentNumber, minHeight, maxHeight) {
    // Set the segment length to the smallest power of 2 that is greater than
    // the number of vertices in either dimension of the plane
    // var segments = THREE.Math.ceilPowerOfTwo(segmentNumber + 1);
    var segments = Math.pow(2, Math.ceil(Math.log2(segmentNumber + 1)));

    // Initialize heightMap
    var size = segments + 1,
        heightMap = [],
        smoothing = (maxHeight - minHeight),
        i,
        j,
        xl = segmentNumber + 1,
        yl = segmentNumber + 1;
    for (i = 0; i <= segments; i++) {
        heightMap[i] = new Float64Array(segments + 1);
    }

    // Generate heightMap
    for (var l = segments; l >= 2; l /= 2) {
        var half = Math.round(l * 0.5),
            whole = Math.round(l),
            x,
            y,
            avg,
            d,
            e;
        smoothing /= 2;
        // Square
        for (x = 0; x < segments; x += whole) {
            for (y = 0; y < segments; y += whole) {
                d = Math.random() * smoothing * 2 - smoothing;
                avg = heightMap[x][y] +
                    heightMap[x + whole][y] +
                    heightMap[x][y + whole] +
                    heightMap[x + whole][y + whole];
                avg *= 0.25;
                heightMap[x + half][y + half] = avg + d;
            }
        }
        // Diamond
        for (x = 0; x < segments; x += half) {
            for (y = (x + half) % l; y < segments; y += l) {
                d = Math.random() * smoothing * 2 - smoothing;
                avg = heightMap[(x - half + size) % size][y] +
                    heightMap[(x + half) % size][y] +
                    heightMap[x][(y + half) % size] +
                    heightMap[x][(y - half + size) % size];
                avg *= 0.25;
                avg += d;
                heightMap[x][y] = avg;
                if (x === 0) heightMap[segments][y] = avg;
                if (y === 0) heightMap[x][segments] = avg;
            }
        }
    }

    // Apply heightMap
    for (i = 0; i < xl; i++) {
        for (j = 0; j < yl; j++) {
            map[j * xl + i] += heightMap[i][j];
        }
    }
}

export { generateDiamondSquare };