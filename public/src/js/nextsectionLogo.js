import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/DRACOLoader.js";
import { sharedLoadingManager } from "./loadingManager.js";

// Gradient "sky" used only as an environment map for the glass logo to
// reflect/refract — a blue-to-cyan sweep from -X to +X so the color visibly
// shifts across the surface as the logo turns left/right.
function createColorEnvironment() {
  const envScene = new THREE.Scene();

  const geometry = new THREE.SphereGeometry(10, 32, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      colorLeft: { value: new THREE.Color(0x1d4ed8) },
      colorRight: { value: new THREE.Color(0x22d3ee) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 colorLeft;
      uniform vec3 colorRight;
      varying vec3 vWorldPosition;
      void main() {
        vec3 dir = normalize(vWorldPosition);
        float t = dir.x * 0.5 + 0.5;
        vec3 base = mix(colorLeft, colorRight, t);

        // A few bright "light panel" hot spots scattered around the sky,
        // so different edges of the model catch distinct bright
        // reflections as it rotates, instead of one flat gradient.
        float s1 = pow(max(dot(dir, normalize(vec3(1.0, 0.6, 0.4))), 0.0), 20.0);
        float s2 = pow(max(dot(dir, normalize(vec3(-0.8, 0.4, 0.6))), 0.0), 30.0);
        float s3 = pow(max(dot(dir, normalize(vec3(0.2, -0.9, 0.3))), 0.0), 25.0);

        vec3 color = base
          + vec3(0.6, 0.8, 1.0) * s1 * 2.5
          + vec3(1.0, 1.0, 1.0) * s2 * 3.0
          + vec3(0.4, 1.0, 0.9) * s3 * 2.0;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
  });

  envScene.add(new THREE.Mesh(geometry, material));
  return envScene;
}

export function initNextScene() {

  const canvas = document.getElementById("nextCanvas");

  if (!canvas) return;

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(
    35,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );

  camera.position.set(0, 0, 8);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  );

  renderer.setSize(
    canvas.clientWidth,
    canvas.clientHeight,
    false
  );

  // Sharper transmission — full-resolution background capture instead of a
  // downscaled one, so the see-through view through the glass stays crisp.
  renderer.transmissionResolutionScale = 1;

  // Environment map (so the glass material has something to reflect/refract)
  // — a photo texture as the sky, with the procedural gradient sky above
  // kept only as a fallback if the image fails to load.
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  scene.environment = pmremGenerator.fromScene(createColorEnvironment(), 0.04).texture;

  // Trying a regular photo (not an HDRI) as the environment — this isn't an
  // equirectangular panorama, so expect a visible seam/stretch, unlike a
  // real HDRI sky.
  new THREE.TextureLoader(sharedLoadingManager).load(
    "image/sky.png",
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
      texture.dispose();
    },
    undefined,
    (error) => {
      console.error("❌ Sky image load error, keeping procedural sky:", error);
    }
  );

  // Light
  const ambient = new THREE.AmbientLight(
    0xffffff,
    2
  );

  scene.add(ambient);

  // Rim light — positioned behind the model so its edges catch a bright
  // highlight facing away from the camera, like a classic rim/edge light,
  // instead of hitting the front face directly (which would show up as a
  // visible bright "light source" spot on the surface facing the camera).
  const rimLight = new THREE.DirectionalLight(0x0599f6, 5);
  rimLight.position.set(-4, 2, -5);
  scene.add(rimLight);

  const rimLight2 = new THREE.DirectionalLight(0x22d3ee, 6.5);
  rimLight2.position.set(5, -2, -4);
  scene.add(rimLight2);

  // Model
  let logoModel;
  // The model's own bounding-box center, expressed at a scale of 1 — lets
  // the resize handler below recompute the correct centering offset for
  // whatever scale is currently in effect (see the comment near where this
  // gets set, at load time).
  let logoCenterAtUnitScale = null;
  const logoRig = new THREE.Group();
  scene.add(logoRig);

  // Responsive scale — 0.3 at desktop widths down to 0.15 at narrow mobile
  // widths, so the logo doesn't overwhelm small screens the way a fixed
  // scale did.
  const logoMaxScale = 0.3;
  const logoMinScale = 0.15;

  function getResponsiveLogoScale() {
    const t = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(window.innerWidth, 375, 1920, 0, 1),
      0,
      1
    );
    return THREE.MathUtils.lerp(logoMinScale, logoMaxScale, t);
  }

  // Cursor-follow rotation (position never changes, only rotation)
  const maxRotationY = 0.55; // radians — how far it turns left/right
  const maxRotationX = 0.3; // radians — how far it tilts up/down

  // Default resting pose: facing top-left, as if the cursor were sitting in
  // the top-left corner (nx = -0.7, ny = -0.7 in the same formula used
  // below for real cursor input).
  const defaultRotation = { x: -0.7 * maxRotationX, y: -0.7 * maxRotationY };
  const targetRotation = { x: defaultRotation.x, y: defaultRotation.y };

  // Hold the default top-left pose until the section has scrolled 40% of
  // the way into view, then start following the cursor — the existing
  // rotation lerp in the animate loop below eases it there smoothly rather
  // than snapping. Checked every frame (not a scroll listener) since this
  // site's custom scroll setup doesn't reliably fire scroll events
  // everywhere.
  const nextSection = document.querySelector(".next-section");
  const bgUfo = document.querySelector(".section-bg-ufo");
  let cursorTrackingEnabled = false;

  function updateCursorTrackingGate() {
    if (!nextSection) return;

    const rect = nextSection.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / window.innerHeight));

    const wasEnabled = cursorTrackingEnabled;
    cursorTrackingEnabled = progress >= 0.4;

    // Start the mobile spin-gesture hint's idle countdown the moment the
    // logo becomes interactive, and cancel/hide it if scrolled back away
    // before it ever fired.
    if (cursorTrackingEnabled && !wasEnabled) {
      scheduleSpinHint();
    } else if (!cursorTrackingEnabled && wasEnabled) {
      clearSpinHintTimer();
      hideSpinHint();
    }

    // section_bg_ufo.png and the blue glow behind it slide/rise in
    // together, at 30% scrolled into view.
    if (bgUfo) bgUfo.classList.toggle("is-revealed", progress >= 0.3);
    nextSection.classList.toggle("bg-glow-revealed", progress >= 0.3);
  }

  // Slide-in entrance for the text (CSS, via the is-revealed class) —
  // triggered once the section has scrolled 70% of the way into view, and
  // reset back to hidden once scrolled back down near the hero banner, so
  // it replays from scratch each time the section is re-entered. The
  // "CREATIVITY BEYOND ORDINARY" subtitle has its own slightly delayed
  // reveal in sections.css so it lags a beat behind "MALIENS".
  const mainTitle = document.querySelector(".next-section h2.main-title");
  let entranceTriggered = false;

  // Split "MALIENS" into individually-staggered <span class="letter">
  // elements (leaving the .sub-title span alone) so the CSS reveal
  // animates it in letter by letter instead of as one solid block.
  if (mainTitle) {
    const subtitle = mainTitle.querySelector(".sub-title");
    const text = mainTitle.textContent
      .replace(subtitle ? subtitle.textContent : "", "")
      .trim();

    mainTitle.textContent = "";

    [...text].forEach((char, i) => {
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = char;
      letter.style.transitionDelay = `${i * 0.06}s`;
      mainTitle.appendChild(letter);
    });

    if (subtitle) mainTitle.appendChild(subtitle);
  }

  // The decorative "MALIENS" rows (mobile background stack) get the same
  // letter-by-letter reveal as the real title, just delayed a bit further
  // behind it so it reads as an echo rather than firing all at once.
  const decorRows = Array.from(document.querySelectorAll(".mobile-maliens-decor"));
  const decorExtraDelay = 0.3; // seconds behind the main title's own per-letter stagger

  decorRows.forEach((row) => {
    const text = row.textContent;
    row.textContent = "";

    [...text].forEach((char, i) => {
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = char;
      letter.style.transitionDelay = `${i * 0.06 + decorExtraDelay}s`;
      row.appendChild(letter);
    });
  });

  function updateEntrance() {
    if (!nextSection) return;

    const rect = nextSection.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / window.innerHeight));

    if (!entranceTriggered && progress >= 0.7) {
      entranceTriggered = true;
      if (mainTitle) mainTitle.classList.add("is-revealed");
      decorRows.forEach((row) => row.classList.add("is-revealed"));
    } else if (entranceTriggered && progress < 0.1) {
      entranceTriggered = false;
      if (mainTitle) mainTitle.classList.remove("is-revealed");
      decorRows.forEach((row) => row.classList.remove("is-revealed"));
    }
  }

  const isMobileWidth = () => window.innerWidth <= 500;

  window.addEventListener("pointermove", (event) => {
    // Mobile drives rotation via the touch handlers below instead — this
    // absolute cursor-position mapping would otherwise fight with that
    // free-drag rotation, since pointermove also fires during touchmove.
    if (!cursorTrackingEnabled || isMobileWidth()) return;

    const nx = (event.clientX / window.innerWidth) * 2 - 1;  // -1 (left) to 1 (right)
    const ny = (event.clientY / window.innerHeight) * 2 - 1; // -1 (top) to 1 (bottom)

    targetRotation.y = nx * maxRotationY;
    targetRotation.x = ny * maxRotationX;
  });

  // Mobile: free 360° drag-to-rotate. Unlike the desktop cursor mapping
  // above (clamped to +/-maxRotation, tied to absolute pointer position),
  // this accumulates rotation from the drag delta with no limit, so a
  // long swipe can spin the logo all the way around in either axis. Idle
  // for 2s after lifting the finger and it eases back to defaultRotation
  // (the existing lerp in the animate loop below handles the easing).
  const touchRotateSpeed = 0.01; // radians of rotation per pixel dragged — more dynamic/responsive drag
  const touchResetDelay = 3500; // gives the ~2s glide below room to fully settle before it kicks in
  const touchMomentumFriction = 0.985; // per-frame velocity decay while coasting — tuned for a ~2s glide
  const touchMomentumStopThreshold = 0.00005; // rad/frame — below this, coasting stops
  const touchResetLerpFactor = 0.035; // slower than the 0.08 used for live tracking/coast, for a gentler ease home

  // Spin gesture hint (mobile only) — a small rotating-arrow icon that
  // fades in over the logo after 5s of no touch, teaching first-time
  // visitors they can drag it. Fades out the instant they touch, and the
  // 5s countdown restarts once they let go.
  const spinHint = document.getElementById("mobileSpinHint");
  const spinHintDelay = 5000;
  let spinHintTimer = null;

  function clearSpinHintTimer() {
    if (spinHintTimer !== null) {
      clearTimeout(spinHintTimer);
      spinHintTimer = null;
    }
  }

  function showSpinHint() {
    if (!spinHint || !isMobileWidth() || !cursorTrackingEnabled) return;
    spinHint.classList.add("is-visible");
  }

  function hideSpinHint() {
    if (spinHint) spinHint.classList.remove("is-visible");
  }

  function scheduleSpinHint() {
    clearSpinHintTimer();
    spinHintTimer = setTimeout(showSpinHint, spinHintDelay);
  }

  let touchActive = false;
  let touchCoasting = false;
  let resettingToDefault = false;
  let lastTouchX = 0;
  let lastTouchY = 0;
  let touchVelocityX = 0;
  let touchVelocityY = 0;
  let touchResetTimer = null;

  function clearTouchResetTimer() {
    if (touchResetTimer !== null) {
      clearTimeout(touchResetTimer);
      touchResetTimer = null;
    }
  }

  // Wraps `target` to the angle nearest `current` (within one half-turn),
  // so easing back to a fixed pose always takes the shortest path. Without
  // this, spinning the logo around a couple of times before letting go
  // would visibly spin it all the way back through those same turns again
  // instead of just settling into the nearest matching orientation.
  function nearestEquivalentAngle(current, target) {
    const twoPi = Math.PI * 2;
    let delta = (target - current) % twoPi;
    if (delta > Math.PI) delta -= twoPi;
    if (delta < -Math.PI) delta += twoPi;
    return current + delta;
  }

  function scheduleTouchReset() {
    clearTouchResetTimer();
    touchResetTimer = setTimeout(() => {
      touchCoasting = false;
      resettingToDefault = true;
      targetRotation.x = nearestEquivalentAngle(logoRig.rotation.x, defaultRotation.x);
      targetRotation.y = nearestEquivalentAngle(logoRig.rotation.y, defaultRotation.y);
    }, touchResetDelay);
  }

  canvas.addEventListener("touchstart", (event) => {
    if (!isMobileWidth() || !cursorTrackingEnabled) return;
    if (event.touches.length !== 1) return;

    touchActive = true;
    touchCoasting = false;
    resettingToDefault = false;
    touchVelocityX = 0;
    touchVelocityY = 0;
    clearTouchResetTimer();
    clearSpinHintTimer();
    hideSpinHint();
    lastTouchX = event.touches[0].clientX;
    lastTouchY = event.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener("touchmove", (event) => {
    if (!touchActive || !isMobileWidth()) return;

    const touch = event.touches[0];
    const dx = touch.clientX - lastTouchX;
    const dy = touch.clientY - lastTouchY;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;

    const rotDeltaY = dx * touchRotateSpeed;
    const rotDeltaX = dy * touchRotateSpeed;

    targetRotation.y += rotDeltaY;
    targetRotation.x += rotDeltaX;

    // Smoothed velocity estimate for the release "coast" below — blending
    // the new delta in (more heavily toward the latest sample than before,
    // so a genuine flick registers its speed rather than getting damped
    // out) means one jumpy touchmove sample still can't launch a huge
    // flick on its own.
    touchVelocityY = touchVelocityY * 0.5 + rotDeltaY * 0.5;
    touchVelocityX = touchVelocityX * 0.5 + rotDeltaX * 0.5;
  }, { passive: true });

  function endTouchRotate() {
    if (!touchActive) return;
    touchActive = false;
    touchCoasting = true;
    scheduleTouchReset();
    scheduleSpinHint();
  }

  canvas.addEventListener("touchend", endTouchRotate);
  canvas.addEventListener("touchcancel", endTouchRotate);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  const loader = new GLTFLoader(sharedLoadingManager);
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    "model/logo_nextsection.glb",

    (gltf) => {

      logoModel = gltf.scene;

      logoModel.position.set(
        0,
        0,
        0
      );

      const initialLogoScale = getResponsiveLogoScale();
      logoModel.scale.set(
        initialLogoScale,
        initialLogoScale,
        initialLogoScale
      );

      logoRig.add(logoModel);
      logoModel.updateMatrixWorld(true);

      // Re-center on the model's actual geometric center so it sits in
      // the middle of logoRig — since logoRig is what we now rotate,
      // rotation pivots around the visual center instead of the file's
      // off-center pivot. Stored at a scale of 1 so the resize handler
      // below can recompute this same offset whenever the responsive
      // scale changes — without that, changing scale without redoing this
      // centering leaves the model (and its rotation axis) drifting away
      // from logoRig's origin by an amount proportional to how much the
      // scale changed since load.
      const box = new THREE.Box3().setFromObject(logoModel);
      const center = box.getCenter(new THREE.Vector3());
      logoCenterAtUnitScale = center.clone().divideScalar(initialLogoScale);
      logoModel.position.sub(center);

      // Strip the original texture and replace with a transparent glass
      // material — transmission + ior gives it refraction, and the
      // environment map above gives it something to reflect, so both
      // shift visibly as the logo rotates.
      logoModel.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: 0x8ec9ff,
            transmission: 1,
            roughness: 0.08,
            thickness: 1.5,
            ior: 1.5,
            metalness: 0,
            clearcoat: 1,
            clearcoatRoughness: 0.15,
            envMapIntensity: 5,
            specularIntensity: 1.2,
            specularColor: new THREE.Color(0xffffff),
            attenuationColor: new THREE.Color(0x1ec8ff),
            attenuationDistance: 1.5,
            side: THREE.DoubleSide,
          });

          // Trace the mesh's own facet edges as a bright overlay — real-time
          // transmission can't render a solid object's internal geometry, so
          // this fakes the "faceted crystal" look by drawing the model's
          // actual edges on top of the glass.
          const edges = new THREE.EdgesGeometry(child.geometry, 15);
          const edgeLines = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
          );
          child.add(edgeLines);
        }
      });

      console.log("logo_nextsection loaded");
    }
  );

  // Resize
  window.addEventListener("resize", () => {

    camera.aspect =
      canvas.clientWidth /
      canvas.clientHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      canvas.clientWidth,
      canvas.clientHeight,
      false
    );

    if (logoModel) {
      const scale = getResponsiveLogoScale();
      logoModel.scale.set(scale, scale, scale);

      // Redo the centering from load time at the new scale — the
      // compensating position offset scales linearly with it, so without
      // this the model (and its rotation axis) drifts off logoRig's origin
      // every time the responsive scale changes.
      if (logoCenterAtUnitScale) {
        logoModel.position.set(
          -logoCenterAtUnitScale.x * scale,
          -logoCenterAtUnitScale.y * scale,
          -logoCenterAtUnitScale.z * scale
        );
      }
    }
  });

  // True while any part of .next-section is on-screen. This canvas scrolls
  // with the page (unlike the hero's fixed one), so a plain
  // getBoundingClientRect check is enough — no point paying for a GPU
  // render pass of the glass logo while it's nowhere near the viewport.
  function isNextSectionOnScreen() {
    if (!nextSection) return true;
    const rect = nextSection.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  // Animate
  function animate() {

    requestAnimationFrame(animate);

    updateCursorTrackingGate();
    updateEntrance();

    if (logoModel) {
      // Momentum coast after a mobile touch drag ends — the target keeps
      // drifting in the direction of the swipe, decaying each frame, so
      // releasing mid-swipe feels like a flick rather than a hard stop.
      if (touchCoasting) {
        targetRotation.y += touchVelocityY;
        targetRotation.x += touchVelocityX;
        touchVelocityY *= touchMomentumFriction;
        touchVelocityX *= touchMomentumFriction;

        if (
          Math.abs(touchVelocityX) < touchMomentumStopThreshold &&
          Math.abs(touchVelocityY) < touchMomentumStopThreshold
        ) {
          touchCoasting = false;
        }
      }

      // The reset-to-default ease (mobile only) uses its own slower factor
      // so it settles home gently instead of snapping back at the same
      // speed as live drag tracking.
      const rotationLerpFactor = resettingToDefault ? touchResetLerpFactor : 0.08;
      logoRig.rotation.y += (targetRotation.y - logoRig.rotation.y) * rotationLerpFactor;
      logoRig.rotation.x += (targetRotation.x - logoRig.rotation.x) * rotationLerpFactor;

      if (
        resettingToDefault &&
        Math.abs(targetRotation.x - logoRig.rotation.x) < 0.0005 &&
        Math.abs(targetRotation.y - logoRig.rotation.y) < 0.0005
      ) {
        resettingToDefault = false;
      }
    }

    if (isNextSectionOnScreen()) {
      renderer.render(
        scene,
        camera
      );
    }
  }

  animate();
}
