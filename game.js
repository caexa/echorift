const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const storyBox = document.getElementById("story-box");
const introTextEl = document.getElementById("intro-text");
const nextIntroBtn = document.getElementById("next-intro-btn");
const ui = document.getElementById("ui");
const scoreDisplay = document.getElementById("score");
const shardsDisplay = document.getElementById("shards");
const powerDisplay = document.getElementById("power");
const riftStateDisplay = document.getElementById("rift-state");
const gameOverScreen = document.getElementById("game-over");
const finalScoreDisplay = document.getElementById("final-score");
const reflectionText = document.getElementById("reflection-text");
const restartBtn = document.getElementById("restart-btn");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let gameRunning = false;

const gravity = 0.7;
const groundLevel = HEIGHT - 50;

const player = {
  x: 60,
  y: groundLevel,
  width: 38,
  height: 48,
  vy: 0,
  jumping: false,
  dashing: false,
  dashCooldown: 0,
  dashDuration: 0,
  speedX: 0,
  color: "#bb88ff",
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
let gameSpeed = 5;
let frameCount = 0;

const keys = {};

// Narrative and world-building elements
const introTexts = [
  "I awake within the Echo Rift — a dimension born of fractured memories.",
  "Fragments of forgotten lives whisper to me as I run.",
  "The Rift twists, folding time and space, hungry to consume me.",
  "I must collect the Memory Shards — they may hold the key to escape.",
  "But the Rift is alive... and it will fight back.",
  "Only through focus and speed can I survive its wrath."
];
let introIndex = 0;

const storyFragments = [
  "The echo of a lost child calling in the distance...",
  "I sense a shimmer — a memory, long buried.",
  "Each shard pulses with faint light — a fragment of a soul.",
  "I hear voices... warning me to beware the Rift’s guardians.",
  "The ground shakes. The Rift remembers.",
  "Will I fade like the echoes, or break free?"
];

const reflections = [
  "The Echo Rift collapses again, but your spirit lingers.",
  "You outran the darkness... for now.",
  "Every shard collected brings hope, yet binds you closer.",
  "You faced the Rift’s fury — the story is far from over.",
  "Your footsteps echo beyond the Rift."
];

// Rift states for dynamic environment
const riftStates = [
  { name: "Stable", speedMultiplier: 1, bgColor: "#0c0c20" },
  { name: "Fractured", speedMultiplier: 1.2, bgColor: "#220022" },
  { name: "Unraveling", speedMultiplier: 1.5, bgColor: "#440044" },
  { name: "Collapsing", speedMultiplier: 2, bgColor: "#660066" }
];
let currentRiftStateIndex = 0;

function nextRiftState() {
  if (currentRiftStateIndex < riftStates.length - 1) {
    currentRiftStateIndex++;
  }
}

const maxFocusDuration = 180; // frames (~3 seconds)

// Controls
document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  // Focus power (F key)
  if (e.key.toLowerCase() === "f" && !player.focusActive && gameRunning) {
    player.focusActive = true;
    player.focusTimer = maxFocusDuration;
    powerUp = "Focus — slowing Rift & hazards";
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

nextIntroBtn.onclick = () => {
  introIndex++;
  if (introIndex < introTexts.length) {
    introTextEl.innerHTML = introTexts[introIndex].replace(/\n/g, "<br>");
  } else {
    storyBox.style.display = "none";
    canvas.style.display = "block";
    ui.style.display = "block";
    startGame();
  }
};

restartBtn.onclick = () => {
  gameOverScreen.style.display = "none";
  canvas.style.display = "block";
  ui.style.display = "block";
  resetGame();
  startGame();
};

function resetGame() {
  score = 0;
  shardsCollected = 0;
  powerUp = "None";
  player.x = 60;
  player.y = groundLevel;
  player.vy = 0;
  player.jumping = false;
  player.dashing = false;
  player.dashCooldown = 0;
  player.dashDuration = 0;
  player.speedX = 0;
  player.shield = false;
  player.shieldTimer = 0;
  player.focusActive = false;
  player.focusTimer = 0;

  obstacles = [];
  crystals = [];
  frameCount = 0;
  gameSpeed = 5;
  currentRiftStateIndex = 0;
}

function startGame() {
  gameRunning = true;
  resetGame();
  update();
}

function showStoryFragment() {
  if (shardsCollected > 0 && shardsCollected % 4 === 0) {
    const index = Math.floor(((shardsCollected / 4) - 1) % storyFragments.length);
    alert(`Echoes:\n\n${storyFragments[index]}`);
  }
}

function update() {
  if (!gameRunning) return;

  frameCount++;

  // Change Rift state every 30 shards collected
  if (shardsCollected > 0 && shardsCollected % 30 === 0) {
    nextRiftState();
  }

  const riftState = riftStates[currentRiftStateIndex];
  gameSpeed = 5 * riftState.speedMultiplier;
  document.body.style.background = `linear-gradient(to bottom, ${riftState.bgColor}, #220022)`;
  riftStateDisplay.textContent = riftState.name;

  // Clear canvas
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Apply gravity and movement
  if (player.dashDuration > 0) {
    player.dashDuration--;
    player.speedX = 20;
  } else {
    player.speedX = 0;
    if (player.dashCooldown > 0) player.dashCooldown--;
    player.dashing = false;
  }

  player.x += player.speedX;
  player.x = Math.min(Math.max(player.x, 0), WIDTH - player.width);

  // Jump
  if (keys[" "] && !player.jumping) {
    player.vy = -14;
    player.jumping = true;
  }

  // Dash
  if (
    keys["d"] &&
    player.dashCooldown === 0 &&
    !player.dashing &&
    !player.jumping
  ) {
    player.dashing = true;
    player.dashDuration = 15;
    player.dashCooldown = 90;
  }

  // Focus power: slows time, hazards, etc
  if (player.focusActive) {
    player.focusTimer--;
    if (player.focusTimer <= 0) {
      player.focusActive = false;
      powerUp = "None";
    }
  }

  // Gravity & position update
  player.vy += gravity;
  player.y += player.vy;
  if (player.y >= groundLevel) {
    player.y = groundLevel;
    player.vy = 0;
    player.jumping = false;
  }

  // Spawn obstacles faster with rift state & slow with focus
  if (
    frameCount % Math.floor(80 / riftState.speedMultiplier / (player.focusActive ? 0.5 : 1)) ===
    0
  ) {
    obstacles.push({
      x: WIDTH,
      y: groundLevel + 5,
      width: 30,
      height: 30,
      color: "#d45555",
      passed: false,
    });
  }

  // Spawn crystals more often as Rift destabilizes
  if (
    frameCount % Math.floor(140 / riftState.speedMultiplier / (player.focusActive ? 0.5 : 1)) ===
    0
  ) {
    crystals.push({
      x: WIDTH,
      y: groundLevel - 18,
      radius: 14,
      color: "#55ddd8",
    });
  }

  // Move obstacles & check collisions
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.x -= gameSpeed * (player.focusActive ? 0.5 : 1);

    ctx.fillStyle = obs.color;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y + player.height > obs.y
    ) {
      if (player.shield) {
        player.shield = false;
        player.shieldTimer = 0;
        obstacles.splice(i, 1);
        continue;
      }
      gameOver();
      return;
    }

    if (obs.x + obs.width < 0) {
      if (!obs.passed) {
        score++;
        obs.passed = true;
      }
      obstacles.splice(i, 1);
    }
  }

  // Move crystals & check collection
  for (let i = crystals.length - 1; i >= 0; i--) {
    let c = crystals[i];
    c.x -= gameSpeed * (player.focusActive ? 0.5 : 1);

    // Draw glowing crystal
    const gradient = ctx.createRadialGradient(
      c.x + c.radius / 2,
      c.y + c.radius / 2,
      c.radius / 4,
      c.x + c.radius / 2,
      c.y + c.radius / 2,
      c.radius
    );
    gradient.addColorStop(0, "#aaffff");
    gradient.addColorStop(1, "#004444");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();

    // Collision check
    const distX = player.x + player.width / 2 - c.x;
    const distY = player.y + player.height / 2 - c.y;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist < c.radius + Math.min(player.width, player.height) / 2) {
      shardsCollected++;
      showStoryFragment();

      // 25% chance to grant or lose shield (symbolizing risk & reward)
      if (Math.random() < 0.25) {
        if (!player.shield) {
          player.shield = true;
          player.shieldTimer = 360; // 6 seconds
          powerUp = "Lira's Resolve — holding darkness at bay";
        } else {
          // Lose shield & add score penalty (symbolizing Rift's corruption)
          player.shield = false;
          player.shieldTimer = 0;
          score = Math.max(score - 3, 0);
          powerUp = "Rift Corruption — shield lost";
        }
      }

      crystals.splice(i, 1);
      continue;
    }

    if (c.x + c.radius < 0) crystals.splice(i, 1);
  }

  // Shield timer countdown
  if (player.shield) {
    player.shieldTimer--;
    if (player.shieldTimer <= 0) {
      player.shield = false;
      powerUp = "None";
    }
  }

  // Draw player with glowing effect when shielded or focused
  ctx.fillStyle = player.color;
  if (player.shield) {
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 18;
  } else if (player.focusActive) {
    ctx.shadowColor = "#ff88ff";
    ctx.shadowBlur = 18;
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.shadowBlur = 0;

  // Draw ground (with subtle ripple when Rift unstable)
  ctx.fillStyle = riftState.name === "Stable" ? "#222244" : "#440044";
  const rippleHeight = riftState.name === "Stable" ? 0 : 2 + Math.sin(frameCount / 5) * 2;
  ctx.fillRect
