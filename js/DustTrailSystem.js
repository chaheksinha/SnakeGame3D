import * as THREE from 'three';

export class DustTrailSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.active = false;
        
        // Simple dusty cube
        const geom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const mat = new THREE.MeshLambertMaterial({ 
            color: 0xcccccc, 
            transparent: true, 
            opacity: 0.6 
        });
        
        this.instancedMesh = new THREE.InstancedMesh(geom, mat, 100);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(this.instancedMesh);
        
        // Hide all initially
        const dummy = new THREE.Object3D();
        dummy.position.set(0, -100, 0);
        dummy.updateMatrix();
        for(let i=0; i<100; i++) {
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
            this.particles.push({
                active: false,
                life: 0,
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                rot: new THREE.Vector3()
            });
        }
        
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        this.currentIndex = 0;
    }

    emit(position, velocity) {
        if (!this.active) return;
        
        const p = this.particles[this.currentIndex];
        p.active = true;
        p.life = 1.0;
        
        // Slight random offset
        p.pos.copy(position);
        p.pos.x += (Math.random() - 0.5) * 0.8;
        p.pos.y += Math.random() * 0.5;
        p.pos.z += (Math.random() - 0.5) * 0.8;
        
        // Velocity (drifting opposite to movement)
        p.vel.copy(velocity).normalize().multiplyScalar(-3.0);
        p.vel.y += Math.random() * 2.0 + 1.0; // drift up
        
        p.rot.set(Math.random(), Math.random(), Math.random());
        
        this.currentIndex = (this.currentIndex + 1) % 100;
    }

    update(delta) {
        let needsUpdate = false;
        const dummy = new THREE.Object3D();
        
        for(let i=0; i<100; i++) {
            const p = this.particles[i];
            if(p.active) {
                p.life -= delta * 1.5;
                if(p.life <= 0) {
                    p.active = false;
                    dummy.position.set(0, -100, 0);
                    dummy.updateMatrix();
                    this.instancedMesh.setMatrixAt(i, dummy.matrix);
                    needsUpdate = true;
                } else {
                    p.pos.addScaledVector(p.vel, delta);
                    p.vel.y -= delta * 0.5; // slight gravity/drag
                    
                    dummy.position.copy(p.pos);
                    dummy.rotation.x = p.rot.x * p.life * 5;
                    dummy.rotation.y = p.rot.y * p.life * 5;
                    
                    // Shrink as it dies
                    const scale = p.life * 1.5;
                    dummy.scale.set(scale, scale, scale);
                    dummy.updateMatrix();
                    this.instancedMesh.setMatrixAt(i, dummy.matrix);
                    needsUpdate = true;
                }
            }
        }
        
        if (needsUpdate) {
            this.instancedMesh.instanceMatrix.needsUpdate = true;
        }
    }
}
