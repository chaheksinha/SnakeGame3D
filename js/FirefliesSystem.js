import * as THREE from 'three';

export class FirefliesSystem {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;
        
        this.count = 20; 
        
        // 1. Create a tiny glowing 3D Voxel instead of a "cloudy ball" sprite
        const voxelGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        this.material = new THREE.MeshBasicMaterial({ 
            color: 0xE6FF00, // Bright yellow/green
            transparent: true,
            opacity: 1.0 
        });

        this.instancedMesh = new THREE.InstancedMesh(voxelGeo, this.material, this.count);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(this.instancedMesh);

        this.positions = new Float32Array(this.count * 3);
        this.phases = new Float32Array(this.count);
        this.lights = [];

        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.count; i++) {
            const x = (Math.random() - 0.5) * 140; 
            const y = 0.5 + Math.random() * 3.5; 
            const z = (Math.random() - 0.5) * 140;
            
            this.positions[i*3] = x;
            this.positions[i*3+1] = y;
            this.positions[i*3+2] = z;
            
            this.phases[i] = Math.random() * Math.PI * 2;
            
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
            
            // Real Lighting!
            const light = new THREE.PointLight(0xCCFF00, 0.0, 15);
            light.position.set(x, y, z);
            this.scene.add(light);
            this.lights.push(light);
        }
        
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    update(delta, timeOfDay) {
        this.time += delta;
        const positions = this.positions;
        const dummy = new THREE.Object3D();
        
        // Visibility based on time of day (visible mainly Dusk to Dawn: 0.5 to 1.0/0.0)
        let targetIntensity = 0;
        if (timeOfDay > 0.45 && timeOfDay < 0.8) {
             targetIntensity = THREE.MathUtils.mapLinear(timeOfDay, 0.45, 0.6, 0, 1);
        } else if (timeOfDay >= 0.8 || timeOfDay < 0.1) {
             targetIntensity = 1;
        } else if (timeOfDay >= 0.1 && timeOfDay < 0.25) {
             targetIntensity = THREE.MathUtils.mapLinear(timeOfDay, 0.1, 0.25, 1, 0);
        }
        
        // Global pulsing effect
        const pulse = (Math.sin(this.time * 1.5) * 0.3) + 0.7; 
        const finalIntensity = Math.min(1, Math.max(0, targetIntensity * pulse));
        
        this.material.opacity = THREE.MathUtils.lerp(this.material.opacity, finalIntensity, delta * 2.0);
        
        for (let i = 0; i < this.count; i++) {
            const idx = i * 3;
            // Subtle floating drift
            positions[idx + 1] += Math.sin(this.time * 0.5 + this.phases[i]) * 0.01;
            positions[idx] += Math.cos(this.time * 0.2 + this.phases[i]) * 0.005;
            positions[idx + 2] += Math.sin(this.time * 0.3 + this.phases[i]) * 0.005;
            
            // Keep above ground
            if (positions[idx + 1] < 0.2) positions[idx + 1] = 0.2;
            if (positions[idx + 1] > 6) positions[idx + 1] = 6;
            
            // Sync InstancedMesh
            if (this.material.opacity > 0.01) {
                dummy.position.set(positions[idx], positions[idx+1], positions[idx+2]);
                dummy.updateMatrix();
                this.instancedMesh.setMatrixAt(i, dummy.matrix);
            } else {
                dummy.position.set(0, -100, 0); // Hide below ground
                dummy.updateMatrix();
                this.instancedMesh.setMatrixAt(i, dummy.matrix);
            }
            
            // Sync Lights
            this.lights[i].position.set(positions[idx], positions[idx+1], positions[idx+2]);
            this.lights[i].intensity = this.material.opacity * 1.5; // Max intensity 1.5
        }
        
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
}
