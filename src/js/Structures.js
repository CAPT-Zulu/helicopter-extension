import { BoxGeometry, MeshBasicMaterial, CylinderGeometry, Mesh, Group } from 'three';

class StructureFactory {
    constructor() {
        this.structureTypes = [
            this.createSkyscraper,
            this.createTunnel,
            this.createWireframeCubeGrid,
            this.createBridge,
                this.createCoolerTower
        ];
    }

    getRandomStructure() {
        const idx = Math.floor(Math.random() * this.structureTypes.length);
        return this.structureTypes[idx].call(this);
    }

    createSkyscraper() {
        const geometry = new BoxGeometry(5, 200, 5);
        const material = new MeshBasicMaterial({ color: 0x8888ff, wireframe: false });
        return new Mesh(geometry, material);
    }

    createTunnel() {
        const geometry = new CylinderGeometry(8, 8, 30, 32, 1, true);
        const material = new MeshBasicMaterial({ color: 0xaaaaaa, wireframe: false, side: DoubleSide });
        return new Mesh(geometry, material);
    }

    createWireframeCubeGrid() {
        const group = new Group();
        const size = 3, spacing = 12;
        const material = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const geometry = new BoxGeometry(size, size, size);
                    const mesh = new Mesh(geometry, material);
                    mesh.position.set(x * spacing, y * spacing, z * spacing);
                    group.add(mesh);
                }
            }
        }
        return group;
    }

    createBridge() {
        const group = new Group();
        // Deck
        const deckGeometry = new BoxGeometry(30, 2, 6);
        const deckMaterial = new MeshBasicMaterial({ color: 0x8B4513 });
        const deck = new Mesh(deckGeometry, deckMaterial);
        group.add(deck);

        // Pillars
        const pillarGeometry = new BoxGeometry(2, 10, 2);
        const pillarMaterial = new MeshBasicMaterial({ color: 0x555555 });
        const pillar1 = new Mesh(pillarGeometry, pillarMaterial);
        pillar1.position.set(-10, -6, 0);
        const pillar2 = new Mesh(pillarGeometry, pillarMaterial);
        pillar2.position.set(10, -6, 0);
        group.add(pillar1, pillar2);

        return group;
    }

    createCoolerTower() {
        const geometry = new CylinderGeometry(6, 12, 20, 32, 1, false);
        const material = new MeshBasicMaterial({ color: 0xcccccc, wireframe: false });
        return new Mesh(geometry, material);
    }
}

export default StructureFactory;