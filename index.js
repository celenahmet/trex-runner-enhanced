// Modern Dino Runner - BTE311
// Karakter sabit, zemin ve engeller akıyor; dino koşma animasyonlu, duck destekli.

let canvas, ctx;
let statusTextEl;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 260;
const GROUND_Y = GAME_HEIGHT - 40;

// Dino ayarları
const DINO_WIDTH = 42;
const DINO_HEIGHT = 50;
const GRAVITY = 0.9;
const JUMP_FORCE = -15;

// Engel ayarları (HIZLANDIRILMIŞ)
const BASE_SPEED = 10;            // Önceden 6 idi
const MAX_SPEED = 20;             // Önceden 16 idi
const SPAWN_INTERVAL_START = 80;  // Önceden 110 idi
const SPAWN_INTERVAL_MIN = 45;    // Önceden 55 idi

let gameState = "intro"; // intro | running | gameover

let dino;
let obstacles = [];
let speed = BASE_SPEED;
let frameCount = 0;
let spawnInterval = SPAWN_INTERVAL_START;
let score = 0;
let highScore = 0;

// ---------------------- Dino Sınıfı ---------------------- //

class Dino {
  constructor() {
    this.baseWidth = DINO_WIDTH;
    this.baseHeight = DINO_HEIGHT;
    this.duckHeight = Math.round(DINO_HEIGHT * 0.6);

    this.width = this.baseWidth;
    this.height = this.baseHeight;

    this.baseX = 80;
    this.x = this.baseX;
    this.y = GROUND_Y - this.height;
    this.vy = 0;
    this.jumping = false;
    this.ducking = false;

    // Koşma animasyonu
    this.runFrame = 0;
    this.runFrameCounter = 0;
  }

  jump() {
    if (!this.jumping) {
      this.vy = JUMP_FORCE;
      this.jumping = true;
      this.ducking = false; // zıplarken duck iptal
    }
  }

  setDuck(isDucking) {
    // Havada duck yok (basit)
    if (this.jumping) return;
    this.ducking = isDucking;
  }

  update() {
    // Yükseklik: duck mı normal mi?
    const targetHeight =
      this.ducking && !this.jumping ? this.duckHeight : this.baseHeight;

    // Yükseklik değişince yere göre konumla
    if (targetHeight !== this.height) {
      this.height = targetHeight;
      this.y = GROUND_Y - this.height;
    }

    // Yer çekimi
    this.vy += GRAVITY;
    this.y += this.vy;

    const groundTop = GROUND_Y - this.height;
    if (this.y > groundTop) {
      this.y = groundTop;
      this.vy = 0;
      this.jumping = false;
    }

    // Koşma animasyonu (sadece yerdeyken)
    if (!this.jumping) {
      this.runFrameCounter++;
      if (this.runFrameCounter > 5) {
        this.runFrame = (this.runFrame + 1) % 2; // 0 ↔ 1
        this.runFrameCounter = 0;
      }
      // Hafif yatay titreme (hareket hissi)
      this.x = this.baseX + (this.runFrame === 0 ? 0 : 1);
    } else {
      this.x = this.baseX;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "#f5f5f5";

    const w = this.width;
    const h = this.height;
    const x = this.x;
    const y = this.y;

    if (this.ducking && !this.jumping) {
      // Eğilmiş (duck) dino
      const bodyHeight = h * 0.7;
      ctx.fillRect(x, y + (h - bodyHeight), w, bodyHeight);

      // Küçük kafa
      ctx.fillRect(
        x + w * 0.45,
        y + (h - bodyHeight) - 6,
        w * 0.55,
        bodyHeight * 0.6
      );

      // Göz
      ctx.fillStyle = "#111";
      ctx.fillRect(
        x + w * 0.8,
        y + (h - bodyHeight) - 2,
        3,
        3
      );
    } else {
      // Gövde
      const bodyWidth = w * 0.65;
      const bodyHeight = h * 0.7;
      ctx.fillRect(x, y + h * 0.3, bodyWidth, bodyHeight);

      // Kafa
      const headWidth = w * 0.55;
      const headHeight = h * 0.45;
      ctx.fillRect(x + bodyWidth - 4, y, headWidth, headHeight);

      // Kol
      ctx.fillRect(x + bodyWidth * 0.5, y + h * 0.4, 8, 8);

      // Bacaklar (animasyon)
      ctx.fillStyle = "#f5f5f5";
      const legY = y + h * 0.8;
      const legW = 6;
      const legH = h * 0.25;

      if (this.runFrame === 0) {
        ctx.fillRect(x + 6, legY, legW, legH);
        ctx.fillRect(x + 20, legY + 3, legW, legH - 4);
      } else {
        ctx.fillRect(x + 6, legY + 3, legW, legH - 4);
        ctx.fillRect(x + 20, legY, legW, legH);
      }

      // Göz
      ctx.fillStyle = "#111";
      ctx.fillRect(x + bodyWidth + headWidth * 0.5, y + 7, 3, 3);
    }

    ctx.restore();
  }

  getBounds() {
    // Çarpışma kutusunu hafif küçült (afiflik için)
    return {
      x: this.x + 6,
      y: this.y + 4,
      width: this.width - 12,
      height: this.height - 8
    };
  }
}

// ---------------------- Engel Sınıfı ---------------------- //

class Obstacle {
  constructor(speed) {
    this.speed = speed;
    this.width = getRandomInt(22, 40);
    this.height = getRandomInt(30, 60);
    this.x = GAME_WIDTH + getRandomInt(0, 80);
    this.y = GROUND_Y - this.height;
    this.type = Math.random() < 0.7 ? "cactus" : "block";
  }

  update() {
    this.x -= this.speed;
  }

  draw(ctx) {
    ctx.save();
    if (this.type === "cactus") {
      ctx.fillStyle = "#a5f3b6";
    } else {
      ctx.fillStyle = "#facc6b";
    }
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 4
    };
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }
}

// ---------------------- Oyun Kurulumu ---------------------- //

function init() {
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");
  statusTextEl = document.getElementById("statusText");

  setupIntro();
  resetGameObjects();
  bindEvents();

  requestAnimationFrame(loop);
}

function setupIntro() {
  const overlay = document.getElementById("introOverlay");
  const btn = document.getElementById("startButton");

  gameState = "intro";

  if (btn) {
    btn.addEventListener("click", () => {
      startGame();
    });
  }

  // Boşluk veya ↑ ile de oyunu başlat
  document.addEventListener("keydown", (e) => {
    const code = e.code || e.key;
    if (code === "Space" || code === "ArrowUp") {
      if (gameState === "intro") {
        startGame();
      }
    }
  });
}

function hideIntroOverlay() {
  const overlay = document.getElementById("introOverlay");
  if (overlay && !overlay.classList.contains("intro-overlay--hidden")) {
    overlay.classList.add("intro-overlay--hidden");
  }
}

function resetGameObjects() {
  dino = new Dino();
  obstacles = [];
  speed = BASE_SPEED;
  frameCount = 0;
  spawnInterval = SPAWN_INTERVAL_START;
  score = 0;
  updateStatusText();
}

function bindEvents() {
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("touchstart", handleTouch, { passive: false });
}

// ---------------------- Input ---------------------- //

function handleKeyDown(e) {
  const code = e.code || e.key;

  if (code === "Space" || code === "ArrowUp") {
    e.preventDefault();

    if (gameState === "intro") {
      startGame();
    } else if (gameState === "running") {
      dino.jump();
    } else if (gameState === "gameover") {
      resetGameObjects();
      startGame();
    }
  }

  if (code === "ArrowDown") {
    e.preventDefault();
    if (gameState === "running") {
      dino.setDuck(true);
    }
  }
}

function handleKeyUp(e) {
  const code = e.code || e.key;
  if (code === "ArrowDown" && gameState === "running") {
    dino.setDuck(false);
  }
}

function handleTouch(e) {
  e.preventDefault();
  if (gameState === "intro") {
    startGame();
  } else if (gameState === "running") {
    dino.jump();
  } else if (gameState === "gameover") {
    resetGameObjects();
    startGame();
  }
}

// ---------------------- Game State ---------------------- //

function startGame() {
  gameState = "running";
  hideIntroOverlay();
  document.body.classList.add("game-focused"); // sade oyun modu
  updateStatusText();
}

function gameOver() {
  gameState = "gameover";
  if (score > highScore) {
    highScore = score;
  }
  updateStatusText();
}

function updateStatusText() {
  if (!statusTextEl) return;

  if (gameState === "intro") {
    statusTextEl.innerHTML =
      "Oyun için hazır! Başlamak için <strong>Boşluk</strong> veya <strong>Yukarı Ok</strong> tuşuna bas.";
  } else if (gameState === "running") {
    statusTextEl.textContent = "Koş! Engellerden kaç 🎮";
  } else if (gameState === "gameover") {
    statusTextEl.innerHTML =
      `Game Over · Skor: <strong>${score}</strong> · En yüksek: <strong>${highScore}</strong> · Tekrar oynamak için Boşluk'a bas.`;
  }
}

// ---------------------- Oyun Döngüsü ---------------------- //

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

function update() {
  if (gameState !== "running") return;

  frameCount++;
  dino.update();

  // Engel üretme
  if (frameCount % spawnInterval === 0) {
    obstacles.push(new Obstacle(speed));

    // Zamanla daha sık engel gelsin
    if (spawnInterval > SPAWN_INTERVAL_MIN) {
      spawnInterval--;
    }
  }

  obstacles.forEach((o) => {
    o.speed = speed;
    o.update();
  });

  obstacles = obstacles.filter((o) => !o.isOffScreen());

  // Skor & hız
  score++;

  // Skor arttıkça hız biraz daha agresif artsın
  if (score % 200 === 0 && speed < MAX_SPEED) {
    speed += 1;
  }

  // Çarpışma kontrolü
  for (const o of obstacles) {
    if (isColliding(dino.getBounds(), o.getBounds())) {
      gameOver();
      break;
    }
  }
}

// ---------------------- Çizim ---------------------- //

function render() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawBackground();
  dino.draw(ctx);
  obstacles.forEach((o) => o.draw(ctx));
  drawHUD();
}

function drawBackground() {
  // Zemin çizgisi
  ctx.save();
  ctx.strokeStyle = "#3f3f5a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 0.5);
  ctx.lineTo(GAME_WIDTH, GROUND_Y + 0.5);
  ctx.stroke();
  ctx.restore();

  // Hafif yıldız noktaları (süs, ACM moru vibe)
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 14; i++) {
    const x = (i * 63 + (frameCount % 63)) % GAME_WIDTH;
    const y = 18 + (i * 11) % 60;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

function drawHUD() {
  ctx.save();
  ctx.fillStyle = "#f5f5ff";
  ctx.font = "15px system-ui";
  ctx.textBaseline = "top";

  const scoreText = `Skor: ${score}`;
  const hsText = `En Yüksek: ${highScore}`;
  ctx.fillText(scoreText, GAME_WIDTH - 170, 10);
  ctx.fillText(hsText, GAME_WIDTH - 170, 30);

  ctx.restore();
}

// ---------------------- Yardımcılar ---------------------- //

function isColliding(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------- Başlat ---------------------- //

window.addEventListener("load", init);
