import * as THREE from 'three';
import { DetailedVoxelFactory } from './DetailedVoxelFactory.js';

export class Obstacles {
    constructor(scene) {
        this.scene = scene;
        this.pillars = [];
        this.lasers = [];
        this.arenaRadius = 70;
    }

    setupSectorObstacles(sector = 1) {
        this.clearAll();

        const numPillars = Math.min(8, 2 + sector * 2);
        
        for (let i = 0; i < numPillars; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 35; // 20 to 55 from center
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            
            let pillarGroup;
            if (Math.random() > 0.5) {
                pillarGroup = DetailedVoxelFactory.createStonePillar();
            } else {
                pillarGroup = DetailedVoxelFactory.createCrateObstacle();
            }
            pillarGroup.position.set(x, 0, z);
            
            this.scene.add(pillarGroup);
            this.pillars.push({
                group: pillarGroup,
                meshes: [pillarGroup],
                radius: 1.5,
                pos: new THREE.Vector3(x, 0, z)
            });
        }

        if (sector >= 2) {
            const numLasers = Math.min(3, sector - 1);
            
            for (let i = 0; i < numLasers; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 25 + Math.random() * 25;
                const x = Math.cos(angle) * dist;
                const z = Math.sin(angle) * dist;
                
                const group = DetailedVoxelFactory.createSpikeTrap();
                group.position.set(x, 0, z);
                group.rotation.y = Math.random() * Math.PI;
                
                this.scene.add(group);
                
                this.lasers.push({
                    group: group,
                    length: 8,
                    pos: new THREE.Vector3(x, 0, z)
                });
            }
        }
    }

    update(time, delta) {
        for (const laser of this.lasers) {
            laser.group.rotation.y += 0.25 * delta;
        }
    }

    checkCollisions(headPos, headYOffset) {
        // Pillar collisions
        for (const pillar of this.pillars) {
            const dist = new THREE.Vector2(headPos.x - pillar.pos.x, headPos.z - pillar.pos.z).length();
            if (dist < pillar.radius + 0.5) { // 0.5 is approx snake head radius
                return true;
            }
        }
        
        // Lava fence collisions
        for (const laser of this.lasers) {
            laser.group.updateMatrixWorld();
            const worldHeadPos = new THREE.Vector3(headPos.x, headYOffset, headPos.z);
            const localPos = worldHeadPos.clone();
            laser.group.worldToLocal(localPos);
            
            // Check posts
            if (Math.abs(localPos.x) > 3.4 && Math.abs(localPos.x) < 4.6) {
                if (Math.abs(localPos.z) < 0.9 && localPos.y < 3.5) {
                    return true;
                }
            }
            
            // Check lava fence
            if (Math.abs(localPos.x) <= 3.8) {
                if (Math.abs(localPos.z) < 0.65 && localPos.y < 1.7) { // 1.2 height + 0.5 margin
                    return true;
                }
            }
        }
        
        return false;
    }

    clearAll() {
        const disposeObject = (obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
            if (obj.children) {
                obj.children.forEach(child => disposeObject(child));
            }
        };

        for (const pillar of this.pillars) {
            this.scene.remove(pillar.group);
            disposeObject(pillar.group);
        }
        this.pillars = [];
        
        for (const laser of this.lasers) {
            this.scene.remove(laser.group);
            disposeObject(laser.group);
        }
        this.lasers = [];
    }
}
