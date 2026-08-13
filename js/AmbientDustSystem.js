import * as THREE from 'three';

export class AmbientDustSystem {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;
        
        const count = 400; // tiny floating specks for cinematic volumetric feel
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const phases = new Float32Array(count); 

        for (let i = 0; i < count * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 140; 
            pos[i + 1] = Math.random() * 25; 
            pos[i + 2] = (Math.random() - 0.5) * 140;
            phases[i/3] = Math.random() * Math.PI * 2;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        
        // Emissive white material to pick up some bloom
        this.material = new THREE.PointsMaterial({
            color: new THREE.Color(0xFFFFFF).multiplyScalar(1.2),
            size: 0.15,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geo, this.material);
        this.scene.add(this.particles);
    }

    update(delta) {
        this.time += delta;
        const positions = this.particles.geometry.attributes.position.array;
        const phases = this.particles.geometry.attributes.phase.array;
        
        for (let i = 0; i < phases.length; i++) {
            const idx = i * 3;
            // Slow cinematic drift
            positions[idx + 1] -= delta * 0.15; // Slowly falling
            positions[idx] += Math.cos(this.time * 0.2 + phases[i]) * 0.005;
            positions[idx + 2] += Math.sin(this.time * 0.2 + phases[i]) * 0.005;
            
            // Loop back to sky if it hits ground
            if (positions[idx + 1] < 0) {
                positions[idx + 1] = 25;
                positions[idx] = (Math.random() - 0.5) * 140;
                positions[idx + 2] = (Math.random() - 0.5) * 140;
            }
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
}
