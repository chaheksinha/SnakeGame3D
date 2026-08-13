import * as THREE from 'three';

export class DayNightCycle {
    constructor(scene, sunLight, fillLight) {
        this.scene = scene;
        this.sunLight = sunLight;
        this.fillLight = fillLight;
        
        this.cycleDuration = 120; // 120 seconds per full day/night cycle
        this.timeOfDay = 0.20;    // start at morning (0.0=dawn, 0.25=noon, 0.5=sunset, 0.75=midnight)

        // Moon Directional Light
        this.moonLight = new THREE.DirectionalLight(0x7B92B8, 0.0);
        this.moonLight.castShadow = true;
        this.moonLight.shadow.mapSize.width = 1024;
        this.moonLight.shadow.mapSize.height = 1024;
        this.moonLight.shadow.camera.near = 1;
        this.moonLight.shadow.camera.far = 200;
        this.moonLight.shadow.camera.left = -60;
        this.moonLight.shadow.camera.right = 60;
        this.moonLight.shadow.camera.top = 60;
        this.moonLight.shadow.camera.bottom = -60;
        this.scene.add(this.moonLight);

        // Sky & Fog Colors
        this.skyDawn = new THREE.Color(0xFF8C42);   // Vibrant Orange Dawn
        this.skyDay = new THREE.Color(0x4FA9E8);    // Rich Sky Blue
        this.skyDusk = new THREE.Color(0x8C3B65);   // Deep Magenta Sunset
        this.skyNight = new THREE.Color(0x070B19);  // Darker Midnight

        // Sun Colors
        this.sunDawn = new THREE.Color(0xFFB373);
        this.sunDay = new THREE.Color(0xFFF0D4);
        this.sunDusk = new THREE.Color(0xFF5E36);
        this.sunNight = new THREE.Color(0x221100);

        this.currentSkyColor = new THREE.Color();

        // Starfield Particles
        this.setupStars();
    }

    setupStars() {
        const count = 400;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);

        for (let i = 0; i < count * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 350;
            pos[i + 1] = 50 + Math.random() * 80;
            pos[i + 2] = (Math.random() - 0.5) * 350;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 1.6,
            transparent: true,
            opacity: 0.0
        });

        this.starField = new THREE.Points(geo, this.starMaterial);
        this.scene.add(this.starField);
    }

    update(delta, cameraPosition) {
        this.timeOfDay = (this.timeOfDay + delta / this.cycleDuration) % 1.0;
        const angle = this.timeOfDay * Math.PI * 2;

        // Circular orbit relative to camera center
        const radius = 110;
        const cx = cameraPosition ? cameraPosition.x : 0;
        const cz = cameraPosition ? cameraPosition.z : 0;

        // Sun Orbit
        const sunX = cx + Math.sin(angle) * radius;
        const sunY = Math.cos(angle) * radius;
        const sunZ = cz + 30;
        this.sunLight.position.set(sunX, sunY, sunZ);
        this.sunLight.target.position.set(cx, 0, cz);

        // Moon Orbit (180 deg opposite)
        const moonX = cx - Math.sin(angle) * radius;
        const moonY = -Math.cos(angle) * radius;
        const moonZ = cz - 30;
        this.moonLight.position.set(moonX, moonY, moonZ);
        this.moonLight.target.position.set(cx, 0, cz);

        // Interpolate Colors and Intensities
        const skyCol = new THREE.Color();
        const sunCol = new THREE.Color();
        let sunIntensity = 0;
        let moonIntensity = 0;
        let fillIntensity = 0.4;
        let starOpacity = 0;

        if (this.timeOfDay < 0.25) {
            // Dawn -> Midday
            const t = this.timeOfDay / 0.25;
            skyCol.copy(this.skyDawn).lerp(this.skyDay, t);
            sunCol.copy(this.sunDawn).lerp(this.sunDay, t);
            sunIntensity = THREE.MathUtils.lerp(0.5, 1.6, t);
            moonIntensity = 0;
            fillIntensity = THREE.MathUtils.lerp(0.2, 0.45, t);
            starOpacity = THREE.MathUtils.lerp(0.8, 0, t * 2);
        } else if (this.timeOfDay < 0.50) {
            // Midday -> Dusk
            const t = (this.timeOfDay - 0.25) / 0.25;
            skyCol.copy(this.skyDay).lerp(this.skyDusk, t);
            sunCol.copy(this.sunDay).lerp(this.sunDusk, t);
            sunIntensity = THREE.MathUtils.lerp(1.6, 0.6, t);
            moonIntensity = THREE.MathUtils.lerp(0, 0.2, t);
            fillIntensity = THREE.MathUtils.lerp(0.45, 0.25, t);
            starOpacity = THREE.MathUtils.lerp(0, 0.5, t);
        } else if (this.timeOfDay < 0.75) {
            // Dusk -> Midnight
            const t = (this.timeOfDay - 0.50) / 0.25;
            skyCol.copy(this.skyDusk).lerp(this.skyNight, t);
            sunCol.copy(this.sunDusk).lerp(this.sunNight, t);
            sunIntensity = THREE.MathUtils.lerp(0.6, 0.0, t);
            moonIntensity = THREE.MathUtils.lerp(0.2, 0.95, t);
            fillIntensity = THREE.MathUtils.lerp(0.25, 0.15, t);
            starOpacity = THREE.MathUtils.lerp(0.5, 1.0, t);
        } else {
            // Midnight -> Dawn
            const t = (this.timeOfDay - 0.75) / 0.25;
            skyCol.copy(this.skyNight).lerp(this.skyDawn, t);
            sunCol.copy(this.sunNight).lerp(this.sunDawn, t);
            sunIntensity = THREE.MathUtils.lerp(0.0, 0.5, t);
            moonIntensity = THREE.MathUtils.lerp(0.95, 0.0, t);
            fillIntensity = THREE.MathUtils.lerp(0.15, 0.2, t);
            starOpacity = THREE.MathUtils.lerp(1.0, 0.8, t);
        }

        // Apply colors to Scene Background & Fog
        this.scene.background = skyCol;
        this.currentSkyColor.copy(skyCol);
        if (this.scene.fog) {
            this.scene.fog.color = skyCol;
        }

        // Apply light settings
        this.sunLight.color = sunCol;
        this.sunLight.intensity = Math.max(0, sunIntensity);
        this.moonLight.intensity = Math.max(0, moonIntensity);
        if (this.fillLight) this.fillLight.intensity = fillIntensity;

        // Apply starfield opacity
        this.starMaterial.opacity = Math.max(0, Math.min(1, starOpacity));
        if (this.starField && cameraPosition) {
            this.starField.position.set(cx, 0, cz);
        }
    }
}
