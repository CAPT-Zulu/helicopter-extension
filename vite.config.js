import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'src/js/index.js'),
                background: resolve(__dirname, 'src/js/background.js'),
            },
            output: {
                entryFileNames: 'js/[name].js',
                chunkFileNames: 'js/[name]-[hash].js',
                assetFileNames: ({ name }) => {
                    if (/\.css$/.test(name ?? '')) return 'index.css';
                    return '[name][extname]';
                },
                dir: 'dist',
                manualChunks: {
                    three: ['three']
                }
            },
        },
        outDir: 'dist',
        minify: true,
        target: 'esnext',
        emptyOutDir: true,
        chunkSizeWarningLimit: 600,
    },
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'src/index.html', dest: '.' },
                { src: 'src/index.css', dest: '.' },
                { src: 'src/manifest.json', dest: '.' },
                { src: 'src/icons/*', dest: 'icons' },
                { src: 'src/textures/*', dest: 'textures' },
            ],
        }),
    ],
});
