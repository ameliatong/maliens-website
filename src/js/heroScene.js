import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";


export function initHeroScene() {
// =====================
// Scene
// =====================
const scene = new THREE.Scene();

// =====================
// Game timing / callbacks
// =====================
let lastTime = performance.now();
let updateGame = function () {};
let drawGame = function () {};

// =====================
// BACKGROUND IMAGE
// =====================
const textureLoader = new THREE.TextureLoader();

textureLoader.load(
  "image/galaxy.png",
  (bgTexture) => {
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = bgTexture;
  },
  undefined,
  (error) => {
    console.error("❌ Background image load error:", error);
  }
);

// =====================
// Camera
// =====================
const camera = new THREE.PerspectiveCamera(
  30,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// =====================
// Renderer
// =====================
const heroCanvas = document.getElementById("heroCanvas");

const renderer = new THREE.WebGLRenderer({
  canvas: heroCanvas,
  antialias: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.zIndex = "1";



// =====================
// DOM
// =====================
const heroText = document.querySelector(".hero-text");

// Target the unified wrapper instead of just next-section
const scrollSections = document.getElementById("scrollSections");


// =====================
// Timing Controls
// =====================
const animationDuration = 1.2;
const marqueeDuration = 0.6;
const textDelay = 0.8;

let heroFadeTimeout = null;

// =====================
// State
// =====================
let scrollModeEnabled = false;
let enableScrollStageTimeout = null;

let nextSectionRevealTimeout = null;
let nextSectionHiddenUntil = 0;

let isZooming = false;
let isInside = false;
let zoomStartTime = 0;

// =====================
// Virtual Scroll
// =====================
let virtualScroll = 0;
let targetScroll = 0;

// Max hero scroll = first section height (105vh)
function getMaxHeroScroll() {
  return window.innerHeight * 1.05;
}

// Total scrollable height = both sections combined
function getTotalSectionsHeight() {
  return scrollSections ? scrollSections.offsetHeight : window.innerHeight * 2.1;
}

const virtualScrollEase = 0.18;

// =====================
// Orbit Controls
// =====================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enableZoom = false;
controls.enableRotate = false;
controls.enablePan = false;

// =====================
// 3D MARQUEE BACKGROUND
// =====================
const canvas2D = document.createElement("canvas");
const ctx = canvas2D.getContext("2d");

const text = "Maliens Agency";
const fontSize = 200;
const fontFamily = "Michroma, sans-serif";

ctx.font = `bold ${fontSize}px ${fontFamily}`;

const metrics = ctx.measureText(text);
const textWidth = metrics.width;
const ascent = metrics.actualBoundingBoxAscent;
const descent = metrics.actualBoundingBoxDescent;
const textHeight = ascent + descent;

const gap = 300;
const letterSpacing = 5;
const dpr = window.devicePixelRatio || 1;

canvas2D.width = (textWidth + gap) * dpr;
canvas2D.height = textHeight * dpr;

ctx.scale(dpr, dpr);
ctx.font = `bold ${fontSize}px ${fontFamily}`;
ctx.fillStyle = "white";
ctx.textAlign = "left";
ctx.textBaseline = "alphabetic";

let x = 0;

for (let i = 0; i < text.length; i++) {
  const char = text[i];
  ctx.fillText(char, x, ascent);
  const charWidth = ctx.measureText(char).width;
  x += charWidth + letterSpacing;
}

const texture = new THREE.CanvasTexture(canvas2D);
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.generateMipmaps = false;
texture.wrapS = THREE.RepeatWrapping;
texture.repeat.x = 1;

const aspect = canvas2D.width / canvas2D.height;
const planeHeight = 3;
const planeWidth = planeHeight * aspect;

const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

const material = new THREE.MeshBasicMaterial({
  map: texture,
  transparent: true,
  opacity: 1,
  depthWrite: false
});

const marquee = new THREE.Mesh(geometry, material);
marquee.position.set(0, 0, -10);
scene.add(marquee);

// =====================
// MOON IMAGE LAYER
// =====================
let moon;

const moonBaseScale = 1.2;
const moonScrollScale = 1;

const moonBaseY = -15;
const moonScrollY = -18.5;

textureLoader.load(
  "image/earth.png",
  (moonTexture) => {
    moonTexture.colorSpace = THREE.SRGBColorSpace;

    const img = moonTexture.image;
    const moonAspect = img.width / img.height;

    const moonHeight = 40;
    const moonWidth = moonHeight * moonAspect;

    const moonMaterial = new THREE.MeshBasicMaterial({
      map: moonTexture,
      transparent: true,
      depthWrite: false
    });

    const moonGeometry = new THREE.PlaneGeometry(moonWidth, moonHeight);
    moon = new THREE.Mesh(moonGeometry, moonMaterial);

    camera.add(moon);
    scene.add(camera);

    moon.position.set(0, moonBaseY, -38);
    moon.scale.setScalar(moonBaseScale);
  },
  undefined,
  (error) => {
    console.error("❌ Moon image load error:", error);
  }
);

// =====================
// Camera State
// =====================
let model;
let mainScreen = null;

const START_CAMERA = new THREE.Vector3(-0.8, -1, 14);
const END_CAMERA = new THREE.Vector3(-2.5, -1, 22);

const initialCameraPosition = new THREE.Vector3();
const initialTargetPosition = new THREE.Vector3();

const zoomCameraPosition = new THREE.Vector3();
const zoomLookAtPosition = new THREE.Vector3();

const animationStartCamera = new THREE.Vector3();
const animationStartTarget = new THREE.Vector3();
const animationEndCamera = new THREE.Vector3();
const animationEndTarget = new THREE.Vector3();

// =====================
// Interaction / Animation Helpers
// =====================
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let mixer;
let handleAction;

// =====================
// Helpers
// =====================
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function setResponsiveCamera(applyToCamera = true) {
  const width = window.innerWidth;

  const t = THREE.MathUtils.mapLinear(
    width,
    1920,
    375,
    0,
    1
  );

  const clampedT = THREE.MathUtils.clamp(t, 0, 1);

  const startCamera = new THREE.Vector3(0, -2, 10);
  const endCamera = new THREE.Vector3(0, 0, 22);

  const startTarget = new THREE.Vector3(-0.2, -2, 0);
  const endTarget = new THREE.Vector3(0, 1.6, -12);

  const responsiveCamera = new THREE.Vector3();
  const responsiveTarget = new THREE.Vector3();

  responsiveCamera.lerpVectors(startCamera, endCamera, clampedT);
  responsiveTarget.lerpVectors(startTarget, endTarget, clampedT);

  initialCameraPosition.copy(responsiveCamera);
  initialTargetPosition.copy(responsiveTarget);

  if (applyToCamera) {
    camera.position.copy(responsiveCamera);
    controls.target.copy(responsiveTarget);
    controls.update();
  }
}

function resetVirtualScroll() {
  virtualScroll = 0;
  targetScroll = 0;

  if (heroText) {
    heroText.style.transform = "translateY(0px)";
  }

  if (scrollSections) {
    scrollSections.style.transform = `translate3d(0, ${window.innerHeight}px, 0)`;
  }
}

function hideScrollSections() {
  if (!scrollSections) return;

  if (nextSectionRevealTimeout) {
    clearTimeout(nextSectionRevealTimeout);
    nextSectionRevealTimeout = null;
  }

  scrollSections.style.visibility = "hidden";
  scrollSections.style.pointerEvents = "none";
}

function showScrollSectionsAfterDelay() {
  if (!scrollSections || !isInside) return;

  const remainingDelay = Math.max(0, nextSectionHiddenUntil - performance.now());

  if (nextSectionRevealTimeout) {
    clearTimeout(nextSectionRevealTimeout);
  }

  nextSectionRevealTimeout = setTimeout(() => {
    if (!isInside || !scrollSections) return;

    scrollSections.style.visibility = "visible";
    scrollSections.style.pointerEvents = "auto";
    nextSectionRevealTimeout = null;
  }, remainingDelay);
}

function clearPendingSecondStageEnable() {
  if (enableScrollStageTimeout !== null) {
    clearTimeout(enableScrollStageTimeout);
    enableScrollStageTimeout = null;
  }
}

function scheduleHeroTextFade() {
  if (!heroText) return;

  if (heroFadeTimeout) {
    clearTimeout(heroFadeTimeout);
    heroFadeTimeout = null;
  }

  if (isInside) {
    heroText.style.transition = "opacity 1.2s ease";
    heroText.style.opacity = 0;

    heroFadeTimeout = setTimeout(() => {
      if (isInside && heroText) {
        heroText.style.opacity = 1;
      }
    }, textDelay * 1000);
  } else {
    heroText.style.transition = "opacity 0.35s ease";
    heroText.style.opacity = 0;
  }
}

function enableSecondScrollStage() {
  clearPendingSecondStageEnable();

  scrollModeEnabled = false;
  document.body.style.overflowY = "hidden";
  resetVirtualScroll();

  enableScrollStageTimeout = setTimeout(() => {
    if (!isInside) return;

    scrollModeEnabled = true;
    enableScrollStageTimeout = null;
  }, 100);
}

function disableSecondScrollStage() {
  clearPendingSecondStageEnable();

  scrollModeEnabled = false;
  document.body.style.overflowY = "hidden";
  resetVirtualScroll();
  hideScrollSections();
}

function startCameraMove(toCameraPos, toTargetPos) {
  clearPendingSecondStageEnable();

  animationStartCamera.copy(camera.position);
  animationStartTarget.copy(controls.target);

  animationEndCamera.copy(toCameraPos);
  animationEndTarget.copy(toTargetPos);

  zoomStartTime = performance.now();
  isZooming = true;

  controls.enableDamping = false;
}

function finishCameraMove() {
  camera.position.copy(animationEndCamera);
  controls.target.copy(animationEndTarget);
  controls.update();

  material.opacity = isInside ? 0 : 1;

  if (moon) {
    const finalScale = isInside ? moonScrollScale : moonBaseScale;
    const finalY = isInside ? moonScrollY : moonBaseY;

    moon.scale.setScalar(finalScale);
    moon.position.y = finalY;
  }

  isZooming = false;
  controls.enableDamping = true;

  if (isInside) {
    enableSecondScrollStage();
    showScrollSectionsAfterDelay();
  } else {
    disableSecondScrollStage();
  }
}

function updateVirtualScroll() {
  if (!isInside) return;

  virtualScroll += (targetScroll - virtualScroll) * virtualScrollEase;

  // Hero text slides up as you scroll through the first section
  if (heroText) {
    const heroScrollAmt = Math.min(virtualScroll, getMaxHeroScroll());
    heroText.style.transform = `translateY(${-heroScrollAmt}px)`;
  }

  // Sections start just below the viewport (100vh) and slide up
  if (scrollSections) {
    const startY = window.innerHeight;
    const currentY = startY - virtualScroll;
    scrollSections.style.transform = `translate3d(0, ${currentY}px, 0)`;
  }
}

// =====================
// Model Loader
// =====================
const loader = new GLTFLoader();

loader.load(
  "model/homepage.glb",
  (gltf) => {
    model = gltf.scene;
    scene.add(model);

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const meshParts = [];
    model.traverse((child) => {
      if (child.isMesh) {
        meshParts.push({
          name: child.name || "(no name)",
          type: child.type
        });
      }
    });
    console.log("========== MESH PARTS ONLY ==========");
    console.table(meshParts);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    model.position.sub(center);
    model.scale.set(2.2, 2.2, 2.2);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);

      const clip = THREE.AnimationClip.findByName(
        gltf.animations,
        "Sphere.001Action"
      );

      if (clip) {
        handleAction = mixer.clipAction(clip);
        handleAction.setLoop(THREE.LoopOnce, 1);
        handleAction.clampWhenFinished = true;
      } else {
        console.warn('❌ Animation clip "Sphere.001Action" not found');
      }

      console.log("Animations:", gltf.animations.map((a) => a.name));
    } else {
      console.warn("❌ No animations found in GLB");
    }

    setResponsiveCamera();

    mainScreen = model.getObjectByName("main_screen");

    if (!mainScreen) {
      console.warn('❌ "main_screen" not found. Using fallback mesh.');
      model.traverse((child) => {
        if (!mainScreen && child.isMesh) {
          mainScreen = child;
        }
      });
    }

    if (mainScreen) {
      const worldPos = new THREE.Vector3();
      mainScreen.getWorldPosition(worldPos);

      zoomCameraPosition.copy(worldPos).add(new THREE.Vector3(0, 4, 0));
      zoomLookAtPosition.copy(worldPos).add(new THREE.Vector3(0, 4, 0));

      console.log("✅ target mesh found:", mainScreen.name);
      console.log("zoomCameraPosition:", zoomCameraPosition);
      console.log("zoomLookAtPosition:", zoomLookAtPosition);
    } else {
      console.warn("❌ No mesh found at all for zoom target");
    }

// =====================
// MINI CHARACTER SCREEN
// =====================
const miniCanvas = document.createElement("canvas");
miniCanvas.width = 512;
miniCanvas.height = 512;

const miniCtx = miniCanvas.getContext("2d");
miniCtx.imageSmoothingEnabled = false;

const miniTexture = new THREE.CanvasTexture(miniCanvas);
miniTexture.colorSpace = THREE.SRGBColorSpace;
miniTexture.flipY = false;
miniTexture.minFilter = THREE.NearestFilter;
miniTexture.magFilter = THREE.NearestFilter;

const miniAssets = {
  bg: new Image(),
  title: new Image(),
  character1: new Image(),
  character2: new Image(),
  character3: new Image(),
  label1: new Image(),
  label2: new Image(),
  label3: new Image(),
  arrowLeft: new Image(),
  arrowRight: new Image(),
};

miniAssets.bg.src = "image/miniScreen/ScreenMini.png";
miniAssets.title.src = "image/miniScreen/mini_title.png";
miniAssets.character1.src = "image/miniScreen/character_1.png";
miniAssets.character2.src = "image/miniScreen/character_2.png";
miniAssets.character3.src = "image/miniScreen/character_3.png";
miniAssets.label1.src = "image/miniScreen/label_1.png";
miniAssets.label2.src = "image/miniScreen/label_2.png";
miniAssets.label3.src = "image/miniScreen/label_3.png";
miniAssets.arrowLeft.src = "image/miniScreen/arrow_left.png";
miniAssets.arrowRight.src = "image/miniScreen/arrow_right.png";

const miniCharacters = [
  { character: miniAssets.character1, label: miniAssets.label1 },
  { character: miniAssets.character2, label: miniAssets.label2 },
  { character: miniAssets.character3, label: miniAssets.label3 },
];

let currentMiniCharacter = 0;
let miniPressedButton = null;

function drawImageContain(ctx, img, x, y, boxW, boxH) {
  if (!img.complete || !img.naturalWidth) return;

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = boxW / boxH;

  let drawW;
  let drawH;

  if (imgRatio > boxRatio) {
    drawW = boxW;
    drawH = boxW / imgRatio;
  } else {
    drawH = boxH;
    drawW = boxH * imgRatio;
  }

  const drawX = x + (boxW - drawW) / 2;
  const drawY = y + (boxH - drawH) / 2;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawMiniScreen() {
  miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

  if (miniAssets.bg.complete && miniAssets.bg.naturalWidth) {
    miniCtx.drawImage(miniAssets.bg, 0, 0, miniCanvas.width, miniCanvas.height);
  } else {
    miniCtx.fillStyle = "#003f2f";
    miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);
  }

  drawImageContain(miniCtx, miniAssets.title, 120, 62, 272, 95);

  const current = miniCharacters[currentMiniCharacter];

  drawImageContain(miniCtx, current.character, 178, 168, 156, 190);

  miniCtx.save();
  miniCtx.translate(92, 280);
  if (miniPressedButton === "left") miniCtx.scale(0.82, 0.82);
  drawImageContain(miniCtx, miniAssets.arrowLeft, -34, -34, 68, 68);
  miniCtx.restore();

  miniCtx.save();
  miniCtx.translate(420, 280);
  if (miniPressedButton === "right") miniCtx.scale(0.82, 0.82);
  drawImageContain(miniCtx, miniAssets.arrowRight, -34, -34, 68, 68);
  miniCtx.restore();

  drawImageContain(miniCtx, current.label, 135, 388, 242, 56);

  miniTexture.needsUpdate = true;
}

function changeMiniCharacter(direction) {
  currentMiniCharacter += direction;

  if (currentMiniCharacter < 0) {
    currentMiniCharacter = miniCharacters.length - 1;
  }

  if (currentMiniCharacter >= miniCharacters.length) {
    currentMiniCharacter = 0;
  }

  drawMiniScreen();
}

function pressMiniButton(buttonName) {
  miniPressedButton = buttonName;
  drawMiniScreen();

  setTimeout(() => {
    miniPressedButton = null;
    drawMiniScreen();
  }, 130);
}

function getMiniButtonFromUV(uv) {
  if (!uv) return null;

  const x = uv.x;
  const y = uv.y;

  const buttonY = y > 0.35 && y < 0.68;

  if (buttonY && x > 0.05 && x < 0.28) return "left";
  if (buttonY && x > 0.72 && x < 0.95) return "right";

  return null;
}

Object.values(miniAssets).forEach((img) => {
  img.onload = drawMiniScreen;
});

drawMiniScreen();

    // Screen image / vid
    // =====================
    // CRT GAME SCREEN
    // =====================
    const gameCanvas = document.createElement("canvas");
    gameCanvas.width = 1024;
    gameCanvas.height = 768;

    const gameCtx = gameCanvas.getContext("2d");
    gameCtx.imageSmoothingEnabled = false;

    const gameTexture = new THREE.CanvasTexture(gameCanvas);
    gameTexture.colorSpace = THREE.SRGBColorSpace;
    gameTexture.flipY = false;
    gameTexture.minFilter = THREE.NearestFilter;
    gameTexture.magFilter = THREE.NearestFilter;
    gameTexture.center.set(0.5, 0.5);
    gameTexture.rotation = Math.PI; // 180°

    const gameAssets = {
      bg: new Image(),
      cow: new Image(),
      monster: new Image(),
      logo: new Image(),
    };

    gameAssets.bg.src = "image/screenBg.png";
    gameAssets.cow.src = "image/cow.png";
    gameAssets.monster.src = "image/monster.png";
    gameAssets.logo.src = "image/gameLogo.png";

    const keys = {};

    let gameState = "start"; // start, playing, gameover
    let score = 0;

    let bulletTimer = 0;
    let blinkTimer = 0;

    const cow = {
      x: 220,
      y: 610,
      w: 120,
      h: 90,
      speed: 420,
      dir: 1,
      rotation: 0,
    };

    const monster = {
      x: 130,
      y: 110,
      w: 110,
      h: 70,
      followSpeed: 0.035,
    };

    let bullets = [];

    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;

      if (e.code === "Space") {
        if (gameState === "start" || gameState === "gameover") {
          resetGame();
          gameState = "playing";
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      keys[e.code] = false;
    });

    function resetGame() {
      score = 0;
      bulletTimer = 0;
      bullets = [];

      cow.x = 220;
      cow.y = 610;
      cow.dir = 1;
      cow.rotation = 0;

      monster.x = 130;
    }

    function spawnBullet() {
      const accurateShot = Math.random() > 0.78;

      const originX = monster.x + monster.w / 2;
      const originY = monster.y + monster.h;

      const targetX = accurateShot
        ? cow.x + cow.w / 2
        : originX + (Math.random() - 0.5) * 180;

      const width = Math.random() * 7 + 5;

      const dx = targetX - originX;

      bullets.push({
        x: originX - width / 2, // ✅ ALWAYS spawn at monster
        y: originY,
        w: width,
        h: Math.random() * 90 + 45,
        speed: Math.random() * 500 + 600,
        vx: dx * 0, // horizontal movement toward target
        colorA: "#32FFB7",
        colorB: "#FFFFFF",
      });
    }

    function rectHit(a, b) {
      return (
        a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
      );
    }

    updateGame = function (dt) {
      blinkTimer += dt;

      if (gameState !== "playing") return;

      score += dt * 10;

      // cow movement
      if (keys["ArrowLeft"] || keys["KeyA"]) {
        cow.x -= cow.speed * dt;
        cow.dir = -1;
      }

      if (keys["ArrowRight"] || keys["KeyD"]) {
        cow.x += cow.speed * dt;
        cow.dir = 1;
      }

      cow.x = Math.max(60, Math.min(gameCanvas.width - cow.w - 60, cow.x));

      // monster smooth delayed follow
      const cowCenter = cow.x + cow.w / 2;
      const monsterCenter = monster.x + monster.w / 2;
      monster.x += (cowCenter - monsterCenter) * monster.followSpeed;

      monster.x = Math.max(
        60,
        Math.min(gameCanvas.width - monster.w - 60, monster.x),
      );

      // spawn bullets
      bulletTimer += dt;

      const spawnRate = Math.max(0.12, 0.5 - score / 800);

      if (bulletTimer > spawnRate) {
        spawnBullet();

        // 🔥 double shot chance
        if (Math.random() > 0.7) {
          spawnBullet();
        }

        bulletTimer = 0;
      }

      // bullet movement
      bullets.forEach((b) => {
        b.y += b.speed * dt;
        b.x += b.vx * dt;
      });

      bullets = bullets.filter((b) => b.y < gameCanvas.height + 100);

      // collision
      bullets.forEach((b) => {
        const cowHitbox = {
          x: cow.x + 22,
          y: cow.y + 15,
          w: cow.w - 44,
          h: cow.h - 20,
        };

        if (rectHit(cowHitbox, b)) {
          gameState = "gameover";
          cow.rotation = Math.PI;
        }
      });
    };

    function drawPixelText(text, x, y, size = 28, align = "center") {
      gameCtx.save();
      gameCtx.font = `${size}px "Silkscreen", monospace`;
      gameCtx.textAlign = align;
      gameCtx.textBaseline = "middle";
      gameCtx.fillStyle = "#FFFFFF";
      gameCtx.shadowColor = "#32FFB7";
      gameCtx.shadowBlur = 12;
      gameCtx.fillText(text, x, y);
      gameCtx.restore();
    }

    function drawBullet(b) {
      gameCtx.save();

      const gradient = gameCtx.createLinearGradient(0, b.y, 0, b.y + b.h);
      gradient.addColorStop(0, b.colorB);
      gradient.addColorStop(0.45, b.colorA);
      gradient.addColorStop(1, b.colorB);

      gameCtx.fillStyle = gradient;
      gameCtx.shadowColor = "#32FFB7";
      gameCtx.shadowBlur = 10;
      gameCtx.fillRect(b.x, b.y, b.w, b.h);

      gameCtx.restore();
    }

    drawGame = function () {
      gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

      // bg
      if (gameAssets.bg.complete) {
        gameCtx.drawImage(
          gameAssets.bg,
          0,
          0,
          gameCanvas.width,
          gameCanvas.height,
        );
      } else {
        gameCtx.fillStyle = "#0716A8";
        gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
      }

      // bullets
      bullets.forEach(drawBullet);

      // monster
      if (gameAssets.monster.complete) {
        gameCtx.drawImage(
          gameAssets.monster,
          monster.x,
          monster.y,
          monster.w,
          monster.h,
        );
      }

      // cow with flip + death rotation
      if (gameAssets.cow.complete) {
        gameCtx.save();

        gameCtx.translate(cow.x + cow.w / 2, cow.y + cow.h / 2);
        gameCtx.rotate(cow.rotation);
        gameCtx.scale(cow.dir, 1);

        gameCtx.drawImage(gameAssets.cow, -cow.w / 2, -cow.h / 2, cow.w, cow.h);

        gameCtx.restore();
      }

      // score
      drawPixelText(`SCORE ${Math.floor(score)}`, gameCanvas.width / 2, 80, 32);

      // start text
      if (gameState === "start") {
        const show = Math.floor(blinkTimer * 2) % 2 === 0;

        if (gameAssets.logo.complete) {
          const logoWidth = 380; // adjust size here
          const aspect = gameAssets.logo.width / gameAssets.logo.height;
          const logoHeight = logoWidth / aspect;

          gameCtx.drawImage(
            gameAssets.logo,
            gameCanvas.width / 2 - logoWidth / 2,
            220, // adjust vertical position here
            logoWidth,
            logoHeight,
          );
        }

        drawPixelText("AVOID THE BULLETS", gameCanvas.width / 2, 480, 32);

        if (show) {
          drawPixelText(
            "PRESS SPACEBAR TO START",
            gameCanvas.width / 2,
            550,
            40,
          );
        }
      }

      // game over
      if (gameState === "gameover") {
        gameCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

        drawPixelText("GAME OVER", gameCanvas.width / 2, 300, 110);
        drawPixelText(
          `FINAL SCORE: ${Math.floor(score)}`,
          gameCanvas.width / 2,
          400,
          40,
        );

        const showRestart = Math.floor(blinkTimer * 2) % 2 === 0;

        if (showRestart) {
          drawPixelText(
            "PRESS SPACEBAR TO RESTART",
            gameCanvas.width / 2,
            520,
            40,
          );
        }
      }

      gameTexture.needsUpdate = true;
    };

    // Load textures once
    const ctaTex = textureLoader.load("image/CTAButton.png");

    // Fix color space (VERY IMPORTANT)
    ctaTex.colorSpace = THREE.SRGBColorSpace;

    // Prevent upside-down issue (for GLB)
    ctaTex.flipY = false;

    // controller_screen -> flip vertically
    ctaTex.center.set(0.5, 0.5);
    ctaTex.repeat.x = -1;

    // =====================
    // MINI CHARACTER SCREEN
    // =====================

    model.traverse((child) => {
      if (!child.isMesh) return;

      if (child.name === "screen") {
        child.material = new THREE.MeshBasicMaterial({
          map: gameTexture,
          color: new THREE.Color(1, 1, 1),
          toneMapped: false,
        });
      }

      if (child.name === "screen001") {
        child.material = new THREE.MeshBasicMaterial({
          map: miniTexture,
          color: new THREE.Color(1, 1, 1),
          toneMapped: false,
        });
      }

      if (child.name === "controller_screen") {
        child.material = new THREE.MeshBasicMaterial({
          map: ctaTex,
          color: new THREE.Color(1, 1, 1),
          toneMapped: false,
        });
      }
    });
  },
  undefined,
  (error) => {
    console.error("❌ GLTF Load Error:", error);
  },
);

// =====================
// Wheel Trigger
// =====================
window.addEventListener(
  "wheel",
  (event) => {
    if (!mainScreen || isZooming) return;

    if (isInside && scrollModeEnabled) {
      event.preventDefault();

      const totalScrollable = getTotalSectionsHeight();

      // Scrolling up from the very top — exit back to hero
      if (event.deltaY < 0 && targetScroll <= 10) {
        targetScroll = 0;
        virtualScroll = 0;

        if (heroText) heroText.style.transform = "translateY(0px)";
        if (scrollSections) {
        scrollSections.style.transform = `translate3d(0, ${window.innerHeight}px, 0)`;
      }

        nextSectionHiddenUntil = performance.now() + 2000;
        hideScrollSections();

        isInside = false;
        scrollModeEnabled = false;

        startCameraMove(initialCameraPosition, initialTargetPosition);
        scheduleHeroTextFade();
        return;
      }

      targetScroll += event.deltaY;
      targetScroll = Math.max(0, Math.min(targetScroll, totalScrollable));

      return;
    }

    if (event.deltaY > 0 && !isInside) {
      event.preventDefault();

      hideScrollSections();
      resetVirtualScroll();

      isInside = true;

      startCameraMove(zoomCameraPosition, zoomLookAtPosition);
      scheduleHeroTextFade();

      return;
    }
  },
  { passive: false }
);


// =====================
// Click Interaction
// =====================
window.addEventListener("pointerdown", (event) => {
  if (!model) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(model, true);

  if (intersects.length === 0) return;

  const hit = intersects[0];
  const clicked = hit.object;

  const screenHit = intersects.find((i) => i.object.name === "screen001");

  if (screenHit && screenHit.uv) {
    const button = getMiniButtonFromUV(screenHit.uv);

    if (button === "left") {
      pressMiniButton("left");
      changeMiniCharacter(-1);
      return;
    }

    if (button === "right") {
      pressMiniButton("right");
      changeMiniCharacter(1);
      return;
    }
  }

  const clickableNames = [
    "Sphere005",
    "Sphere005_1",
    "Sphere005_2",
    "Sphere005_3",
    "controller_screen",
  ];

  if (clickableNames.includes(clicked.name)) {
    if (handleAction) {
      handleAction.reset();
      handleAction.play();
    }
  }
});

// Pointer
window.addEventListener("pointermove", (event) => {
  if (!model) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(model, true);

  const screenHit = intersects.find((i) => i.object.name === "screen001");

  let hovering = false;

  if (screenHit && screenHit.uv) {
    const button = getMiniButtonFromUV(screenHit.uv);
    hovering = button !== null;
  }

  document.body.style.cursor = hovering ? "pointer" : "default";
});

// =====================
// Resize Support
// =====================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  // Always update the saved responsive starting position.
  // But only move the real camera if we are currently at the hero start.
  setResponsiveCamera(!isInside && !isZooming);

  const totalScrollable = getTotalSectionsHeight();
  targetScroll = Math.min(targetScroll, totalScrollable);
  virtualScroll = Math.min(virtualScroll, totalScrollable);

  if (scrollSections) {
    scrollSections.style.transform = `translate3d(0, ${window.innerHeight}px, 0)`;
  }
});

// =====================
// Animation Loop
// =====================
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  if (isZooming) {
    const elapsed = (performance.now() - zoomStartTime) / 1000;

    const rawT = Math.min(elapsed / animationDuration, 1);
    const cameraT = easeInOutCubic(rawT);

    const marqueeRawT = Math.min(elapsed / marqueeDuration, 1);
    const marqueeT = easeInOutCubic(marqueeRawT);

    camera.position.lerpVectors(
      animationStartCamera,
      animationEndCamera,
      cameraT,
    );

    controls.target.lerpVectors(
      animationStartTarget,
      animationEndTarget,
      cameraT,
    );

    material.opacity = isInside ? 1 - marqueeT : marqueeT;

    if (moon) {
      const currentMoonScale = isInside
        ? THREE.MathUtils.lerp(moonBaseScale, moonScrollScale, cameraT)
        : THREE.MathUtils.lerp(moonScrollScale, moonBaseScale, cameraT);

      const currentMoonY = isInside
        ? THREE.MathUtils.lerp(moonBaseY, moonScrollY, cameraT)
        : THREE.MathUtils.lerp(moonScrollY, moonBaseY, cameraT);

      moon.scale.setScalar(currentMoonScale);
      moon.position.y = currentMoonY;
    }

    if (rawT >= 1) {
      finishCameraMove();
    }
  }

  updateVirtualScroll();

  controls.update();

  //game
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  updateGame(dt);
  drawGame();

  renderer.render(scene, camera);

  texture.offset.x -= 0.0015;

  // pointer
  let hoveredObject = null;

  function checkHover() {
    if (!model) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(model, true);

    const clickableNames = [
      "Sphere005",
      "Sphere005_1",
      "Sphere005_2",
      "Sphere005_3",
      "controller_screen",
    ];

    if (intersects.length > 0) {
      const obj = intersects[0].object;

      if (clickableNames.includes(obj.name)) {
        document.body.style.cursor = "pointer";
        hoveredObject = obj;
        return;
      }
    }

    document.body.style.cursor = "default";
    hoveredObject = null;
  }

  checkHover();
}

disableSecondScrollStage();
animate();


}
