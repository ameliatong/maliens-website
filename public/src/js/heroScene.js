import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { gsap } from "https://esm.sh/gsap@3.13.0";
import { sharedLoadingManager } from "./loadingManager.js";

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
  let touchMoveDirection = 0;

  // =====================
  // BACKGROUND VIDEO
  // =====================
  const textureLoader = new THREE.TextureLoader(sharedLoadingManager);
  let bgVideoTexture = null;
  let bgVideoEl = null;

  function fitVideoBackgroundCover() {
    if (!bgVideoTexture || !bgVideoEl || !bgVideoEl.videoWidth) return;

    const videoAspect = bgVideoEl.videoWidth / bgVideoEl.videoHeight;
    const containerAspect = window.innerWidth / window.innerHeight;

    if (containerAspect > videoAspect) {
      bgVideoTexture.repeat.set(1, videoAspect / containerAspect);
      bgVideoTexture.offset.set(0, (1 - bgVideoTexture.repeat.y) / 2);
    } else {
      bgVideoTexture.repeat.set(containerAspect / videoAspect, 1);
      bgVideoTexture.offset.set((1 - bgVideoTexture.repeat.x) / 2, 0);
    }
  }

  bgVideoEl = document.createElement("video");
  bgVideoEl.src = "image/galaxy.mp4";
  bgVideoEl.muted = true;
  bgVideoEl.loop = true;
  bgVideoEl.playsInline = true;
  bgVideoEl.setAttribute("muted", "");
  bgVideoEl.setAttribute("playsinline", "");

  bgVideoEl.addEventListener("loadedmetadata", fitVideoBackgroundCover);
  bgVideoEl.play().catch(() => {});

  bgVideoTexture = new THREE.VideoTexture(bgVideoEl);
  bgVideoTexture.colorSpace = THREE.SRGBColorSpace;

  scene.background = bgVideoTexture;

  // =====================
  // Camera
  // =====================
  const camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
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
  const heroAsteroids = document.querySelector(".hero-asteroids");
  const mobileHeroTitle = document.querySelector(".mobile-hero-title");

  // =====================
  // KICKER TYPEWRITER ("> WE BUILD BRANDS THAT")
  // =====================
  const heroKicker = document.querySelector(".center-content h1");
  const heroKickerFullText = heroKicker ? heroKicker.textContent : "";
  if (heroKicker) heroKicker.textContent = "";

  const KICKER_START_DELAY = 1000; // ms — pause before typing begins
  let typewriterTimeout = null;
  let kickerStartTimeout = null;

  function startKickerTypewriter() {
    if (!heroKicker) return;

    if (typewriterTimeout) clearTimeout(typewriterTimeout);

    heroKicker.textContent = "";
    heroKicker.classList.add("is-typing");

    let charIndex = 0;

    function typeNextChar() {
      charIndex += 1;
      heroKicker.textContent = heroKickerFullText.slice(0, charIndex);

      if (charIndex < heroKickerFullText.length) {
        typewriterTimeout = setTimeout(typeNextChar, 45);
      } else {
        heroKicker.classList.remove("is-typing");
      }
    }

    typewriterTimeout = setTimeout(typeNextChar, 45);
  }

  function scheduleKickerTypewriterStart() {
    if (!heroKicker) return;

    if (kickerStartTimeout) clearTimeout(kickerStartTimeout);

    kickerStartTimeout = setTimeout(() => {
      kickerStartTimeout = null;
      startKickerTypewriter();
    }, KICKER_START_DELAY);
  }

  function resetKickerTypewriter() {
    if (!heroKicker) return;

    if (kickerStartTimeout) clearTimeout(kickerStartTimeout);
    kickerStartTimeout = null;

    if (typewriterTimeout) clearTimeout(typewriterTimeout);
    typewriterTimeout = null;

    heroKicker.textContent = "";
    heroKicker.classList.remove("is-typing");
  }

  // =====================
  // "IMPOSSIBLE TO IGNORE" + description — slide-up reveal
  // =====================
  // Headline: split into individually-staggered <span class="letter">
  // elements (same technique as "MALIENS" in nextsectionLogo.js) - CSS
  // handles the actual slide via the "headline-revealed" class below. Each
  // word is kept in its own inline-block wrapper (with a real space text
  // node between them) so the headline can still wrap normally on narrow
  // viewports instead of overflowing.
  const headlineEl = document.querySelector(".center-content h2");
  const headlineLetters = [];

  if (headlineEl) {
    const text = headlineEl.textContent;
    const headlineStyle = getComputedStyle(headlineEl);
    headlineEl.textContent = "";
    let letterIndex = 0;

    text.split(/(\s+)/).forEach((token) => {
      if (token === "") return;

      if (/^\s+$/.test(token)) {
        headlineEl.appendChild(document.createTextNode(token));
        return;
      }

      // Plain wrapper, no background of its own — giving it `background:
      // inherit` (to pass h2's gradient down to the letters below) would
      // make the wrapper itself paint that gradient as a real rectangle,
      // which shows up as a stray colored block wherever its box peeks out
      // past the letters (e.g. at a mobile line-wrap). Each letter gets the
      // gradient copied directly onto itself instead, bypassing this
      // wrapper entirely.
      const wordSpan = document.createElement("span");
      wordSpan.style.display = "inline-block";

      [...token].forEach((char) => {
        const letter = document.createElement("span");
        letter.className = "letter";
        letter.textContent = char;
        letter.style.transitionDelay = `${letterIndex * 0.04}s`;
        letter.style.backgroundImage = headlineStyle.backgroundImage;
        letter.style.backgroundSize = headlineStyle.backgroundSize;
        letter.style.backgroundRepeat = headlineStyle.backgroundRepeat;
        letter.style.backgroundPosition = headlineStyle.backgroundPosition;
        wordSpan.appendChild(letter);
        headlineLetters.push(letter);
        letterIndex += 1;
      });

      headlineEl.appendChild(wordSpan);
    });

    // Each letter now paints its own clipped copy of the gradient (above) —
    // h2 no longer has any direct text of its own to clip its background
    // to (it's all nested two levels down, in word-span > letter), and
    // leaving its own background-image in place produces a stray solid
    // rectangle artifact at the first glyph instead of clipping cleanly.
    headlineEl.style.backgroundImage = "none";
  }

  // Description: word-by-word "cut reveal" — each word sits in an
  // overflow-clipped box and slides up into place, staggered, matching the
  // .vcr-word/.vcr-inner pattern used for the quote section's paragraphs
  // (quoteReveal.js).
  const descriptionEl = document.querySelector(".center-content h3");
  const descriptionWords = [];

  if (descriptionEl) {
    const originalChildren = Array.from(descriptionEl.childNodes);
    descriptionEl.textContent = "";

    originalChildren.forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) {
        descriptionEl.appendChild(node);
        return;
      }

      node.textContent.split(/(\s+)/).forEach((token) => {
        if (token === "") return;

        if (/^\s+$/.test(token)) {
          descriptionEl.appendChild(document.createTextNode(token));
          return;
        }

        const outer = document.createElement("span");
        outer.className = "vcr-word";
        const inner = document.createElement("span");
        inner.className = "vcr-inner";
        inner.textContent = token;
        outer.appendChild(inner);
        descriptionEl.appendChild(outer);
        descriptionWords.push(inner);
      });
    });
  }

  const DESCRIPTION_STAGGER = 25; // ms between consecutive words
  const DESCRIPTION_SETTLE = 700; // ms for one word to slide up into place
  let descriptionAnims = [];

  function playDescriptionReveal() {
    descriptionAnims = descriptionWords.map((word, i) =>
      word.animate(
        [{ transform: "translateY(110%)" }, { transform: "translateY(0)" }],
        {
          duration: DESCRIPTION_SETTLE,
          delay: i * DESCRIPTION_STAGGER,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      ),
    );
  }

  function resetDescriptionReveal() {
    descriptionAnims.forEach((anim) => anim.cancel());
    descriptionAnims = [];
  }

  // Target the unified wrapper instead of just next-section
  const scrollSections = document.getElementById("scrollSections");

  // =====================
  // Timing Controls
  // =====================
  const animationDuration = 1.2;
  const marqueeDuration = 0.6;
  const textDelay = 0.8;
  const HEADLINE_REVEAL_DELAY = 500; // ms, on top of textDelay above

  let heroFadeTimeout = null;
  let headlineRevealTimeout = null;
  let mobileTitleFadeTimeout = null;

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
    return scrollSections
      ? scrollSections.offsetHeight
      : window.innerHeight * 2.1;
  }

  // Scroll model:
  //   • FREE scrolling through the hero exit + logo + quote block + marquee.
  //   • SNAP scrolling from there on: one wheel gesture glides to the next
  //     stop — the Services signpost, then the contact form ("LET'S BREAK THE
  //     NOISE"), then the footer.
  // Values are in virtualScroll units; landing virtualScroll on one puts that
  // element's top flush with the top of the viewport.
  function offsetWithinScrollSections(el) {
    let top = 0;
    while (el && el !== scrollSections) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return top;
  }

  function getSnapStops() {
    if (!scrollSections) return [];
    const vh = window.innerHeight;
    const services = document.getElementById("services");
    const form = scrollSections.querySelector(".contact-section");
    const footer = scrollSections.querySelector(".footer-section");
    return [services, form, footer]
      .filter(Boolean)
      .map((el) => vh + offsetWithinScrollSections(el));
  }

  let lastSnapTime = 0;
  let lastWheelTime = 0;
  let flickLocked = false; // true after a snap → swallow the rest of that flick
  // Must be >= SNAP_DURATION below (1300ms) — this used to be 550ms, far
  // shorter than the actual glide. If a hard/insistent scroll gesture had
  // even a brief natural pause partway through (past GESTURE_GAP but still
  // mid-glide), flickLocked would reset and gate() would already allow a
  // new action through, letting a second wheel event kill the in-flight
  // snap and dump its leftover deltaY straight into free-scroll — blowing
  // right past the section the snap was heading for.
  const SNAP_COOLDOWN = 1400; // ms — blocks a new action until the glide has actually finished
  // 200ms used to let a trackpad's decaying inertia tail (individual ticks
  // naturally spread further apart as it slows down) clear this gap on its
  // own well before the gesture actually ended, reading as a "new" scroll
  // mid-glide. Widened for more margin against that.
  const GESTURE_GAP = 350; // ms of wheel silence before a scroll counts as new
  const FREE_SCROLL_GAIN = 1.6; // deltaY multiplier in the free zone (eased scroll)

  const virtualScrollEase = 0.1; // per-frame ease for the FREE-scroll zone

  // GSAP tween for section snaps — a real eased glide (duration + curve) rather
  // than the exponential per-frame lerp. While it's active, updateVirtualScroll
  // leaves `virtualScroll` alone (the tween drives it via onUpdate).
  const SNAP_DURATION = 1.3; // seconds
  const SNAP_EASE = "power3.inOut";
  const scrollProxy = { v: 0 };
  let snapTween = null;

  function killSnap() {
    if (snapTween) {
      snapTween.kill();
      snapTween = null;
      // A tween killed mid-flight (e.g. interrupted by a fresh nav jump or
      // user scroll) never reaches onComplete below — clear here too so an
      // interrupted transit can't leave Services' auto-focus permanently
      // suppressed.
      window.maliensSuppressServiceFocus = false;
    }
  }

  function snapTo(value) {
    flickLocked = true; // consume the rest of the current flick
    targetScroll = value;
    killSnap();
    scrollProxy.v = virtualScroll;
    snapTween = gsap.to(scrollProxy, {
      v: value,
      duration: SNAP_DURATION,
      ease: SNAP_EASE,
      overwrite: true,
      onUpdate: () => {
        virtualScroll = scrollProxy.v;
      },
      onComplete: () => {
        virtualScroll = value;
        snapTween = null;
        // Tie the suppression window to the tween's actual completion
        // rather than a guessed duration, so a slow/throttled device can't
        // let it expire before the transit through Services is done.
        window.maliensSuppressServiceFocus = false;
      },
    });
  }

  // heroScene owns virtualScroll. servicesScene calls this the moment its
  // service sequence auto-engages (which then freezes the wheel via
  // window.maliensServiceFocused) so the Services section is always locked
  // flush to the top of the viewport first — otherwise it can freeze
  // mid-scroll with a sliver of the marquee still showing above it.
  window.maliensSnapServicesToTop = function () {
    if (!isInside) return;
    const stops = getSnapStops();
    if (stops.length) snapTo(stops[0]);
  };

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
    depthWrite: false,
  });

  const marquee = new THREE.Mesh(geometry, material);
  marquee.position.set(0, 0, -10);
  marquee.visible = window.innerWidth > 500;
  scene.add(marquee);

  // =====================
  // MOON IMAGE LAYER
  // =====================
  let moon;

  const moonBaseScale = 1.2;
  const moonScrollScale = 1;

  const moonBaseY = -15;
  const moonScrollY = -18.5;
  const moonScrollYMobile = -20.5; // sits slightly lower once this section is reached, mobile only

  function getMoonScrollY() {
    return window.innerWidth <= 500 ? moonScrollYMobile : moonScrollY;
  }

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
        depthWrite: false,
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
    },
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

  // Safe default positions, available before the GLB finishes loading
  const zoomCameraPosition = new THREE.Vector3(0, 2, 5);
  const zoomLookAtPosition = new THREE.Vector3(0, 1, 0);

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
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function setResponsiveCamera(applyToCamera = true) {
    const width = window.innerWidth;

    const t = THREE.MathUtils.mapLinear(width, 1920, 375, 0, 1);

    const clampedT = THREE.MathUtils.clamp(t, 0, 1);

    const startCamera = new THREE.Vector3(0, -2, 10);
    const endCamera = new THREE.Vector3(0, 0, 25);

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
    killSnap();
    flickLocked = false;
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

    const remainingDelay = Math.max(
      0,
      nextSectionHiddenUntil - performance.now(),
    );

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
      heroText.classList.remove("is-visible");
      if (heroAsteroids) heroAsteroids.classList.remove("is-visible");
      resetKickerTypewriter();
      if (headlineEl) headlineEl.classList.remove("headline-revealed");
      resetDescriptionReveal();
      if (headlineRevealTimeout) {
        clearTimeout(headlineRevealTimeout);
        headlineRevealTimeout = null;
      }

      heroFadeTimeout = setTimeout(() => {
        if (isInside && heroText) {
          heroText.style.opacity = 1;
          heroText.classList.add("is-visible");
          if (heroAsteroids) heroAsteroids.classList.add("is-visible");
          scheduleKickerTypewriterStart();

          // Headline + description hang back a beat behind the kicker
          // line/hero fade so the reveal reads as a sequence, not everything
          // firing at once.
          headlineRevealTimeout = setTimeout(() => {
            if (!isInside) return;
            if (headlineEl) headlineEl.classList.add("headline-revealed");
            playDescriptionReveal();
          }, HEADLINE_REVEAL_DELAY);
        }
      }, textDelay * 1000);
    } else {
      heroText.style.transition = "opacity 0.35s ease";
      heroText.style.opacity = 0;
      heroText.classList.remove("is-visible");
      if (heroAsteroids) heroAsteroids.classList.remove("is-visible");
      resetKickerTypewriter();
      if (headlineEl) headlineEl.classList.remove("headline-revealed");
      resetDescriptionReveal();
      if (headlineRevealTimeout) {
        clearTimeout(headlineRevealTimeout);
        headlineRevealTimeout = null;
      }
    }
  }

  function updateMobileTitleVisibility() {
    if (!mobileHeroTitle) return;

    if (mobileTitleFadeTimeout) {
      clearTimeout(mobileTitleFadeTimeout);
      mobileTitleFadeTimeout = null;
    }

    // Any hero <-> sections transition starts by fading the "Maliens Agency"
    // title out (CSS handles the 0.5s opacity transition either direction).
    mobileHeroTitle.style.opacity = 0;

    // It only fades back in once we're settling on the hero again — after the
    // camera move, on the same delay the hero text uses so they return together.
    if (!isInside) {
      mobileTitleFadeTimeout = setTimeout(() => {
        if (!isInside && mobileHeroTitle) mobileHeroTitle.style.opacity = 1;
      }, textDelay * 1000);
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
      const finalY = isInside ? getMoonScrollY() : moonBaseY;

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

    // A GSAP snap tween owns virtualScroll while it runs; otherwise ease it
    // toward targetScroll (free-scroll zone).
    if (!snapTween) {
      virtualScroll += (targetScroll - virtualScroll) * virtualScrollEase;
    }

    // Hero text slides up as you scroll through the first section
    if (heroText) {
      const heroScrollAmt = Math.min(virtualScroll, getMaxHeroScroll());
      heroText.style.transform = `translateY(${-heroScrollAmt}px)`;
    }

    // Sections start just below the viewport (100vh) and slide up.
    // Round to a whole pixel: `virtualScroll` is an eased float, so an
    // unrounded translate lands every stacked section's edge on a sub-pixel
    // boundary and the rasteriser draws a shimmering hairline seam between
    // them (e.g. under the UFO bg as the logo section slides up).
    if (scrollSections) {
      const startY = window.innerHeight;
      const currentY = Math.round(startY - virtualScroll);
      scrollSections.style.transform = `translate3d(0, ${currentY}px, 0)`;
    }
  }

  window.maliensGoToSection = function (targetId) {
    killSnap();
    flickLocked = false;

    // Leaving Services for anywhere else while its info panel is open
    // (e.g. clicking a header/footer nav link mid-focus) would otherwise
    // leave the panel text stuck on screen over whatever section we land
    // on, since nothing normally tells servicesScene we've navigated away.
    if (targetId !== "services" && window.maliensForceExitServiceFocus) {
      window.maliensForceExitServiceFocus();
    }

    if (targetId === "home") {
      isInside = false;
      scrollModeEnabled = false;
      targetScroll = 0;
      virtualScroll = 0;

      hideScrollSections();
      resetVirtualScroll();
      startCameraMove(initialCameraPosition, initialTargetPosition);
      scheduleHeroTextFade();
      updateMobileTitleVisibility();

      return;
    }

    const targetSection = document.getElementById(targetId);

    if (!targetSection || !scrollSections) return;

    isInside = true;
    scrollModeEnabled = true;
    isZooming = false;

    camera.position.copy(zoomCameraPosition);
    controls.target.copy(zoomLookAtPosition);
    controls.update();

    scrollSections.style.visibility = "visible";
    scrollSections.style.pointerEvents = "auto";

    // Fade out the mobile "Maliens Agency" hero title — it otherwise only
    // fades on the wheel-driven hero<->sections transition, so a direct nav
    // jump (header/mobile menu) straight into a section left it stuck on
    // screen over whatever we land on.
    updateMobileTitleVisibility();

    const sectionOffset = targetSection.offsetTop;
    const scrollTarget = window.innerHeight + sectionOffset;

    // Animating (below) means a jump to Contact now visibly passes through
    // Services mid-flight — servicesScene's own "safety net" auto-focus
    // (meant for a nav jump that lands ON Services) would otherwise
    // mistake that transit for an arrival and hijack the scroll. Suppress
    // it unless Services actually IS the destination; snapTo below clears
    // this itself once the tween completes or is interrupted.
    window.maliensSuppressServiceFocus = targetId !== "services";

    // Animate via the same eased GSAP glide wheel-triggered snaps use,
    // instead of jumping virtualScroll straight to the target — so nav
    // links (header, mobile menu, footer CTA) scroll smoothly through
    // the sections in between rather than cutting instantly.
    snapTo(scrollTarget);
  };

  // =====================
  // Model Loader
  // =====================
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  const loader = new GLTFLoader(sharedLoadingManager);
  loader.setDRACOLoader(dracoLoader);

  // =====================
  // MINI CHARACTER SCREEN
  // =====================
  const miniCanvas = document.createElement("canvas");
  miniCanvas.width = 512;
  miniCanvas.height = 512;

  const miniCtx = miniCanvas.getContext("2d");
  miniCtx.imageSmoothingEnabled = false;

  // Looping side-to-side nudge on the left/right arrows — a constant hint,
  // independent of clicks, that they're the clickable controls for
  // switching characters. Each arrow bounces a few pixels toward the
  // direction it points, then back.
  let miniArrowBounce = 0;

  const miniTexture = new THREE.CanvasTexture(miniCanvas);
  miniTexture.colorSpace = THREE.SRGBColorSpace;
  miniTexture.flipY = false;
  miniTexture.minFilter = THREE.NearestFilter;
  miniTexture.magFilter = THREE.NearestFilter;

  const miniAssets = {
    bg: new Image(),
    title: new Image(),
    arrowLeft: new Image(),
    arrowRight: new Image(),

    characters: [],
  };

  miniAssets.bg.src = "image/miniScreen/ScreenMini.png";
  miniAssets.title.src = "image/miniScreen/mini_title.png";
  miniAssets.arrowLeft.src = "image/miniScreen/arrow_left.png";
  miniAssets.arrowRight.src = "image/miniScreen/arrow_right.png";

  const MINI_CHARACTER_COUNT = 7;

  const miniCharacterLabels = [
    "THE STRATEGIST",
    "THE NAVIGATOR",
    "THE VISIONARY",
    "THE CREATOR",
    "THE STORYTELLER",
    "THE BUILDER",
    "THE CONDUCTOR",
  ];

  for (let i = 1; i <= MINI_CHARACTER_COUNT; i++) {
    const character = new Image();
    character.src = `image/miniScreen/character_${i}.png`;

    miniAssets.characters.push(character);
  }

  const miniCharacters = miniAssets.characters.map((character, index) => ({
    character,
    label: miniCharacterLabels[index],
  }));

  let currentMiniCharacter = 0;
  let miniPressedButton = null;

  // Quick digital-glitch flash on the character portrait only, played once
  // each time it's switched — everything else on the mini screen (title,
  // arrows, label) stays completely untouched.
  let miniGlitchStartTime = -Infinity;
  const MINI_GLITCH_DURATION = 0.22;

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

  // Same "contain" fit as drawImageContain, but torn into a few
  // horizontally-jittered slices with a cheap red/cyan chromatic-aberration
  // pass on top — intensity fades from 1 (just switched) to 0 (settled).
  function drawGlitchedImageContain(ctx, img, x, y, boxW, boxH, intensity) {
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
    const maxShift = 14 * intensity;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, boxW, boxH);
    ctx.clip();

    // Chromatic aberration: two offset copies additively blended.
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5 * intensity;
    ctx.drawImage(img, drawX - maxShift * 0.6, drawY, drawW, drawH);
    ctx.drawImage(img, drawX + maxShift * 0.6, drawY, drawW, drawH);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // Torn scanlines: horizontal slices, each independently jittered.
    const sliceCount = 7;
    const sliceH = drawH / sliceCount;

    for (let i = 0; i < sliceCount; i++) {
      const sliceY = i * sliceH;
      const jitter = (Math.random() * 2 - 1) * maxShift;

      ctx.drawImage(
        img,
        0,
        (sliceY / drawH) * img.naturalHeight,
        img.naturalWidth,
        (sliceH / drawH) * img.naturalHeight,
        drawX + jitter,
        drawY + sliceY,
        drawW,
        sliceH + 1,
      );
    }

    ctx.restore();
  }

  function drawMiniScreen() {
    miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

    if (miniAssets.bg.complete && miniAssets.bg.naturalWidth) {
      miniCtx.drawImage(
        miniAssets.bg,
        0,
        0,
        miniCanvas.width,
        miniCanvas.height,
      );
    } else {
      miniCtx.fillStyle = "#003f2f";
      miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);
    }

    drawImageContain(miniCtx, miniAssets.title, 120, 65, 272, 105);

    const current = miniCharacters[currentMiniCharacter];

    const glitchElapsed =
      (performance.now() - miniGlitchStartTime) / 1000;

    if (glitchElapsed < MINI_GLITCH_DURATION) {
      const glitchIntensity = 1 - glitchElapsed / MINI_GLITCH_DURATION;
      drawGlitchedImageContain(
        miniCtx,
        current.character,
        91,
        175,
        330,
        215,
        glitchIntensity,
      );
    } else {
      drawImageContain(miniCtx, current.character, 91, 175, 330, 215);
    }

    miniCtx.save();
    miniCtx.translate(86 - miniArrowBounce, 286);
    if (miniPressedButton === "left") miniCtx.scale(0.82, 0.82);
    drawImageContain(miniCtx, miniAssets.arrowLeft, -30, -30, 60, 60);
    miniCtx.restore();

    miniCtx.save();
    miniCtx.translate(426 + miniArrowBounce, 286);
    if (miniPressedButton === "right") miniCtx.scale(0.82, 0.82);
    drawImageContain(miniCtx, miniAssets.arrowRight, -30, -30, 60, 60);
    miniCtx.restore();

    // MINI SCREEN LABEL TEXT
    miniCtx.save();

    miniCtx.font = '400 30px "Silkscreen", monospace';
    const labelGradient = miniCtx.createLinearGradient(130, 0, 382, 0);
    labelGradient.addColorStop(0, "#32FFB7");
    labelGradient.addColorStop(1, "#00EEFF");

    miniCtx.fillStyle = labelGradient;
    miniCtx.textAlign = "center";
    miniCtx.textBaseline = "middle";
    miniCtx.letterSpacing = "9%";

    miniCtx.fillText(current.label, miniCanvas.width / 2, 421);

    miniCtx.restore();

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

    miniGlitchStartTime = performance.now();

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

      // Darken the whole console/prop model — everything here is unlit
      // MeshBasicMaterial (baked texture × material.color), so scaling
      // .color down darkens it uniformly without needing real scene
      // lights. Skips the three screens below, which get their own
      // dynamic-canvas materials assigned later and should stay at full
      // brightness for readability.
      const DARKEN_FACTOR = 0.22;
      const dynamicScreenNames = ["screen", "screen001", "controller_screen"];

      // The two diagonal window-frame beams ("Cast Aluminum" materials) read
      // as a strong green glow even after DARKEN_FACTOR, so they get an
      // extra reduction on top of it.
      const BEAM_MESH_NAMES = ["Cube007", "Cube008"];
      const BEAM_EXTRA_DARKEN = 0.55;

      model.traverse((child) => {
        if (!child.isMesh || dynamicScreenNames.includes(child.name)) return;

        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        const extra = BEAM_MESH_NAMES.includes(child.name)
          ? BEAM_EXTRA_DARKEN
          : 1;

        materials.forEach((mat) => {
          if (mat?.color) mat.color.multiplyScalar(DARKEN_FACTOR * extra);
        });
      });

      const meshParts = [];
      model.traverse((child) => {
        if (child.isMesh) {
          meshParts.push({
            name: child.name || "(no name)",
            type: child.type,
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
          "Sphere.001Action",
        );

        if (clip) {
          handleAction = mixer.clipAction(clip);
          handleAction.setLoop(THREE.LoopOnce, 1);
          handleAction.clampWhenFinished = true;

          // "Book a Mission Now" — once the handle finishes its swing
          // (triggered below by clicking it), jump to the contact section
          // instead of just leaving the handle sitting in its new pose.
          mixer.addEventListener("finished", (event) => {
            if (event.action === handleAction && window.maliensGoToSection) {
              window.maliensGoToSection("contact");
            }
          });
        } else {
          console.warn('❌ Animation clip "Sphere.001Action" not found');
        }

        console.log(
          "Animations:",
          gltf.animations.map((a) => a.name),
        );
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

      // Ambient glitch on the TV's screenBg — a quick flicker every 1.5s,
      // purely decorative (old-CRT flavor). Only plays on the idle "start"
      // (title) screen — once the game is actually being played, the
      // screenBg keeps showing behind it but stays glitch-free so it
      // doesn't distract from gameplay. Everything else drawn on top
      // (bullets, monster, cow, score, text) is unaffected regardless.
      let bgGlitchStartTime = -Infinity;
      let bgGlitchNextAt = performance.now() + 5000;
      let bgGlitchNextGapIsShort = false;
      const BG_GLITCH_DURATION = 180; // ms

      function scheduleNextBgGlitch(now) {
        bgGlitchNextAt = now + (bgGlitchNextGapIsShort ? 3000 : 5000);
        bgGlitchNextGapIsShort = !bgGlitchNextGapIsShort;
      }

      function drawGlitchedBg(img, w, h, intensity) {
        gameCtx.save();

        // A stutter rather than a smooth fade — 3-4 quick flicker beats
        // within the short window, each with its own jitter, so it reads
        // as a snappy digital glitch instead of a soft flash.
        const flicker = Math.abs(Math.sin(intensity * Math.PI * 3.5));
        const punch = intensity * (0.4 + 0.6 * flicker);

        const maxShift = 26 * punch;

        // Chromatic aberration, kept subtle — this is what was reading as
        // a bright white flash, so its alpha is much lower than the
        // distortion below.
        gameCtx.globalCompositeOperation = "lighter";
        gameCtx.globalAlpha = 0.1 * punch;
        gameCtx.drawImage(img, -maxShift * 0.6, 0, w, h);
        gameCtx.drawImage(img, maxShift * 0.6, 0, w, h);
        gameCtx.globalCompositeOperation = "source-over";
        gameCtx.globalAlpha = 1;

        // Torn scanlines — more, thinner, and unevenly jittered (including
        // occasional larger "skip" jumps and a few mirrored slices) for a
        // noticeably rougher, more chaotic tear than a uniform ripple.
        const sliceCount = 22;
        const sliceH = h / sliceCount;

        for (let i = 0; i < sliceCount; i++) {
          const sliceY = i * sliceH;
          const isSkip = Math.random() < 0.25;
          const jitter =
            (Math.random() * 2 - 1) * maxShift * (isSkip ? 1.8 : 0.8);
          const mirrored = Math.random() < 0.15;

          gameCtx.save();

          if (mirrored) {
            gameCtx.translate(jitter + w, sliceY);
            gameCtx.scale(-1, 1);
            gameCtx.drawImage(
              img,
              0,
              sliceY,
              img.naturalWidth || img.width,
              (sliceH / h) * (img.naturalHeight || img.height),
              0,
              0,
              w,
              sliceH + 1,
            );
          } else {
            gameCtx.drawImage(
              img,
              0,
              sliceY,
              img.naturalWidth || img.width,
              (sliceH / h) * (img.naturalHeight || img.height),
              jitter,
              sliceY,
              w,
              sliceH + 1,
            );
          }

          gameCtx.restore();
        }

        gameCtx.restore();
      }

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

        const clicked = intersects[0].object;

        // GAME SCREEN
        const gameScreenHit = intersects.find(
          (i) => i.object.name === "screen",
        );

        if (gameScreenHit && gameScreenHit.uv) {
          const uv = gameScreenHit.uv;

          if (gameState === "start" || gameState === "gameover") {
            resetGame();
            gameState = "playing";
            return;
          }

          if (gameState === "playing") {
            touchMoveDirection = uv.x < 0.5 ? 1 : -1;
            return;
          }
        }

        // MINI SCREEN
        const miniScreenHit = intersects.find(
          (i) => i.object.name === "screen001",
        );

        if (miniScreenHit && miniScreenHit.uv) {
          const button = getMiniButtonFromUV(miniScreenHit.uv);

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

        // HANDLE / CTA
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

      window.addEventListener("pointerup", () => {
        touchMoveDirection = 0;
      });

      window.addEventListener("pointercancel", () => {
        touchMoveDirection = 0;
      });

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
          a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y
        );
      }

      updateGame = function (dt) {
        blinkTimer += dt;

        if (gameState !== "playing") return;

        score += dt * 10;

        // cow movement
        if (keys["ArrowLeft"] || keys["KeyA"] || touchMoveDirection === -1) {
          cow.x -= cow.speed * dt;
          cow.dir = -1;
        }

        if (keys["ArrowRight"] || keys["KeyD"] || touchMoveDirection === 1) {
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

          gameCtx.drawImage(
            gameAssets.cow,
            -cow.w / 2,
            -cow.h / 2,
            cow.w,
            cow.h,
          );

          gameCtx.restore();
        }

        // score
        drawPixelText(
          `SCORE ${Math.floor(score)}`,
          gameCanvas.width / 2,
          80,
          32,
        );

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
            drawPixelText("TAP TO START", gameCanvas.width / 2, 550, 40);
          }

          // Whole-frame glitch — everything drawn above (bg, cow, monster,
          // logo, text) together, not just the background image. Only
          // plays on this idle title screen; once actual gameplay starts
          // (gameState "playing") the screen stays glitch-free.
          const nowMs = performance.now();

          if (nowMs >= bgGlitchNextAt) {
            bgGlitchStartTime = nowMs;
            scheduleNextBgGlitch(nowMs);
          }

          const bgGlitchElapsed = nowMs - bgGlitchStartTime;

          if (bgGlitchElapsed < BG_GLITCH_DURATION) {
            const bgGlitchIntensity = 1 - bgGlitchElapsed / BG_GLITCH_DURATION;
            drawGlitchedBg(
              gameCanvas,
              gameCanvas.width,
              gameCanvas.height,
              bgGlitchIntensity,
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
            drawPixelText("TAP TO RESTART", gameCanvas.width / 2, 520, 40);
          }
        }

        gameTexture.needsUpdate = true;
      };

      // Load textures once
      const ctaTex = textureLoader.load("image/CTAButton-2.png");

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
          // The recompressed model's "screen" mesh is curved, and its UVs
          // come out horizontally mirrored — a texture-level flip
          // (repeat.x = -1) only looks right from some angles because the
          // mirroring isn't uniform across the curved surface. Flipping
          // the mesh's actual UV data fixes it consistently everywhere.
          // The recompressed model's UV chart for this curved screen is
          // inconsistent (some regions read correctly, others come out
          // mirrored) — a uniform flip/rotate on the existing UVs can't
          // fix a per-region inconsistency. Discarding it and computing a
          // fresh, uniform planar projection from the mesh's own local X/Y
          // extents guarantees one consistent mapping across the whole
          // surface.
          const posAttr = child.geometry.attributes.position;
          const uvAttr = child.geometry.attributes.uv;
          if (posAttr && uvAttr) {
            let minX = Infinity;
            let maxX = -Infinity;
            let minZ = Infinity;
            let maxZ = -Infinity;
            for (let i = 0; i < posAttr.count; i++) {
              const x = posAttr.getX(i);
              const z = posAttr.getZ(i);
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (z < minZ) minZ = z;
              if (z > maxZ) maxZ = z;
            }
            const spanX = maxX - minX || 1;
            const spanZ = maxZ - minZ || 1;
            for (let i = 0; i < posAttr.count; i++) {
              const u = 1 - (posAttr.getX(i) - minX) / spanX;
              const v = 1 - (posAttr.getZ(i) - minZ) / spanZ;
              uvAttr.setXY(i, u, v);
            }
            uvAttr.needsUpdate = true;
          }

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
  // Named (rather than inline) so the touch handlers below can feed it
  // synthetic "wheel-shaped" events too — real phones never fire wheel
  // events on a swipe, so without this the whole scroll experience (which
  // is 100% wheel-driven) is completely inert on touch devices.
  function handleScrollGesture(event) {
      // Only block scrolling while the camera is already animating
      if (isZooming) {
        event.preventDefault();
        return;
      }

      if (isInside && scrollModeEnabled) {
        event.preventDefault();

        // While the Services signpost is stepping through its service boards,
        // let servicesScene.js own the wheel.
        if (window.maliensServiceFocused) return;

        if (event.deltaY === 0) return;

        const total = getTotalSectionsHeight();
        const stops = getSnapStops(); // [Services top, form top, footer top]
        const dir = event.deltaY > 0 ? 1 : -1;
        const nowMs = performance.now();

        // Quiet gap BEFORE this wheel event. Every wheel event (free or snap)
        // refreshes lastWheelTime, so a single flick — however hard, and
        // however long its inertia tail runs — never opens a second gap wide
        // enough to count as a new gesture. One flick = one section.
        const idleBefore = nowMs - lastWheelTime;
        lastWheelTime = nowMs;

        // A genuine pause ends the previous flick; until then, once a snap has
        // fired this flick, ignore every remaining wheel event (no carry-through
        // free-scroll past the section it just landed on). Releasing this also
        // requires the snap's own cooldown to have elapsed — a hard/fast flick
        // can have a brief internal lull (e.g. between its initial motion and
        // an inertia tail) that clears GESTURE_GAP well before the snap has
        // actually finished animating; without this, that lull let a later
        // wheel event in this SAME physical flick fall through to the
        // unconditional free-scroll accumulator below (which doesn't check
        // the cooldown at all) and add its full deltaY on top of the
        // in-flight snap's target — overshooting straight past the section
        // the snap was already heading for.
        // Trackpad inertia keeps firing wheel events for a while after the
        // initial flick, with the gap BETWEEN those trailing ticks growing
        // as it decays — easily clearing GESTURE_GAP on its own well before
        // the tail actually ends, even though it's still the same physical
        // gesture. Requiring the snap tween to have actually finished
        // (snapTween null) as well closes that hole: a stray late tick can
        // no longer slip through mid-glide just because it happened to land
        // in one of those widening gaps.
        if (
          idleBefore >= GESTURE_GAP &&
          !snapTween &&
          nowMs - lastSnapTime >= SNAP_COOLDOWN
        ) {
          flickLocked = false;
        }
        if (flickLocked) return;

        const aboutEl = document.getElementById("about");
        const logoStop = aboutEl
          ? window.innerHeight + offsetWithinScrollSections(aboutEl)
          : window.innerHeight;
        const servicesStop = stops.length ? stops[0] : total;

        const gate = () => {
          if (idleBefore < GESTURE_GAP) return false; // same flick / inertia tail
          if (nowMs - lastSnapTime < SNAP_COOLDOWN) return false; // mid-glide
          return true;
        };

        const exitToHero = () => {
          lastSnapTime = nowMs;
          flickLocked = true;
          killSnap();
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
          updateMobileTitleVisibility();
        };

        // -------- SNAP: "IMPOSSIBLE TO IGNORE" hero part <-> logo section ----
        // At virtualScroll ~0 the hero is zoomed with the "WE BUILD BRANDS /
        // IMPOSSIBLE TO IGNORE" overlay showing. Scrolling up from THERE goes
        // all the way out to the arcade banner; scrolling up from the logo
        // only comes back to this part.
        if (targetScroll < logoStop - 4) {
          if (!gate()) return;
          lastSnapTime = nowMs;
          if (dir < 0) exitToHero();
          else snapTo(logoStop);
          return;
        }

        // Sitting on the logo top and scrolling up → glide back to the
        // "IMPOSSIBLE TO IGNORE" hero part (not the main banner).
        if (dir < 0 && targetScroll <= logoStop + 8) {
          if (!gate()) return;
          lastSnapTime = nowMs;
          snapTo(0);
          return;
        }

        // -------- FREE SCROLL: logo -> quote block -> marquee ------------
        if (targetScroll < servicesStop - 4) {
          // Once the Services section covers >= 60% of the screen, the next
          // scroll down jumps it straight to 100% (servicesScene then spins
          // the tiang).
          const coverSnap = servicesStop - window.innerHeight * 0.4;
          if (dir > 0 && targetScroll >= coverSnap && gate()) {
            lastSnapTime = nowMs;
            snapTo(servicesStop);
            if (window.maliensFocusFirstService) {
              window.maliensFocusFirstService();
            }
            return;
          }

          killSnap();
          targetScroll = Math.max(
            logoStop,
            Math.min(
              targetScroll + event.deltaY * FREE_SCROLL_GAIN,
              servicesStop,
            ),
          );
          return;
        }

        // -------- SNAP: Services -> form -> footer ----------------------
        if (!gate()) return;

        let idx = 0;
        let best = Infinity;
        stops.forEach((s, i) => {
          const d = Math.abs(s - targetScroll);
          if (d < best) {
            best = d;
            idx = i;
          }
        });

        // scrolling up from Services drops back into the free-scroll zone
        if (dir < 0 && idx === 0) {
          lastSnapTime = nowMs;
          snapTo(Math.max(logoStop, servicesStop - 5));
          return;
        }

        lastSnapTime = nowMs;
        const nextIdx = Math.max(0, Math.min(stops.length - 1, idx + dir));
        snapTo(Math.max(0, Math.min(stops[nextIdx], total)));
        return;
      }

      if (event.deltaY > 0 && !isInside) {
        event.preventDefault();

        hideScrollSections();
        resetVirtualScroll();

        isInside = true;

        startCameraMove(zoomCameraPosition, zoomLookAtPosition);
        scheduleHeroTextFade();
        updateMobileTitleVisibility();

        return;
      }
  }

  window.addEventListener("wheel", handleScrollGesture, { passive: false });

  // =====================
  // Touch Trigger (mobile equivalent of the wheel trigger above)
  // =====================
  // Translates a vertical swipe into the same deltaY-shaped events
  // handleScrollGesture already knows how to interpret, reusing all of its
  // gate/snap/free-scroll logic untouched.
  const TOUCH_SCROLL_GAIN = 2.2; // swipes are short — amplify to match a wheel flick's reach
  let lastTouchY = null;

  window.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) return;
      lastTouchY = event.touches[0].clientY;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (lastTouchY === null || event.touches.length !== 1) return;

      const currentY = event.touches[0].clientY;
      const deltaY = (lastTouchY - currentY) * TOUCH_SCROLL_GAIN; // finger up = scroll down, same sign as wheel deltaY
      lastTouchY = currentY;

      if (deltaY === 0) return;

      handleScrollGesture({
        deltaY,
        preventDefault: () => event.preventDefault(),
      });
    },
    { passive: false },
  );

  window.addEventListener(
    "touchend",
    () => {
      lastTouchY = null;
    },
    { passive: true },
  );

  // pointer for game
  window.addEventListener("pointerup", () => {
    touchMoveDirection = 0;
  });

  window.addEventListener("pointercancel", () => {
    touchMoveDirection = 0;
  });

  // Pointer
  window.addEventListener("pointermove", (event) => {
    if (!model) return;

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObject(model, true);

    let hovering = false;

    for (const hit of intersects) {
      if (
        [
          "Sphere005",
          "Sphere005_1",
          "Sphere005_2",
          "Sphere005_3",
          "controller_screen",
        ].includes(hit.object.name)
      ) {
        hovering = true;
      }

      if (hit.object.name === "screen001" && getMiniButtonFromUV(hit.uv)) {
        hovering = true;
      }
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

    fitVideoBackgroundCover();
    marquee.visible = window.innerWidth > 500;

    // Always update the saved responsive starting position.
    // But only move the real camera if we are currently at the hero start.
    setResponsiveCamera(!isInside && !isZooming);

    killSnap();
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
  // Once scrollSections has scrolled up past a full viewport height, its
  // own opaque sections (next-section, quote-section, etc.) fully cover
  // this fixed full-screen canvas — nothing it draws is visible again
  // until scrolling back up. Skipping the GPU draw call and the 2D canvas
  // redraws (game/mini-screen) while covered avoids burning a full render
  // pass 60x/second for a section nobody can see.
  function isHeroCovered() {
    return isInside && virtualScroll >= window.innerHeight;
  }

  function animate() {
    requestAnimationFrame(animate);

    const hidden = isHeroCovered();

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    // Once the user has committed to scrolling into the sections (isInside),
    // the console's mini-screen and the cow-shooter game on it are already
    // on their way off-screen — redrawing their canvases and re-uploading
    // the resulting textures to the GPU every frame (each doing several
    // drawImage/gradient/shadowBlur calls) was previously gated only on
    // full coverage (isHeroCovered), so it kept running throughout the
    // entire hero->logo scroll transition, competing with both the hero's
    // own render and the incoming section's renderer for the same frame
    // budget. Stopping it as soon as isInside flips removes that load for
    // the whole transition instead of only once it's fully covered.
    if (!hidden && !isInside) {
      miniArrowBounce = Math.sin(clock.getElapsedTime() * 3) * 8;
      drawMiniScreen();
    }

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
          ? THREE.MathUtils.lerp(moonBaseY, getMoonScrollY(), cameraT)
          : THREE.MathUtils.lerp(getMoonScrollY(), moonBaseY, cameraT);

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

    if (!hidden) {
      // Same reasoning as the mini-screen above: the game's canvas redraw
      // (bullets/monster/cow, several with shadowBlur — the priciest
      // Canvas2D effect) plus its own texture re-upload only matter while
      // the hero is still the idle focus. The actual WebGL render still has
      // to happen while merely fading/zooming out (isInside but not yet
      // hidden), so that stays gated on `hidden` alone.
      if (!isInside) {
        updateGame(dt);
        drawGame();
      }

      renderer.render(scene, camera);

      texture.offset.x -= 0.0015;
    }
  }

  disableSecondScrollStage();
  animate();
}
