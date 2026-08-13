import * as THREE from 'three';

export class CameraManager {
  constructor(camera) {
    this.camera = camera;
    this.distance = 11;
    this.height = 6.5;
    this.lookAhead = 6;
    this.smoothing = 0.008; // tighter frame-rate independent exponential smoothing
    
    this.baseFov = 58;
    this.boostFov = 70;
    
    this.shakeIntensity = 0;
    this.shakeDecay = 4.0;
    
    this.currentPosition = new THREE.Vector3(0, 10, 14);
    this.currentLookAt = new THREE.Vector3(0, 0, 0);
    this.initialized = false;
  }

  update(headPos, headYaw, headYOffset, isBoosting, turnDelta, delta) {
    // Desired position: behind and above the snake head
    const camX = headPos.x - Math.sin(headYaw) * this.distance;
    const camY = 0.5 + headYOffset + this.height;
    const camZ = headPos.z - Math.cos(headYaw) * this.distance;
    const targetPos = new THREE.Vector3(camX, camY, camZ);

    // Desired look-at: ahead of the snake head
    const lookX = headPos.x + Math.sin(headYaw) * this.lookAhead;
    const lookY = 0.5 + headYOffset + 0.5;
    const lookZ = headPos.z + Math.cos(headYaw) * this.lookAhead;
    const targetLookAt = new THREE.Vector3(lookX, lookY, lookZ);

    if (!this.initialized) {
      // Snap to target on first frame
      this.currentPosition.copy(targetPos);
      this.currentLookAt.copy(targetLookAt);
      this.initialized = true;
    }

    // Exponential smoothing (frame-rate independent)
    const posAlpha = 1.0 - Math.pow(this.smoothing, delta);
    const lookAlpha = 1.0 - Math.pow(this.smoothing * 0.5, delta);
    
    this.currentPosition.lerp(targetPos, posAlpha);
    this.currentLookAt.lerp(targetLookAt, lookAlpha);

    // Apply shake
    const finalPos = this.currentPosition.clone();
    if (this.shakeIntensity > 0.01) {
      finalPos.x += (Math.random() - 0.5) * this.shakeIntensity * 2;
      finalPos.y += (Math.random() - 0.5) * this.shakeIntensity * 1.5;
      finalPos.z += (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= Math.pow(0.01, delta); // exponential decay
      if (this.shakeIntensity < 0.01) this.shakeIntensity = 0;
    }

    this.camera.position.copy(finalPos);
    this.camera.lookAt(this.currentLookAt);

    // FOV boost
    const targetFov = isBoosting ? this.boostFov : this.baseFov;
    const fovAlpha = 1.0 - Math.pow(0.05, delta);
    this.camera.fov += (targetFov - this.camera.fov) * fovAlpha;
    this.camera.updateProjectionMatrix();
  }

  reset() {
    this.initialized = false;
    this.shakeIntensity = 0;
  }

  triggerShake(intensity = 0.5) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }
}
