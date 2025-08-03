const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const groundY = HEIGHT - 60;

const gravity = 0.8;

const elae = {
  x: 60,
  y: groundY,
  width: 32,
  height: 32,
  vy: 0,
  jumping: false,
  dashCooldown: 0,
  dashing: false,
  dashTimeLeft: 0,
  blinkTimer: 0,
  spriteFrame: 0,
  tailWag: 0,
  shield: false,
  shieldTimer: 0,
  focusActive: false,
  focusTimer: 0,
};

let obstacles = [];
let crystals = [];

let shardsCollected = 0;
let score = 0;
let powerUp = "None";
let baseSpeed = 4;      // Base game speed
let gameSpeed = baseSpeed;
const maxSpeed = 10;    // Cap max speed here

let frameCount = 0;
let gameRunning = false;

const keys = {};

const riftStates = [
  { name: "Stable", speedMult: 1, bgColor: "#0b1a33" },
  { name: "Shifting", speedMult: 1.1, bgColor: "#2b1a3d" },
  { name: "Unraveling", speedMult: 1.3, bgColor: "#4b134d" },
  { name: "Fractured", speedMult: 1.5, bgColor: "#6b0f5a" },
];
let currentRiftIndex = 0;

const maxFocusDuration = 180;

const storyPieces = [
  "You are Elae, guardian of the Echo Rift.",
  "Collect memory shards to mend fading echoes.",
  "Avoid shadow echoes that lurk in the Rift.",
  "Master your focus and dash to survive.",
  "Your journey shapes the fate of forgotten souls.",
];

const storyFragments = [
  "A shard’s glow warms your paws.",
  "Whispers of old friends echo faintly.",
  "The Rift bends, challenging your resolve.",
  "Fragments of the past sing softly.",
  "Shadows flicker, but hope persists.",
  "Run faster, Elae. Freedom beckons.",
];

let narrationQueue = [];
let narrationVisible = false;
let narrationAlpha = 0;
let narrationTimer = 0;
const narrationFadeSpeed = 0.02;

function showNarration(text) {
  narrationQueue.push(text);
  if (!narrationVisible) {
    narrationVisible = true;
    narrationAlpha = 0;
    narrationTimer = 0;
  }
}

function updateNarration() {
  if (!narrationVisible) return;

  if (narrationAlpha < 1 && narrationTimer < 60) {
    narrationAlpha += narrationFadeSpeed;
    if (narrationAlpha > 1) narrationAlpha = 1;
  } else if (narrationTimer >= 180) {
    narrationAlpha -= narrationFadeSpeed;
    if (narrationAlpha <= 0) {
      narrationAlpha = 0;
      narrationTimer = 0;
      narrationQueue.shift();
      if (narrationQueue.length === 0) narrationVisible = false;
    }
  }
  narrationTimer++;
}

function drawNarration() {
  if (!narrationVisible || narrationQueue.length === 0) return;

  ctx.save();
  ctx.globalAlpha = narrationAlpha;
  const padding = 20;
  const boxWidth = WIDTH - 60;
  const boxHeight = 80;
  const x = 30;
  const y = HEIGHT - boxHeight - 30;

  ctx.fillStyle = "rgba(30, 30, 60, 0.85)";
  roundRect(ctx, x, y, boxWidth, boxHeight, 12, true);

  ctx.fillStyle = "#d0d9ff";
  ctx.font = "18px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(narrationQueue[0], WIDTH / 2, y + boxHeight / 2);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r, fill) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
}

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === "f" && !elae.focusActive && gameRunning) {
    elae.focusActive = true;
    elae.focusTimer = maxFocusDuration;
    powerUp = "Focus — slowing Rift & shadows";
    showNarration("Elae’s focus slows the Rift's pace...");
  }

  if (e.key === "Enter" && !gameRunning) {
    startGame();
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function resetGame() {
  score = 0;
  shardsCollected = 0;
  powerUp = "None";
  elae.x = 60;
  elae.y = groundY;
  elae.vy = 0;
  elae.jumping = false;
  elae.dashing = false;
  elae.dashCooldown = 0;
  elae.dashTimeLeft = 0;
  elae.blinkTimer = 0;
  elae.spriteFrame = 0;
  elae.tailWag = 0;
  elae.shield = false;
  elae.shieldTimer = 0;
  elae.focusActive = false;
  elae.focusTimer = 0;

  obstacles = [];
  crystals = [];
  frameCount = 0;
  gameSpeed = baseSpeed;
  currentRiftIndex = 0;

  narrationQueue = [...storyPieces];
  narrationVisible = true;
  narrationAlpha = 0;
  narrationTimer = 0;
}

function startGame() {
  gameRunning = true;
  resetGame();
  update();
}

function nextRiftState() {
  if (currentRiftIndex < riftStates.length - 1) {
    currentRiftIndex++;
    showNarration(`The Rift grows ${riftStates[currentRiftIndex].name}...`);
  }
}

function drawElae() {
  elae.blinkTimer++;
  if (elae.blinkTimer > 200) {
    elae.spriteFrame = 1;
    if (elae.blinkTimer > 215) {
      elae.spriteFrame = 0;
      elae.blinkTimer = 0;
    }
  } else {
    elae.spriteFrame = 0;
  }

  elae.tailWag = Math.sin(frameCount / 10) * 2;

  ctx.save();
  ctx.translate(elae.x, elae.y + elae.tailWag);

  ctx.fillStyle = "#888";
  ctx.fillRect(0, 10, elae.width, 14);

  ctx.fillStyle = "#bbb";
  ctx.beginPath();
  ctx.ellipse(elae.width / 2, 10, 14, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  if (elae.spriteFrame === 0) {
    ctx.fillRect(8, 5, 4, 4);
    ctx.fillRect(elae.width - 14, 5, 4, 4);
  } else {
    ctx.fillRect(8, 7, 5, 1);
    ctx.fillRect(elae.width - 15, 7, 5, 1);
  }

  ctx.fillStyle = "#666";
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(10, 0);
  ctx.lineTo(7, 7);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(elae.width - 4, 0);
  ctx.lineTo(elae.width - 10, 0);
  ctx.lineTo(elae.width - 7, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach((obs) => {
    ctx.fillStyle = obs.color;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  });
}

function drawCrystals() {
  crystals.forEach((c) => {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateObjects() {
  const riftSpeedMult = riftStates[currentRiftIndex].speedMult;
  const focusMult = elae.focusActive ? 0.5 : 1;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    let o = obstacles[i];
    o.x -= gameSpeed * riftSpeedMult * focusMult;

    if (
      elae.x < o.x + o.width &&
      elae.x + elae.width > o.x &&
      elae.y < o.y + o.height &&
      elae.y + elae.height > o.y
    ) {
      if (elae.shield) {
        elae.shield = false;
        showNarration("Your shield absorbs the shadow’s strike.");
        obstacles.splice(i, 1);
        continue;
      }
      endGame();
      return;
    }

    if (o.x + o.width < 0) {
      obstacles.splice(i, 1);
      score++;
      // Smooth speed increase capped by maxSpeed
      gameSpeed = Math.min(baseSpeed + score * 0.05, maxSpeed);
      // Rift state upgrade every 15 points maxed at last state
      if (score % 15 === 0 && currentRiftIndex < riftStates.length - 1) {
        nextRiftState();
      }
    }
  }

  for (let i = crystals.length - 1; i >= 0; i--) {
    let c = crystals[i];
    c.x -= gameSpeed * riftSpeedMult * focusMult;

    if (
      elae.x < c.x + c.radius &&
      elae.x + elae.width > c.x - c.radius &&
      elae.y < c.y + c.radius &&
      elae.y + elae.height > c.y - c.radius
    ) {
      crystals.splice(i, 1);
      shardsCollected++;
      powerUp = "Memory Shard";
      showNarration("A shard’s warmth rekindles your spirit.");

      if (shardsCollected % 5 === 0) {
        const frag = storyFragments[(shardsCollected / 5 - 1) % storyFragments.length];
        showNarration(frag);
      }
    } else if (c.x + c.radius < 0) {
      crystals.splice(i, 1);
    }
  }
}

function spawnObjects() {
  const riftSpeedMult = riftStates[currentRiftIndex].speedMult;
  const focusMult = elae.focusActive ? 0.5 : 1;

  if (frameCount % Math.floor(100 / riftSpeedMult / focusMult) === 0) {
    obstacles.push({
      x: WIDTH,
      y: groundY + 5,
      width: 30,
      height: 30,
      color: "rgba(100, 0, 0, 0.7)",
    });
  }

  if (frameCount % Math.floor(160 / riftSpeedMult / focusMult) === 0) {
    crystals.push({
      x: WIDTH,
      y: groundY - 18,
      radius: 12,
      color: "rgba(0, 255, 255, 0.8)",
    });
  }
}

function updateElae() {
  elae.vy += gravity;
  elae.y += elae.vy;

  if (elae.y > groundY) {
    elae.y = groundY;
    elae.vy = 0;
    elae.jumping = false;
  }

  if (keys[" "] && !elae.jumping && !elae.dashing) {
    elae.vy = -14;
    elae.jumping = true;
  }

  if (keys["d"] && !elae.dashing && elae.dashCooldown <= 0) {
    elae.dashing = true;
    elae.dashTimeLeft = 15;
    elae.dashCooldown = 90;
    powerUp = "Dash";
    showNarration("Elae dashes swiftly!");
  }

  if (elae.dashing) {
    elae.x += 20;
    elae.dashTimeLeft--;
    if (elae.dashTimeLeft <= 0) elae.dashing = false;
  }

  if (elae.dashCooldown > 0) elae.dashCooldown--;

  if (elae.focusActive) {
    elae.focusTimer--;
    if (elae.focusTimer <= 0) {
      elae.focusActive = false;
      powerUp = "None";
      showNarration("Elae’s focus fades...");
    }
  }

  if (elae.x + elae.width > WIDTH) elae.x = WIDTH - elae.width;
  if (elae.x < 0) elae.x = 0;
}

function drawUI() {
  ctx.fillStyle = "#d0d9ff";
  ctx.font = "16px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 15, 30);
  ctx.fillText(`Shards: ${shardsCollected}`, 15, 55);
  ctx.fillText(`Power-Up: ${powerUp}`, 15, 80);
  ctx.fillText(`Rift State: ${riftStates[currentRiftIndex].name}`, 15, 105);

  if (!gameRunning) {
    ctx.textAlign = "center";
    ctx.font = "24px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    ctx.fillText("Press ENTER to Start Elae’s Journey", WIDTH / 2, HEIGHT / 2);
  }
}

function endGame() {
  gameRunning = false;
  showNarration(`Elae’s journey ends with a score of ${score}. Press ENTER to restart.`);
}

function update() {
  frameCount++;

  ctx.fillStyle = riftStates[currentRiftIndex].bgColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (gameRunning) {
    spawnObjects();
    updateElae();
    updateObjects();
  }

  drawElae();
  drawObstacles();
  drawCrystals();
  drawUI();
  updateNarration();
  drawNarration();

  requestAnimationFrame(update);
}

update();
