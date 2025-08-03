// EchoRift: Elae’s Journey - Complete Gameplay Script

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const groundY = HEIGHT - 60;

// Elae - the pixel cat runner
const elae = {
  x: 60,
  y: groundY,
  width: 32,
  height: 32,
  vy: 0,
  jumping: false,
  dashing: false,
  dashCooldown: 0,
  dashTimeLeft: 0,
  speedX: 0,
  blinkTimer: 0,
  spriteFrame: 0,
  tailWag: 0,
  shield: false,
  shieldTimer: 0,
  focusActive: false,
  focusTimer: 0,
};

const gravity = 0.8;

let obstacles = [];
let crystals = [];

let shardsCollected = 0;
let score = 0;
let powerUp = "None";
let gameSpeed = 5;

let frameCount = 0;
let gameRunning = false;

const keys = {};

// Rift states (affect speed and background color)
const riftStates = [
  { name: "Stable", speedMult: 1, bgColor: "#0b1a33" },
  { name: "Shifting", speedMult: 1.25, bgColor: "#2b1a3d" },
  { name: "Unraveling", speedMult: 1.6, bgColor: "#4b134d" },
  { name: "Fractured", speedMult: 2, bgColor: "#6b0f5a" },
];
let currentRiftIndex = 0;

const maxFocusDuration = 180;

// Story fragments (to show via alert or UI)
const storyFragments = [
  "A soft glow warms your paws, a shard close by.",
  "You feel a distant purr... a friend or foe?",
  "The Rift shifts; reality blurs and bends.",
  "Each shard you gather sings a forgotten tune.",
  "Echoes whisper secrets of hope and loss.",
  "Your heart races. Freedom feels close.",
];

// --- Controls ---
document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === "f" && !elae.focusActive && gameRunning) {
    elae.focusActive = true;
    elae.focusTimer = maxFocusDuration;
    powerUp = "Focus — slowing Rift & shadows";
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// --- Reset game to initial state ---
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
  elae.speedX = 0;
  elae.shield = false;
  elae.shieldTimer = 0;
  elae.focusActive = false;
  elae.focusTimer = 0;
  elae.blinkTimer = 0;
  elae.spriteFrame = 0;
  elae.tailWag = 0;

  obstacles = [];
  crystals = [];
  frameCount = 0;
  gameSpeed = 5;
  currentRiftIndex = 0;
}

// --- Start the game loop ---
function startGame() {
  gameRunning = true;
  resetGame();
  update();
}

// --- Change Rift state based on shards collected ---
function nextRiftState() {
  if (currentRiftIndex < riftStates.length - 1) currentRiftIndex++;
}

// --- Draw Elae, with blinking and tail wag animation ---
function drawElae() {
  elae.blinkTimer++;
  if (elae.blinkTimer > 200) {
    elae.spriteFrame = 1; // eyes closed
    if (elae.blinkTimer > 215) {
      elae.spriteFrame = 0; // eyes open
      elae.blinkTimer = 0;
    }
  } else {
    elae.spriteFrame = 0;
  }

  elae.tailWag = Math.sin(frameCount / 10) * 2;

  // Simple drawing: body and head (replace with sprite if available)
  ctx.save();
  ctx.translate(elae.x, elae.y + elae.tailWag);

  // Body
  ctx.fillStyle = "#888888";
  ctx.fillRect(0, 10, elae.width, 14);

  // Head (circle)
  ctx.fillStyle = "#bbbbbb";
  ctx.beginPath();
  ctx.ellipse(elae.width / 2, 10, 14, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (open or closed)
  ctx.fillStyle = "#000000";
  if (elae.spriteFrame === 0) {
    // open eyes
    ctx.fillRect(8, 5, 4, 4);
    ctx.fillRect(elae.width - 14, 5, 4, 4);
  } else {
    // closed eyes (lines)
    ctx.fillRect(8, 7, 5, 1);
    ctx.fillRect(elae.width - 15, 7, 5, 1);
  }

  // Ears (triangles)
  ctx.fillStyle = "#666666";
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

// --- Draw obstacles (shadow echoes) ---
function drawObstacles() {
  obstacles.forEach((obs) => {
    ctx.fillStyle = obs.color;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  });
}

// --- Draw crystals (memory shards) ---
function drawCrystals() {
  crystals.forEach((c) => {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

// --- Update obstacles & crystals ---
function updateObjects() {
  const riftSpeedMult = riftStates[currentRiftIndex].speedMult;
  const focusMult = elae.focusActive ? 0.5 : 1;

  // Move obstacles and check if offscreen or collide
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let o = obstacles[i];
    o.x -= gameSpeed * riftSpeedMult * focusMult;

    // Collision with Elae
    if (
      elae.x < o.x + o.width &&
      elae.x + elae.width > o.x &&
      elae.y < o.y + o.height &&
      elae.y + elae.height > o.y
    ) {
      if (elae.shield) {
        elae.shield = false;
        obstacles.splice(i, 1);
        continue;
      }
      endGame();
      return;
    }

    // Remove offscreen obstacles and increment score for each avoided
    if (o.x + o.width < 0) {
      obstacles.splice(i, 1);
      score++;
      if (score % 10 === 0 && currentRiftIndex < riftStates.length - 1) {
        nextRiftState();
      }
    }
  }

  // Move crystals and check collection
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
      if (shardsCollected % 5 === 0) {
        alert(storyFragments[(shardsCollected / 5 - 1) % storyFragments.length]);
      }
    } else if (c.x + c.radius < 0) {
      crystals.splice(i, 1);
    }
  }
}

// --- Spawn obstacles and crystals ---
function spawnObjects() {
  const riftSpeedMult = riftStates[currentRiftIndex].speedMult;
  const focusMult = elae.focusActive ? 0.5 : 1;

  if (frameCount % Math.floor(80 / riftSpeedMult / focusMult) === 0) {
    obstacles.push({
      x: WIDTH,
      y: groundY + 5,
      width: 30,
      height: 30,
      color: "rgba(100, 0, 0, 0.7)",
    });
  }

  if (frameCount % Math.floor(140 / riftSpeedMult / focusMult) === 0) {
    crystals.push({
      x: WIDTH,
      y: groundY - 18,
      radius: 12,
      color: "rgba(0, 255, 255, 0.8)",
    });
  }
}

// --- Main update loop ---
function update() {
  if (!gameRunning) return;

  frameCount++;

  // Background color changes with Rift state
  const bg = riftStates[currentRiftIndex].bgColor;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Handle dash timer
  if (elae.dashTimeLeft > 0) {
    elae.dashTimeLeft--;
    elae.speedX = 15;
  } else {
    elae.speedX = 0;
    if (elae.dashCooldown > 0) elae.dashCooldown--;
    elae.dashing = false;
  }

  // Handle horizontal movement by dash
  elae.x += elae.speedX;
  elae.x = Math.min(Math.max(elae.x, 0), WIDTH - elae.width);

  // Jumping
  if (keys[" "] && !elae.jumping) {
    elae.vy = -14;
    elae.jumping = true;
  }

  // Dash (D key)
  if (
    keys["d"] &&
    elae.dashCooldown === 0 &&
    !elae.dashing &&
    !elae.jumping
  ) {
    elae.dashing = true;
    elae.dashTimeLeft = 15;
    elae.dashCooldown = 90;
  }

  // Focus (F key)
  if (elae.focusActive) {
    elae.focusTimer--;
    if (elae.focusTimer <= 0) {
      elae.focusActive = false;
      powerUp = "None";
    }
  }

  // Gravity and vertical movement
  elae.vy += gravity;
  elae.y += elae.vy;
  if (elae.y >= groundY) {
    elae.y = groundY;
    elae.vy = 0;
    elae.jumping = false;
  }

  spawnObjects();
  updateObjects();

  // Draw all game elements
  drawElae();
  drawObstacles();
  drawCrystals();

  // Draw UI overlay
  drawUI();

  requestAnimationFrame(update);
}

// --- Draw UI ---
function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "18px sans-serif";
  ctx.fillText(`Score: ${score}`, 10, 25);
  ctx.fillText(`Shards: ${shardsCollected}`, 10, 50);
  ctx.fillText(`Power-up: ${powerUp}`, 10, 75);
  ctx.fillText(`Rift: ${riftStates[currentRiftIndex].name}`, 10, 100);

  if (elae.dashCooldown > 0) {
    ctx.fillStyle = "cyan";
    ctx.fillRect(10, 110, 100 * (1 - elae.dashCooldown / 90), 10);
    ctx.strokeStyle = "white";
    ctx.strokeRect(10, 110, 100, 10);
    ctx.fillStyle = "white";
    ctx.fillText("Dash Cooldown", 10, 105);
  }

  if (elae.focusActive) {
    ctx.fillStyle = "magenta";
    ctx.fillRect(10, 130, 100 * (elae.focusTimer / maxFocusDuration), 10);
    ctx.strokeStyle = "white";
    ctx.strokeRect(10, 130, 100, 10);
    ctx.fillStyle = "white";
    ctx.fillText("Focus Power", 10, 125);
  }

  if (elae.shield) {
    ctx.fillStyle = "cyan";
    ctx.fillText("Shield Active", WIDTH - 140, 25);
  }
}

// --- Game over ---
function endGame() {
  gameRunning = false;
  alert(`Game Over!\nYour final score was: ${score}\nShards collected: ${shardsCollected}\n\nRun again to uncover more echoes...`);
  // Optionally reset game here or show restart UI
  resetGame();
  startGame();
}

// --- Initialize and start ---
startGame();
