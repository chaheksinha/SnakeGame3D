import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TextureFactory } from './TextureFactory.js';
import { DayNightCycle } from './DayNightCycle.js';
import { VoxelCloudSystem } from './VoxelCloudSystem.js';
import { FirefliesSystem } from './FirefliesSystem.js';
import { AmbientDustSystem } from './AmbientDustSystem.js';

export class Engine {
    constructor(container) {
        this.container = container;
        this.wallBlocks = [];
        
        // 1. Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x78B9E2);
        this.scene.fog = new THREE.Fog(0x78B9E2, 80, 190);
        
        // 2. Optimized 4K Renderer (DPR capped at 1.5 for ultra-smooth 60 FPS)
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        this.renderer.setPixelRatio(dpr);
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);
        
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        
        // High-Quality Shadow Maps & Color Management
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        
        this.container.appendChild(this.renderer.domElement);
        
        // 3. Camera
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 250);
        
        // 4. Lighting & Day-Night Cycle
        this.setupLighting();
        this.dayNightCycle = new DayNightCycle(this.scene, this.sunLight, this.fillLight);
        
        // 5. Environment & FX Systems
        this.fireflies = new FirefliesSystem(this.scene);
        this.setupEnvironment();
        this.voxelClouds = new VoxelCloudSystem(this.scene);
        this.ambientDust = new AmbientDustSystem(this.scene);
        
        // 6. In-Scene 3D Speed Streaks
        this.setupSpeedStreaks();
        
        // 7. Dynamic Fast Environment Map for Reflections
        this.envData = new Uint8Array(4 * 4 * 4); // 4x4 RGBA
        this.envTexture = new THREE.DataTexture(this.envData, 4, 4, THREE.RGBAFormat);
        this.envTexture.colorSpace = THREE.SRGBColorSpace;
        this.envTexture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = this.envTexture;

        // 8. Post-Processing
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // Handles sRGB and toneMapping from renderer automatically
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
        
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }
    
    setupSpeedStreaks() {
        this.speedStreakGroup = new THREE.Group();
        this.speedStreaks = [];
        const lineGeo = new THREE.BoxGeometry(0.08, 0.08, 3.5);
        const lineMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.75
        });
        
        const numStreaks = 45;
        for (let i = 0; i < numStreaks; i++) {
            const streak = new THREE.Mesh(lineGeo, lineMat);
            streak.position.set(
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 40
            );
            this.speedStreakGroup.add(streak);
            this.speedStreaks.push({
                mesh: streak,
                speed: 40 + Math.random() * 30
            });
        }
        
        this.speedStreakGroup.visible = false;
        this.scene.add(this.speedStreakGroup);
    }
    
    setupLighting() {
        this.ambientLight = new THREE.AmbientLight(0xE8DCC8, 0.45);
        this.scene.add(this.ambientLight);
        
        // Optimized Shadow Camera Bounds
        this.sunLight = new THREE.DirectionalLight(0xFFF0D4, 1.6);
        this.sunLight.position.set(45, 65, 25);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 5;
        this.sunLight.shadow.camera.far = 160;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.sunLight.shadow.bias = -0.0005;
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);
        
        this.fillLight = new THREE.DirectionalLight(0xB0D4F1, 0.4);
        this.fillLight.position.set(-40, 30, -20);
        this.scene.add(this.fillLight); // FIXED: was fillLight instead of this.fillLight
    }
    
    setupEnvironment() {
        // === GROUND ===
        const borderGeo = new THREE.PlaneGeometry(164, 164);
        const borderMat = new THREE.MeshLambertMaterial({ color: 0x3D2B1F });
        const borderPlane = new THREE.Mesh(borderGeo, borderMat);
        borderPlane.rotation.x = -Math.PI / 2;
        borderPlane.position.y = -0.05;
        borderPlane.receiveShadow = true;
        borderPlane.matrixAutoUpdate = false;
        borderPlane.updateMatrix();
        this.scene.add(borderPlane);
        
        const floorGeo = new THREE.PlaneGeometry(156, 156);
        const grassTex = TextureFactory.grassTop();
        grassTex.wrapS = THREE.RepeatWrapping;
        grassTex.wrapT = THREE.RepeatWrapping;
        grassTex.repeat.set(78, 78);
        const floorMat = new THREE.MeshLambertMaterial({ map: grassTex });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        floor.matrixAutoUpdate = false;
        floor.updateMatrix();
        this.scene.add(floor);
        
        // === INSTANCED GROUND DETAILS (Grass Tufts & Flowers) ===
        this.buildInstancedGroundDetails();

        // === BORDER WALLS (InstancedMesh) ===
        this.buildWalls();
        
        // === TREES ===
        this.buildTrees();
    }

    buildInstancedGroundDetails() {
        const dummy = new THREE.Object3D();

        // 1. Instanced Grass Tufts (70 tufts x 4 blades = 280 blades -> 1 InstancedMesh!)
        const bladeGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
        const grassMat = new THREE.MeshLambertMaterial({ color: 0x5B8C31 });
        const numTufts = 70;
        const bladesPerTuft = 4;
        const totalBlades = numTufts * bladesPerTuft;

        const tuftMesh = new THREE.InstancedMesh(bladeGeo, grassMat, totalBlades);
        let bIdx = 0;
        for (let i = 0; i < numTufts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 70;
            const tx = Math.cos(angle) * dist;
            const tz = Math.sin(angle) * dist;

            for (let b = 0; b < bladesPerTuft; b++) {
                dummy.position.set(
                    tx + (Math.random() - 0.5) * 0.3,
                    0.175,
                    tz + (Math.random() - 0.5) * 0.3
                );
                dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
                dummy.updateMatrix();
                tuftMesh.setMatrixAt(bIdx++, dummy.matrix);
            }
        }
        tuftMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(tuftMesh);

        // 2. Instanced Flowers (35 flowers -> 2 InstancedMeshes)
        const stemGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
        const petalGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const stemMat = new THREE.MeshLambertMaterial({ color: 0x3D6920 });
        const redPetalMat = new THREE.MeshLambertMaterial({ color: 0xE74C3C });
        const yellowPetalMat = new THREE.MeshLambertMaterial({ color: 0xF1C40F });

        const numFlowers = 35;
        const stemMesh = new THREE.InstancedMesh(stemGeo, stemMat, numFlowers);
        const redPetalMesh = new THREE.InstancedMesh(petalGeo, redPetalMat, numFlowers * 4);
        const yellowPetalMesh = new THREE.InstancedMesh(petalGeo, yellowPetalMat, numFlowers * 4);

        let redPIdx = 0;
        let yellowPIdx = 0;

        for (let i = 0; i < numFlowers; i++) {
            const isRed = Math.random() < 0.5;
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 68;
            const fx = Math.cos(angle) * dist;
            const fz = Math.sin(angle) * dist;

            // Stem
            dummy.position.set(fx, 0.175, fz);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            stemMesh.setMatrixAt(i, dummy.matrix);

            // 4 Petals
            const offsets = [[-0.1, 0.38, 0], [0.1, 0.38, 0], [0, 0.38, -0.1], [0, 0.38, 0.1]];
            offsets.forEach(([px, py, pz]) => {
                dummy.position.set(fx + px, py, fz + pz);
                dummy.updateMatrix();
                if (isRed) {
                    redPetalMesh.setMatrixAt(redPIdx++, dummy.matrix);
                } else {
                    yellowPetalMesh.setMatrixAt(yellowPIdx++, dummy.matrix);
                }
            });
        }

        stemMesh.instanceMatrix.needsUpdate = true;
        redPetalMesh.instanceMatrix.needsUpdate = true;
        yellowPetalMesh.instanceMatrix.needsUpdate = true;

        this.scene.add(stemMesh);
        this.scene.add(redPetalMesh);
        this.scene.add(yellowPetalMesh);

        // 3. Instanced Pebbles (250 pebbles)
        const pebbleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.12);
        const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, metalness: 0.1 });
        const numPebbles = 250;
        const pebbleMesh = new THREE.InstancedMesh(pebbleGeo, pebbleMat, numPebbles);
        pebbleMesh.receiveShadow = true;
        
        for (let i = 0; i < numPebbles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 72;
            const px = Math.cos(angle) * dist;
            const pz = Math.sin(angle) * dist;
            
            dummy.position.set(px, 0.05, pz);
            dummy.rotation.set(0, Math.random() * Math.PI, 0);
            const scale = 0.5 + Math.random() * 0.8;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            pebbleMesh.setMatrixAt(i, dummy.matrix);
        }
        pebbleMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(pebbleMesh);
    }
    
    buildWalls() {
        const radius = 78;
        const stoneTex = TextureFactory.stone();
        const stoneMat = new THREE.MeshLambertMaterial({ map: stoneTex });
        const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
        
        const positions = [];
        for (let i = -radius; i <= radius; i += 2) {
            positions.push([i, 1, radius]);
            positions.push([i, 3, radius]);
            positions.push([i, 1, -radius]);
            positions.push([i, 3, -radius]);
            if (i > -radius && i < radius) {
                positions.push([radius, 1, i]);
                positions.push([radius, 3, i]);
                positions.push([-radius, 1, i]);
                positions.push([-radius, 3, i]);
            }
        }
        
        const corners = [[-radius, radius], [radius, radius], [-radius, -radius], [radius, -radius]];
        corners.forEach(([cx, cz]) => {
            positions.push([cx, 5, cz]);
            positions.push([cx, 7, cz]);
        });
        
        const wallMesh = new THREE.InstancedMesh(cubeGeo, stoneMat, positions.length);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        
        const dummy = new THREE.Object3D();
        positions.forEach(([x, y, z], idx) => {
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            wallMesh.setMatrixAt(idx, dummy.matrix);
            this.wallBlocks.push(new THREE.Vector3(x, y, z));
        });
        wallMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(wallMesh);
    }
    
    buildTrees() {
        const woodTex = TextureFactory.wood();
        const woodMat = new THREE.MeshLambertMaterial({ map: woodTex });
        const leavesTex = TextureFactory.leaves();
        const leavesMat = new THREE.MeshLambertMaterial({ map: leavesTex });

        const birchBarkMat = new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
        const birchLeavesMat = new THREE.MeshLambertMaterial({ map: leavesTex, color: 0x99FF66 });

        const trunkGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
        const leafGeo = new THREE.BoxGeometry(2, 2, 2);
        
        const numTrees = 16;
        for (let i = 0; i < numTrees; i++) {
            const isBirch = Math.random() < 0.35;
            const angle = (i / numTrees) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const dist = 84 + Math.random() * 20;
            const tx = Math.cos(angle) * dist;
            const tz = Math.sin(angle) * dist;
            const trunkHeight = 3 + Math.floor(Math.random() * 2);
            
            const currentTrunkMat = isBirch ? birchBarkMat : woodMat;
            const currentLeafMat = isBirch ? birchLeavesMat : leavesMat;

            // Trunk
            for (let j = 0; j < trunkHeight; j++) {
                const trunk = new THREE.Mesh(trunkGeo, currentTrunkMat);
                trunk.position.set(tx, 1 + j * 2, tz);
                trunk.castShadow = true;
                trunk.receiveShadow = true;
                trunk.matrixAutoUpdate = false;
                trunk.updateMatrix();
                this.scene.add(trunk);
            }
            
            // Canopy Layer
            const leafBaseY = 1 + trunkHeight * 2;
            for (let lx = -2; lx <= 2; lx += 2) {
                for (let lz = -2; lz <= 2; lz += 2) {
                    if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && Math.random() < 0.4) continue;
                    const leaf = new THREE.Mesh(leafGeo, currentLeafMat);
                    leaf.position.set(tx + lx, leafBaseY, tz + lz);
                    leaf.castShadow = true;
                    leaf.receiveShadow = true;
                    leaf.matrixAutoUpdate = false;
                    leaf.updateMatrix();
                    this.scene.add(leaf);
                }
            }
            // Top Canopy Layer
            for (let lx = -1; lx <= 1; lx += 2) {
                for (let lz = -1; lz <= 1; lz += 2) {
                    const leaf = new THREE.Mesh(leafGeo, currentLeafMat);
                    leaf.position.set(tx + lx, leafBaseY + 2, tz + lz);
                    leaf.castShadow = true;
                    leaf.receiveShadow = true;
                    leaf.matrixAutoUpdate = false;
                    leaf.updateMatrix();
                    this.scene.add(leaf);
                }
            }
        }
    }
    
    update(time, delta, isBoosting = false) {
        // 1. Update Dynamic Day & Night Cycle
        if (this.dayNightCycle) {
            const camPos = this.camera ? this.camera.position : null;
            this.dayNightCycle.update(delta, camPos);
            
            // Fast Dynamic Environment Reflection based on sky color
            if (this.envTexture && this.envData) {
                const c = this.dayNightCycle.currentSkyColor;
                const r = Math.floor(c.r * 255);
                const g = Math.floor(c.g * 255);
                const b = Math.floor(c.b * 255);
                for(let i = 0; i < 64; i += 4) {
                    this.envData[i] = r;
                    this.envData[i+1] = g;
                    this.envData[i+2] = b;
                    this.envData[i+3] = 255;
                }
                this.envTexture.needsUpdate = true;
            }
        }

        // 2. Update Voxel Cloud System & Fireflies & Dust
        if (this.voxelClouds) {
            this.voxelClouds.update(delta);
        }
        if (this.fireflies && this.dayNightCycle) {
            this.fireflies.update(delta, this.dayNightCycle.timeOfDay);
        }
        if (this.ambientDust) {
            this.ambientDust.update(delta);
        }
        
        // 3. Update Speed Streaks when boosting
        if (this.speedStreakGroup && this.camera) {
            this.speedStreakGroup.visible = isBoosting;
            if (isBoosting) {
                this.speedStreakGroup.position.copy(this.camera.position);
                this.speedStreakGroup.rotation.copy(this.camera.rotation);
                
                for (const streak of this.speedStreaks) {
                    streak.mesh.position.z += streak.speed * delta;
                    if (streak.mesh.position.z > 20) {
                        streak.mesh.position.z = -30 - Math.random() * 20;
                        streak.mesh.position.x = (Math.random() - 0.5) * 30;
                        streak.mesh.position.y = (Math.random() - 0.5) * 20;
                    }
                }
            }
        }
    }
    
    render() {
        this.composer.render();
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }
}
