// Diamond-Square Algorithm based from https://github.com/IceCreamYou/THREE.Terrain
function generateNoise(map, segmentNumber, minHeight, maxHeight) {
    // Set the segment length to the smallest power of 2 that is greater than
    // the number of vertices in either dimension of the plane
    var segments = Math.pow(2, Math.ceil(Math.log2(segmentNumber + 1)));

    // Initialize heightMap
    var size = segments + 1,
        heightMap = [],
        smoothingRange = (maxHeight - minHeight), // Renamed from 'smoothing' to avoid confusion
        i,
        j,
        xl = segmentNumber + 1,
        yl = segmentNumber + 1;
    for (i = 0; i <= segments; i++) {
        heightMap[i] = new Float64Array(segments + 1);
    }

    // Generate heightMap
    let currentSmoothing = smoothingRange;
    for (var l = segments; l >= 2; l /= 2) {
        var half = Math.round(l * 0.5),
            whole = Math.round(l),
            x,
            y,
            avg,
            d;
        // Removed 'e' as it was unused
        currentSmoothing /= 2;
        // Square
        for (x = 0; x < segments; x += whole) {
            for (y = 0; y < segments; y += whole) {
                d = Math.random() * currentSmoothing * 2 - currentSmoothing;
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
                d = Math.random() * currentSmoothing * 2 - currentSmoothing;
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

    // Smoothing pass
    const smoothingIterations = 3;
    for (let iter = 0; iter < smoothingIterations; iter++) {
        const tempSmoothedHeightMap = [];
        for (let r = 0; r <= segments; r++) {
            // Initialize rows for the temporary smoothed map
            tempSmoothedHeightMap[r] = new Float64Array(segments + 1);
        }

        // Assuming heightMap is [columnIndex][rowIndex]
        for (let c = 0; c <= segments; c++) { // c for column (x-axis)
            for (let r = 0; r <= segments; r++) { // r for row (y-axis)
                let sumOfHeights = 0;
                let numNeighbors = 0;

                // Iterate over a 3x3 window (center + 8 neighbors)
                for (let dc = -1; dc <= 1; dc++) { // delta column
                    for (let dr = -1; dr <= 1; dr++) { // delta row
                        const nc = c + dc; // neighbor column
                        const nr = r + dr; // neighbor row

                        // Check bounds
                        if (nc >= 0 && nc <= segments && nr >= 0 && nr <= segments) {
                            sumOfHeights += heightMap[nc][nr];
                            numNeighbors++;
                        }
                    }
                }
                if (numNeighbors > 0) {
                    tempSmoothedHeightMap[c][r] = sumOfHeights / numNeighbors;
                } else {
                    // This case should ideally not be hit if the center point is always included
                    tempSmoothedHeightMap[c][r] = heightMap[c][r];
                }
            }
        }
        // Copy smoothed values back to heightMap for the next iteration or final use
        for (let c = 0; c <= segments; c++) {
            for (let r = 0; r <= segments; r++) {
                heightMap[c][r] = tempSmoothedHeightMap[c][r];
            }
        }
    }

    // Apply heightMap
    for (i = 0; i < xl; i++) { // i is columnIndex
        for (j = 0; j < yl; j++) { // j is rowIndex
            map[j * xl + i] += heightMap[i][j];
        }
    }
}

export { generateNoise };