// Perlin noise functions based on "https://github.com/joeiddon/perlin"
function rand_vect() {
    let theta = Math.random() * Math.PI * 2;
    return {x: Math.cos(theta), y: Math.sin(theta)};
}
function dot_product_grid(x, y, xi, yi) {
    let g = rand_vect();
    let d = { x: x - xi, y: y - yi };
    return g.x * d.x + g.y * d.y;
}
function smoothstep(x) {
    return 6*x**5 - 15*x**4 + 10*x**3;
}
function interp(x, a, b) {
    return a + smoothstep(x) * (b - a);
}
function perlin2D(x, y) {
    let xi = Math.floor(x);
    let yi = Math.floor(y);
    
    let tl = dot_product_grid(x, y, xi, yi);
    let tr = dot_product_grid(x, y, xi + 1, yi);
    let bl = dot_product_grid(x, y, xi, yi + 1);
    let br = dot_product_grid(x, y, xi + 1, yi + 1);
    let xt = interp(x - xi, tl, tr);
    let xb = interp(x - xi, bl, br);
    let v = interp(y - yi, xt, xb);
    return v;
}

// Perlin noise generator
function generatePerlinNoise(width, height, scale) {
    const noise = [];
    for (let y = 0; y < height; y++) {
        noise[y] = [];
        for (let x = 0; x < width; x++) {
            const nx = x / scale;
            const ny = y / scale;
            noise[y][x] = perlin2D(nx, ny);
        }
    }
    return noise;
}

export { perlin2D };