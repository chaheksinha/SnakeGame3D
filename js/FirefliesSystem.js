import * as THREE from 'three';

export class FirefliesSystem {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;
        this.enabled = true;
        this.count = 28;

        const voxelGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        this.material = new THREE.MeshStandardMaterial({
            color: 0xE6FF00,
            emissive: 0xE6FF00,
            emissiveIntensity: 3.4,
            roughness: 0.4,
            metalness: 0.1,
            transparent: true,
            opacity: 1.0
        });

        this.instancedMesh = new THREE.InstancedMesh(voxelGeo, this.material, this.count);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.instancedMesh.frustumCulled = false;
        this.scene.add(this.instancedMesh);

        this.positions = new Float32Array(this.count * 3);
        this.phases = new Float32Array(this.count);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.count; i++) {
            const x = (Math.random() - 0.5) * 140;
            const y = 0.5 + Math.random() * 3.5;
            const z = (Math.random() - 0.5) * 140;
            this.positions[i * 3] = x;
            this.positions[i * 3 + 1] = y;
            this.positions[i * 3 + 2] = z;
            this.phases[i] = Math.random() * Math.PI * 2;
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    setEnabled(on) {
        this.enabled = on;
        this.instancedMesh.visible = on;
    }

    update(delta, timeOfDay) {
        if (!this.enabled) {
            this.instancedMesh.visible = false;
            return;
        }
        this.time += delta;
        const dummy = new THREE.Object3D();

        let targetIntensity = 0;
        if (timeOfDay > 0.45 && timeOfDay < 0.8) {
            targetIntensity = THREE.MathUtils.mapLinear(timeOfDay, 0.45, 0.6, 0, 1);
        } else if (timeOfDay >= 0.8 || timeOfDay < 0.1) {
            targetIntensity = 1;
        } else if (timeOfDay >= 0.1 && timeOfDay < 0.25) {
            targetIntensity = THREE.MathUtils.mapLinear(timeOfDay, 0.1, 0.25, 1, 0);
        }

        const pulse = (Math.sin(this.time * 1.5) * 0.3) + 0.7;
        const finalIntensity = Math.min(1, Math.max(0, targetIntensity * pulse));
        this.material.opacity = THREE.MathUtils.lerp(this.material.opacity, finalIntensity, delta * 2.0);
        this.material.emissiveIntensity = 1.2 + finalIntensity * 3.2;
        this.instancedMesh.visible = this.material.opacity > 0.02;

        if (!this.instancedMesh.visible) return;

        for (let i = 0; i < this.count; i++) {
            const idx = i * 3;
            this.positions[idx + 1] += Math.sin(this.time * 0.5 + this.phases[i]) * 0.01;
            this.positions[idx] += Math.cos(this.time * 0.2 + this.phases[i]) * 0.005;
            this.positions[idx + 2] += Math.sin(this.time * 0.3 + this.phases[i]) * 0.005;
            if (this.positions[idx + 1] < 0.2) this.positions[idx + 1] = 0.2;
            if (this.positions[idx + 1] > 6) this.positions[idx + 1] = 6;
            dummy.position.set(this.positions[idx], this.positions[idx + 1], this.positions[idx + 2]);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
}
