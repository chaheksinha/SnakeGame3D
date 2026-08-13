import { Engine } from './Engine.js';
import { CameraManager } from './CameraManager.js';
import { Snake } from './Snake.js';
import { FoodManager } from './FoodManager.js';
import { Obstacles } from './Obstacles.js';
import { AudioSystem } from './AudioSystem.js';
import { UIManager } from './UIManager.js';

class GameApp {
  constructor() {
    this.gameState = 'LOADING';
    this.gameMode = 'CAMPAIGN';

    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('block_snake_highscore') || '0', 10);
    this.sector = 1;
    this.coresCollected = 0;
    this.sectorCoreTarget = 15;

    this.nitroEnergy = 100;
    this.maxNitro = 100;
    this.isBoosting = false;

    this.jumpEnergy = 100;
    this.jumpCooldownSpeed = 25;

    this.overclockTimer = 0;
    this.scoreMultiplier = 1;

    this.keysPressed = {};
    this.touchSteering = 0;
    this.touchBoosting = false;
    
    // Begin async initialization
    this.init();
  }
  
  updateLoading(pct, text) {
      document.getElementById('loading-bar').style.width = pct + '%';
      document.getElementById('loading-text').textContent = text;
  }

  async init() {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    
    this.updateLoading(10, 'Initializing WebGL Engine...');
    await sleep(20);
    const container = document.getElementById('game-container');
    this.engine = new Engine(container);

    this.updateLoading(30, 'Generating Voxel Environments...');
    await sleep(20);
    this.cameraManager = new CameraManager(this.engine.camera);
    
    this.updateLoading(50, 'Building Audio System...');
    await sleep(20);
    this.audioSystem = new AudioSystem();

    this.updateLoading(65, 'Constructing 3D Voxel Snake...');
    await sleep(20);
    this.snake = new Snake(this.engine.scene, this.audioSystem);

    this.updateLoading(85, 'Spawning Interactive Elements...');
    await sleep(20);
    this.foodManager = new FoodManager(this.engine.scene);
    this.obstacles = new Obstacles(this.engine.scene);
    this.uiManager = new UIManager();

    this.updateLoading(100, 'Ready!');
    await sleep(250);

    document.getElementById('loading-screen').classList.add('hidden');
    this.gameState = 'START_SCREEN';
    
    this.setupInputs();
    this.setupUIButtons();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.code] = true;
      this.audioSystem.init();

      // Prevent default for game keys to avoid page scroll
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }
      if (e.code === 'KeyR' && this.gameState === 'GAME_OVER') {
        this.restartGame();
      }
      if (e.code === 'Space' && this.gameState === 'PLAYING') {
        this.tryJump();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
    });

    this.setupTouchControls();
  }

  setupTouchControls() {
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Only show touch controls if the device actually reports as mobile/tablet AND has touch
    if (!hasTouch || !isMobileUserAgent) return;

    const touchLayer = document.getElementById('touch-controls');
    if (touchLayer) touchLayer.classList.remove('hidden');

    const stick = document.getElementById('joystick-stick');
    const zone = document.getElementById('joystick-zone');
    if (!zone || !stick) return;

    let touchId = null;
    let startX = 0;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      startX = touch.clientX;
    });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === touchId) {
          const deltaX = touch.clientX - startX;
          const clampedX = Math.max(-40, Math.min(40, deltaX));
          stick.style.transform = `translateX(${clampedX}px)`;
          this.touchSteering = clampedX / 40;
        }
      }
    });

    const endTouch = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === touchId) {
          touchId = null;
          stick.style.transform = 'translateX(0px)';
          this.touchSteering = 0;
        }
      }
    };

    zone.addEventListener('touchend', endTouch);
    zone.addEventListener('touchcancel', endTouch);

    const boostBtn = document.getElementById('touch-boost-btn');
    if (boostBtn) {
      boostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchBoosting = true; });
      boostBtn.addEventListener('touchend', () => { this.touchBoosting = false; });
      boostBtn.addEventListener('touchcancel', () => { this.touchBoosting = false; });
    }

    const jumpBtn = document.getElementById('touch-jump-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.tryJump(); });
    }
  }

  setupUIButtons() {
    document.getElementById('start-campaign-btn').addEventListener('click', () => {
      this.gameMode = 'CAMPAIGN';
      this.startGame();
    });

    document.getElementById('start-endless-btn').addEventListener('click', () => {
      this.gameMode = 'ENDLESS';
      this.startGame();
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('restart-pause-btn').addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      this.restartGame();
    });

    const audioBtn = document.getElementById('audio-toggle-btn');
    const audioIcon = document.getElementById('audio-icon');
    if (audioBtn && audioIcon) {
      audioBtn.addEventListener('click', () => {
        const isUnmuted = this.audioSystem.toggleAudio();
        audioIcon.textContent = isUnmuted ? '🔊' : '🔇';
      });
    }

    // New Pause and Settings buttons
    document.getElementById('pause-btn')?.addEventListener('click', () => {
        if (this.gameState === 'PLAYING') this.togglePause();
    });

    document.getElementById('settings-btn')?.addEventListener('click', () => {
        document.getElementById('settings-screen').classList.remove('hidden');
    });

    document.getElementById('close-settings-btn')?.addEventListener('click', () => {
        document.getElementById('settings-screen').classList.add('hidden');
    });

    document.getElementById('settings-audio-btn')?.addEventListener('click', (e) => {
        const isOn = e.target.textContent === 'ON';
        e.target.textContent = isOn ? 'OFF' : 'ON';
        const isUnmuted = this.audioSystem.toggleAudio();
        if (audioIcon) audioIcon.textContent = isUnmuted ? '🔊' : '🔇';
    });

    document.getElementById('settings-graphics-btn')?.addEventListener('click', (e) => {
        const states = ['LOW', 'MED', 'ULTRA'];
        let idx = states.indexOf(e.target.textContent);
        idx = (idx + 1) % states.length;
        e.target.textContent = states[idx];
    });

    document.getElementById('settings-bloom-btn')?.addEventListener('click', (e) => {
        const isOn = e.target.textContent === 'ON';
        e.target.textContent = isOn ? 'OFF' : 'ON';
        window.GLOW_ENABLED = !isOn;
    });
  }

  startGame() {
    this.score = 0;
    this.sector = 1;
    this.coresCollected = 0;
    this.nitroEnergy = 100;
    this.jumpEnergy = 100;
    this.overclockTimer = 0;
    this.scoreMultiplier = 1;

    this.snake.reset();
    this.foodManager.spawnInitial();
    this.obstacles.setupSectorObstacles(this.sector);

    this.gameState = 'PLAYING';
    this.uiManager.showGameHUD();
    this.audioSystem.startMusic();
  }

  restartGame() {
    this.startGame();
  }

  togglePause() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.uiManager.showPauseScreen();
      this.audioSystem.stopMusic();
    } else if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.uiManager.hidePauseScreen();
      this.audioSystem.startMusic();
      this.lastTime = performance.now(); // prevent delta spike after unpause
    }
  }

  tryJump() {
    if (this.jumpEnergy >= 100 && !this.snake.isJumping) {
      if (this.snake.jump()) {
        this.jumpEnergy = 0;
        this.audioSystem.playJump();
        this.cameraManager.triggerShake(0.3);
      }
    }
  }

  getSteeringInput() {
    // Keyboard steering — ALWAYS compute fresh
    // Pressing A / Left Arrow turns LEFT (+1.0 in local coordinate space)
    // Pressing D / Right Arrow turns RIGHT (-1.0 in local coordinate space)
    let steer = 0;
    if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) steer += 1.0;
    if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) steer -= 1.0;

    // Blend with touch steering
    if (this.touchSteering !== 0) {
      steer = -this.touchSteering;
    }

    return steer;
  }

  getBoostInput() {
    return (
      this.keysPressed['KeyW'] ||
      this.keysPressed['ArrowUp'] ||
      this.keysPressed['ShiftLeft'] ||
      this.keysPressed['ShiftRight'] ||
      this.touchBoosting
    ) && (this.nitroEnergy > 0);
  }

  gameLoop(now) {
    const delta = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.gameState === 'PLAYING') {
      this.updateGameLogic(now / 1000, delta);
    }

    this.engine.update(now / 1000, delta, this.isBoosting);
    this.engine.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  updateGameLogic(time, delta) {
    // 1. Process Inputs — fresh every frame, resets to 0 properly
    const steering = this.getSteeringInput();
    this.isBoosting = this.getBoostInput();

    // 2. Nitro Energy
    if (this.isBoosting) {
      this.nitroEnergy = Math.max(0, this.nitroEnergy - delta * 35);
    } else {
      this.nitroEnergy = Math.min(this.maxNitro, this.nitroEnergy + delta * 15);
    }

    // 3. Jump Cooldown
    if (this.jumpEnergy < 100) {
      this.jumpEnergy = Math.min(100, this.jumpEnergy + delta * this.jumpCooldownSpeed);
    }

    // 4. Overclock Timer
    const activeBuffs = [];
    if (this.overclockTimer > 0) {
      this.overclockTimer -= delta;
      this.scoreMultiplier = 2;
      activeBuffs.push(`2X ${Math.ceil(this.overclockTimer)}s`);
      if (this.overclockTimer <= 0) {
        this.scoreMultiplier = 1;
      }
    }
    if (this.snake.hasShield) {
      activeBuffs.push('SHIELD');
    }

    // 5. Update Snake with FRESH steering value
    this.snake.update(steering, this.isBoosting, delta);

    // 6. Update Camera
    this.cameraManager.update(
      this.snake.headPos,
      this.snake.yaw,
      this.snake.yOffset,
      this.isBoosting,
      this.snake.turnDelta,
      delta
    );

    // 7. Update Collectibles & Check Pickups
    this.foodManager.update(time, delta);
    const pickupType = this.foodManager.checkPickups(this.snake.headPos, this.snake.yOffset);
    if (pickupType) {
      this.handlePickup(pickupType);
    }

    // 8. Update Obstacles & Check Collisions
    this.obstacles.update(time, delta);
    const hitObstacle = this.obstacles.checkCollisions(this.snake.headPos, this.snake.yOffset);
    const hitSelf = this.snake.checkSelfCollision();
    const hitBoundary = this.snake.checkBoundaryCollision();

    if (hitObstacle || hitSelf || hitBoundary) {
      this.handleGameOver();
      return;
    }

    // 9. Update HUD
    this.uiManager.updateHUD(
      this.score,
      this.highScore,
      this.sector,
      this.snake.getLengthMeters(),
      this.nitroEnergy,
      this.jumpEnergy,
      activeBuffs
    );
  }

  handlePickup(type) {
    if (type === 'core') {
      this.score += 10 * this.scoreMultiplier;
      this.coresCollected++;
      this.snake.addSegment();
      this.audioSystem.playEat();

      // Spawn a new apple to replace eaten one
      this.foodManager.spawnItem('core');

      // Randomly spawn a powerup (20% chance)
      if (Math.random() < 0.2) {
        this.foodManager.spawnRandomPowerUp();
      }

      // Campaign Sector Advancement
      if (this.gameMode === 'CAMPAIGN' && this.coresCollected >= this.sectorCoreTarget) {
        this.sector++;
        this.coresCollected = 0;
        this.sectorCoreTarget = Math.min(30, 15 + this.sector * 2); // progressive difficulty
        this.obstacles.setupSectorObstacles(this.sector);
        this.cameraManager.triggerShake(0.4);
      }
    } else if (type === 'overclock') {
      this.score += 25 * this.scoreMultiplier;
      this.overclockTimer = 8.0;
      this.audioSystem.playOverclock();
    } else if (type === 'emp') {
      this.score += 15 * this.scoreMultiplier;
      this.snake.removeSegments(3);
      this.audioSystem.playEmp();
      this.cameraManager.triggerShake(0.4);
    } else if (type === 'shield') {
      this.score += 20 * this.scoreMultiplier;
      this.snake.hasShield = true;
      this.audioSystem.playShield();
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('block_snake_highscore', String(this.highScore));
    }
  }

  handleGameOver() {
    this.gameState = 'GAME_OVER';
    this.audioSystem.playExplosion();
    this.audioSystem.stopMusic();
    this.cameraManager.triggerShake(0.6);

    this.uiManager.showGameOverScreen(
      this.score,
      this.highScore,
      this.coresCollected,
      this.snake.getLengthMeters()
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp();
});
