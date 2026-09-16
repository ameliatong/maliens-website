import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { sharedLoadingManager } from "./loadingManager.js";

export function initServicesScene() {
  // Mobile breakpoint matching the rest of the site (services.css) — below
  // this, the info panel sits fixed at the bottom instead of the right, so
  // the model/board framing has no reason to shift left/right of centre.
  const isMobileServicesView = () => window.innerWidth <= 500;

  // Between the mobile breakpoint (500px) and desktop (1100px), blend
  // smoothly between the mobile and desktop tuning instead of jumping
  // straight from one to the other — below 500 and at/above 1100 this
  // returns exactly 0 / 1, so those two ranges are untouched.
  const SERVICES_RESPONSIVE_MIN = 500;
  const SERVICES_RESPONSIVE_MAX = 1100;
  function getServicesResponsiveT() {
    const width = window.innerWidth;
    if (width <= SERVICES_RESPONSIVE_MIN) return 0;
    if (width >= SERVICES_RESPONSIVE_MAX) return 1;
    const linearT =
      (width - SERVICES_RESPONSIVE_MIN) /
      (SERVICES_RESPONSIVE_MAX - SERVICES_RESPONSIVE_MIN);
    // Eased rather than linear: the desktop framing (tight distance, board
    // shifted left of the side panel) only really works once there's enough
    // width to spare, so stay closer to the safer mobile framing through
    // most of the range and only swing over to desktop near 1100px.
    return linearT * linearT;
  }
  function lerpServicesValue(mobileValue, desktopValue) {
    const t = getServicesResponsiveT();
    return mobileValue + (desktopValue - mobileValue) * t;
  }

  // The DEFAULT (unfocused) view's horizontal shift needs three tuning
  // points, not two — phone (<=500px), tablet (500-768px), and desktop
  // (768-1100px, then held) — because the SAME shift fraction reads very
  // differently at different aspect ratios: a narrow phone viewport has so
  // little width to spare that the tablet-tuned shift pushes the model
  // half off-canvas, while 768px is services.css's own breakpoint for the
  // info panel moving from bottom-pinned to right-pinned (below that, the
  // model has nothing to dodge yet, so it should stay close to centered).
  function lerpDefaultViewShift(phoneValue, tabletValue, desktopValue) {
    const width = window.innerWidth;

    if (width <= SERVICES_RESPONSIVE_MIN) return phoneValue;

    if (width <= 768) {
      if (width >= 600) return tabletValue;
      const linearT = (width - SERVICES_RESPONSIVE_MIN) / (600 - SERVICES_RESPONSIVE_MIN);
      return phoneValue + (tabletValue - phoneValue) * linearT;
    }

    if (width >= SERVICES_RESPONSIVE_MAX) return desktopValue;

    const linearT =
      (width - 768) / (SERVICES_RESPONSIVE_MAX - 768);
    const t = linearT * linearT;
    return tabletValue + (desktopValue - tabletValue) * t;
  }

  // =========================================================
  // DOM
  // =========================================================
  const section = document.getElementById("services");
  const canvas = document.getElementById("servicesCanvas");

  const infoPanel = document.getElementById("serviceInfoPanel");
  const infoText = document.getElementById("serviceInfoText");
  const infoTitle = document.getElementById("serviceInfoTitle");
  const infoDescription = document.getElementById("serviceInfoDescription");
  const infoList = document.getElementById("serviceInfoList");

  if (
    !section ||
    !canvas ||
    !infoPanel ||
    !infoText ||
    !infoTitle ||
    !infoDescription ||
    !infoList
  ) {
    console.error("Services section DOM elements are missing:", {
      section,
      canvas,
      infoPanel,
      infoText,
      infoTitle,
      infoDescription,
      infoList,
    });

    return;
  }

  window.maliensServiceFocused = false;

  // =========================================================
  // SERVICE CONTENT
  // =========================================================
  const services = [
    {
      title: "Social Media Management",
      description:
        "We manage your social presence with consistent content, community engagement, and strategic planning to keep your brand active and relevant.",
      items: [
        "Content planning & scheduling",
        "Monthly content calendars",
        "Performance monitoring & reporting",
      ],
      objectName: "Cube.008",
    },

    {
      title: "Creative Branding",
      description:
        "We build distinctive brand identities that help businesses stand out, connect with audiences, and create lasting impressions.",
      items: [
        "Brand strategy & positioning",
        "Logo & visual identity design",
        "Brand guidelines development",
        "Brand messaging & storytelling",
      ],
      objectName: "Cube.007",
    },

    {
      title: "Digital Campaigns",
      description:
        "We create and execute impactful social campaigns that spark conversations, increase reach, and drive meaningful engagement.",
      items: [
        "Campaign concept & direction",
        "Social content & rollout",
        "Influencer collaboration",
        "Campaign performance tracking",
      ],
      objectName: "Cube.006",
    },

    {
      title: "Content Creation",
      description:
        "We produce creative content that captures attention, tells compelling stories, and strengthens your brand across digital platforms.",
      items: [
        "Creative design assets",
        "Photography & videography",
        "Short-form video production",
        "Motion graphics & animations",
      ],
      objectName: "Cube.018",
    },

    {
      title: "Website Creation",
      description:
        "We build websites that combine seamless user experiences, strong visual storytelling, and business-driven functionality.",
      items: [
        "Website & landing page UI/UX design",
        "Website development & CMS implementation",
        "Content writing & copywriting",
        "SEO & performance optimization",
      ],
      objectName: "Cube.002",
    },

    {
      title: "Social Media Ad Buying",
      description:
        "We plan, launch, and optimize paid advertising campaigns to maximize reach, conversions, and return on investment.",
      items: [
        "Meta Ads management",
        "Campaign setup & targeting",
        "Campaign optimization",
        "Performance analysis & reporting",
      ],
      objectName: "Cube.028",
    },
  ];

  // =========================================================
  // SCENE
  // =========================================================
  const scene = new THREE.Scene();

  // Transparent because CSS supplies the background.
  scene.background = null;

  // =========================================================
  // CAMERA
  // =========================================================
  const camera = new THREE.PerspectiveCamera(
    35,
    section.clientWidth / section.clientHeight,
    0.1,
    1000,
  );

  /*
    Slight low-angle view.

    Y is lower than the model centre.
    The camera looks upward towards the model.
  */
  camera.position.set(12, -2.5, 30);

  // =========================================================
  // RENDERER
  // =========================================================
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.setSize(section.clientWidth, section.clientHeight, false);

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.setClearColor(0x000000, 0);

  // =========================================================
  // LIGHTING
  // =========================================================

  // Overall soft visibility
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x111144, 2.6);

  scene.add(hemisphereLight);

  // Main light from upper-right
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.5);

  keyLight.position.set(8, 18, 14);
  keyLight.castShadow = true;

  scene.add(keyLight);

  // Fill light from left
  const fillLight = new THREE.DirectionalLight(0x66ccff, 2.2);

  fillLight.position.set(-10, 7, 8);

  scene.add(fillLight);

  // Rim light from behind
  const rimLight = new THREE.DirectionalLight(0x4466ff, 2.5);

  rimLight.position.set(0, 10, -12);

  scene.add(rimLight);

  // =========================================================
  // ORBIT CONTROLS
  // =========================================================
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.07;

  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableRotate = true;

  /*
  Lock vertical movement.

  Both values are the same, so the user can only
  rotate horizontally around the model.
*/
  const lockedPolarAngle = Math.PI / 2 + 0.08;

  controls.minPolarAngle = lockedPolarAngle;
  controls.maxPolarAngle = lockedPolarAngle;

  /*
  Full horizontal rotation.
*/
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;

  controls.target.set(0, 1.8, 0);
  controls.update();

  // =========================================================
  // MODEL STATE
  // =========================================================
  let model = null;

  const clickableBoards = [];
  const meshToService = new Map();

  // Whole-model default composition.
  const defaultCameraPosition = new THREE.Vector3(12, -2.5, 30);

  const defaultTargetPosition = new THREE.Vector3(0, 2.3, 0);

  // The model's own default position/rotation (untouched by any focus
  // session) — used to snap the model back when the section leaves the
  // viewport, so a leftover zoomed-in transform never gets mistaken for
  // "the default view" the next time focus mode is entered.
  const defaultModelPosition = new THREE.Vector3();
  const defaultModelQuaternion = new THREE.Quaternion();

  // Saved view before entering focus mode.
  const previousCameraPosition = new THREE.Vector3();
  const previousTargetPosition = new THREE.Vector3();
  const previousModelPosition = new THREE.Vector3();
  const previousModelQuaternion = new THREE.Quaternion();

  // =========================================================
  // FOCUS STATE
  // =========================================================
  let focusedIndex = -1;
  let isFocused = false;
  let isAnimating = false;
  // Desktop keeps the camera/model/focusedIndex state when you scroll away
  // (see checkStaleFocusState) — but .service-info-panel is position:fixed,
  // so it has to be hidden while the section itself isn't in view, or it
  // keeps rendering on top of whatever section scrolled into view next.
  // Tracks whether checkStaleFocusState hid it for that reason, so it knows
  // to show it again once the section comes back into view.
  let desktopPanelHiddenForExit = false;

  const animationDuration = 1.15;
  let animationStartTime = 0;

  const startCameraPosition = new THREE.Vector3();
  const endCameraPosition = new THREE.Vector3();

  const startTargetPosition = new THREE.Vector3();
  const endTargetPosition = new THREE.Vector3();

  const startModelPosition = new THREE.Vector3();
  const endModelPosition = new THREE.Vector3();

  const startModelQuaternion = new THREE.Quaternion();
  const endModelQuaternion = new THREE.Quaternion();

  // =========================================================
  // POINTER
  // =========================================================
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let pointerDownX = 0;
  let pointerDownY = 0;

  // =========================================================
  // HELPERS
  // =========================================================
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function isServicesVisible() {
    const rect = section.getBoundingClientRect();

    const viewportMiddle = window.innerHeight / 2;

    return rect.top <= viewportMiddle && rect.bottom >= viewportMiddle;
  }

  // Broader than isServicesVisible() above (which only counts once the
  // viewport's vertical middle is inside the section, for focus/auto-entry
  // logic) — this just asks whether ANY part of the section is on-screen,
  // so the render loop below can skip the GPU draw call while it's fully
  // scrolled away without cutting the canvas off early while its edge is
  // still visible.
  function isServicesOnScreen() {
    const rect = section.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function getBoardWorldCenter(board) {
    const box = new THREE.Box3().setFromObject(board);

    return box.getCenter(new THREE.Vector3());
  }

  function getBoardWorldSize(board) {
    const box = new THREE.Box3().setFromObject(board);

    return box.getSize(new THREE.Vector3());
  }

  function getBoardWorldQuaternion(board) {
    const worldQuaternion = new THREE.Quaternion();

    board.getWorldQuaternion(worldQuaternion);

    return worldQuaternion;
  }

  // Splits `text` into <span class="vcr-word"><span class="vcr-inner">
  // word</span></span> pairs appended into `container`, then plays a
  // staggered slide-up on each — same cut-reveal technique used for the
  // hero/contact/quote headings. Returns the Animation objects so a rapid
  // service switch can cancel them mid-flight instead of letting a stale
  // reveal finish over new content.
  function revealWordsInto(container, text, stagger) {
    container.textContent = "";
    const words = [];

    text.split(/(\s+)/).forEach((token) => {
      if (token === "") return;

      if (/^\s+$/.test(token)) {
        container.appendChild(document.createTextNode(token));
        return;
      }

      const outer = document.createElement("span");
      outer.className = "vcr-word";
      const inner = document.createElement("span");
      inner.className = "vcr-inner";
      inner.textContent = token;
      outer.appendChild(inner);
      container.appendChild(outer);
      words.push(inner);
    });

    return words.map((word, i) =>
      word.animate(
        [{ transform: "translateY(110%)" }, { transform: "translateY(0)" }],
        {
          duration: 700,
          delay: i * stagger,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      ),
    );
  }

  let activeInfoRevealAnims = [];

  function showServiceContent(index) {
    const service = services[index];

    if (!service) return;

    activeInfoRevealAnims.forEach((anim) => anim.cancel());

    // Wrap the title text in an inline span, then reveal it word by word —
    // each word paints its own copy of the cyan -> white gradient (see
    // .title-grad / .vcr-inner in services.css).
    infoTitle.textContent = "";
    const titleGrad = document.createElement("span");
    titleGrad.className = "title-grad";
    infoTitle.appendChild(titleGrad);
    const titleAnims = revealWordsInto(titleGrad, service.title, 50);

    const descriptionAnims = revealWordsInto(
      infoDescription,
      service.description,
      20,
    );

    activeInfoRevealAnims = [...titleAnims, ...descriptionAnims];

    infoList.innerHTML = "";

    service.items.forEach((item) => {
      const li = document.createElement("li");

      li.textContent = item;
      infoList.appendChild(li);
    });

    infoPanel.classList.add("visible");
    infoText.classList.add("visible");
    infoPanel.scrollTop = 0;
  }

  // Full hide — panel (dark scrim) and text together. Used for a true exit
  // from the section (nav jump, or the section leaving the viewport), so
  // the next fresh entry starts clean.
  function hideServiceContent() {
    infoPanel.classList.remove("visible");
    infoPanel.classList.remove("covers-model");
    infoText.classList.remove("visible");
  }

  // Fades out just the text, leaving the panel's dark scrim showing. Used
  // once the last service's sequence finishes: the scrim keeps masking the
  // model's edge without a stale "Social Media Ad Buying" block sitting
  // there indefinitely.
  function hideServiceText() {
    infoText.classList.remove("visible");
  }

  // Full reset back to the untouched default composition — used whenever
  // the section has left the viewport, so nothing about a focus session
  // (camera, model transform, panel) ever lingers once you've scrolled away
  // from Services.
  function resetToDefaultView() {
    window.maliensServiceFocused = false;
    isFocused = false;
    isAnimating = false;
    focusedIndex = -1;
    serviceSequenceCompleted = false;

    controls.enabled = true;
    controls.enableRotate = true;

    hideServiceContent();

    if (model) {
      model.position.copy(defaultModelPosition);
      model.quaternion.copy(defaultModelQuaternion);
    }

    camera.position.copy(defaultCameraPosition);
    controls.target.copy(defaultTargetPosition);
    controls.update();
  }

  function beginAnimation({
    cameraPosition,
    targetPosition,
    modelPosition,
    modelQuaternion,
  }) {
    if (!model) return;

    startCameraPosition.copy(camera.position);
    endCameraPosition.copy(cameraPosition);

    startTargetPosition.copy(controls.target);
    endTargetPosition.copy(targetPosition);

    startModelPosition.copy(model.position);
    endModelPosition.copy(modelPosition);

    startModelQuaternion.copy(model.quaternion);
    endModelQuaternion.copy(modelQuaternion);

    animationStartTime = performance.now();
    isAnimating = true;

    controls.enabled = false;
  }

  // =========================================================
  // BOARD FOCUS
  // =========================================================
  function focusBoard(index) {
    if (!model || isAnimating) return;

    const service = services[index];
    const board = clickableBoards[index];

    if (!service || !board) {
      console.warn(`Cannot focus service board at index ${index}`);
      return;
    }

    window.maliensServiceFocused = true;

    if (!isFocused) {
      previousCameraPosition.copy(camera.position);
      previousTargetPosition.copy(controls.target);
      previousModelPosition.copy(model.position);
      previousModelQuaternion.copy(model.quaternion);
    }

    focusedIndex = index;
    isFocused = true;

    showServiceContent(index);

    model.updateMatrixWorld(true);

    // =========================================================
    // BOARD CENTER
    // =========================================================

    const boardWorldCenter = getBoardWorldCenter(board);

    const boardLocalCenter = model.worldToLocal(boardWorldCenter.clone());

    // =========================================================
    // BOARD ROTATION
    // =========================================================

    const boardWorldQuaternion = new THREE.Quaternion();
    board.getWorldQuaternion(boardWorldQuaternion);

    const modelWorldQuaternion = new THREE.Quaternion();
    model.getWorldQuaternion(modelWorldQuaternion);

    /*
    Board rotation relative to the whole model.
  */
    const boardLocalQuaternion = modelWorldQuaternion
      .clone()
      .invert()
      .multiply(boardWorldQuaternion);

    /*
    IMPORTANT:
    For this GLB, the board front direction is LOCAL X.
  */
    const localFront = new THREE.Vector3(1, 0, 0);

    const currentFront = localFront
      .clone()
      .applyQuaternion(boardLocalQuaternion)
      .normalize();

    /*
    Calculate horizontal angle of the board.
  */
    const currentYaw = Math.atan2(currentFront.x, currentFront.z);

    /*
    Rotate the whole model so the selected board
    faces directly toward the camera.
  */
    const desiredYaw = -currentYaw;

    const desiredModelQuaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      desiredYaw,
    );

    // =========================================================
    // LEFT-SIDE MODEL POSITION
    // =========================================================

    /*
    This is where the selected board should appear
    in the Three.js world.

    More negative X = further left. Desktop shifts it left to leave room
    for the info panel fixed to the right (services.css); mobile's panel
    sits at the bottom instead, so there's no reason to shift there.
  */
    const boardFocusPosition = new THREE.Vector3(
      lerpServicesValue(0, -3.0),
      0,
      0,
    );

    /*
    Calculate where the selected board would be
    after applying the front-facing rotation.
  */
    const transformedBoardCenter = boardLocalCenter
      .clone()
      .multiply(model.scale)
      .applyQuaternion(desiredModelQuaternion);

    /*
    Move the entire model so the selected board
    lands at boardFocusPosition.
  */
    const desiredModelPosition = boardFocusPosition
      .clone()
      .sub(transformedBoardCenter);

    // =========================================================
    // CAMERA
    // =========================================================

    /*
    IMPORTANT:
    Camera stays centred.

    We do NOT move the camera left with the model,
    otherwise the model visually appears centred again.

    On mobile, aim below the board's true centre so it renders higher up
    on screen, clear of the info panel/text overlay pinned to the bottom.
  */
    const focusTargetYOffset = lerpServicesValue(-4, 0);
    const cameraTarget = new THREE.Vector3(0, focusTargetYOffset, 0);

    // Mobile now centers the board (no left shift), which reads as too
    // large/close on a narrow screen — pull the camera back a bit further
    // there so the board scales down to a more comfortable size.
    const focusDistance = lerpServicesValue(36, 17);

    const desiredCamera = new THREE.Vector3(0, 0, focusDistance);

    // =========================================================
    // ANIMATE
    // =========================================================

    beginAnimation({
      cameraPosition: desiredCamera,
      targetPosition: cameraTarget,
      modelPosition: desiredModelPosition,
      modelQuaternion: desiredModelQuaternion,
    });
  }

  function exitFocus() {
    if (!model || !isFocused || isAnimating) return;

    window.maliensServiceFocused = false;

    isFocused = false;
    focusedIndex = -1;

    hideServiceContent();

    beginAnimation({
      cameraPosition: previousCameraPosition,
      targetPosition: previousTargetPosition,
      modelPosition: previousModelPosition,
      modelQuaternion: previousModelQuaternion,
    });
  }

  // Called by heroScene when a nav link (header, mobile menu, footer CTA)
  // jumps to a section other than Services while the info panel is open —
  // exitFocus() alone won't run mid-animation and its own camera-restore
  // glide is pointless once we're navigating away anyway, so this just
  // clears the focused state and hides the panel immediately, skipping
  // the animation entirely.
  window.maliensForceExitServiceFocus = function () {
    if (!isFocused && !infoPanel.classList.contains("visible")) return;

    window.maliensServiceFocused = false;

    isFocused = false;
    focusedIndex = -1;
    isAnimating = false;
    serviceSequenceCompleted = false;
    servicesHasAutoEntered = false;

    controls.enabled = true;

    hideServiceContent();
  };

  function focusNextBoard(direction) {
    if (!model || isAnimating) return;

    /*
    Entering focus for the first time.
  */
    if (!isFocused) {
      if (direction > 0) {
        focusBoard(0);
      }

      return;
    }

    const nextIndex = focusedIndex + direction;

    /*
    Scrolling upward from the first board:
    restore the exact pre-focus view.
  */
    if (nextIndex < 0) {
      exitFocus();
      return;
    }

    /*
    Do not go beyond the final service.
    This allows the page scroll to continue afterwards.
  */
    if (nextIndex >= services.length) {
      window.maliensServiceFocused = false;
      return;
    }

    focusBoard(nextIndex);
  }

  // =========================================================
  // FIT DEFAULT MODEL VIEW
  // =========================================================
  function fitDefaultModelView() {
    /*
    Do nothing until the GLB has loaded.

    Also do not change the camera while a service
    board is focused or while an animation is running.
  */
    if (!model || isFocused || isAnimating) return;

    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);

    controls.update();
  }

  // =========================================================
  // LOAD MODEL
  // =========================================================
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  const loader = new GLTFLoader(sharedLoadingManager);
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    "model/tiang4.glb",

    (gltf) => {
      model = gltf.scene;

      scene.add(model);

      console.log("========== TIANG4 MESHES ==========");

      model.traverse((child) => {
        if (!child.isMesh) return;

        console.log({
          objectName: child.name,
          geometryName: child.geometry?.name,
          materialName: child.material?.name,
        });
      });

      /*
        Normalise the model to a fixed world size regardless of the .glb's
        export scale (a re-export at a different scale otherwise throws off the
        focus-board math, which is tuned against these world units). Then centre
        it on its bounds.
      */
      const TARGET_MODEL_SIZE = 22; // world units for the model's largest dimension
      model.updateMatrixWorld(true);
      const rawSize = new THREE.Box3()
        .setFromObject(model)
        .getSize(new THREE.Vector3());
      model.scale.setScalar(
        TARGET_MODEL_SIZE / Math.max(rawSize.x, rawSize.y, rawSize.z),
      );
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());

      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;

      model.updateMatrixWorld(true);

      /*
  Recalculate bounds after scale and centring.
*/
      model.updateMatrixWorld(true);
      // =========================================================
      // DEFAULT MODEL ORIENTATION
      // =========================================================

      model.rotation.set(0, -Math.PI / 2, 0);

      model.updateMatrixWorld(true);

      // =========================================================
      // FIT COMPLETE MODEL INTO CAMERA
      // =========================================================

      const centredBox = new THREE.Box3().setFromObject(model);

      const centredSize = centredBox.getSize(new THREE.Vector3());

      const centredCenter = centredBox.getCenter(new THREE.Vector3());

      const verticalFov = THREE.MathUtils.degToRad(camera.fov);

      const distanceForHeight = centredSize.y / (2 * Math.tan(verticalFov / 2));

      const horizontalFov =
        2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);

      const distanceForWidth =
        centredSize.x / (2 * Math.tan(horizontalFov / 2));

      /*
  Frame the model to ~55% of the viewport height on every screen size
  (height-driven, with a loose width guard so it can't overflow a narrow
  viewport), leaving clear space around it.
*/
      const MODEL_VIEWPORT_FRACTION = 0.75;

      // Desktop nudges the model right of centre to leave room for the
      // info panel, which sits fixed to the right (services.css). On
      // mobile that panel is pinned to the bottom instead, so the model
      // has no reason to be off-centre there — keep it framed in the
      // middle of the scene.
      const RIGHT_SHIFT_FRACTION = lerpDefaultViewShift(-0.08, -0.12, 0.12); // of the half view-width

      const fitDistance = Math.max(
        distanceForHeight / MODEL_VIEWPORT_FRACTION,
        distanceForWidth / 0.8,
      );

      /*
  Look level with the model's centre; camera sits slightly below for a
  subtle upward-looking angle. On mobile, aim a bit below the model's true
  centre so it renders higher up on screen — clear of the info panel/text
  overlay pinned to the bottom there.
*/
      const targetYOffset = centredSize.y * lerpServicesValue(0.15, 0);
      const cameraYOffset = -centredSize.y * 0.1;

      /*
  Nudge the model right of centre: the camera looks at a point left of the
  model, so the model renders to the right. Scaled to the view width so it
  stays the same relative offset on any screen.
*/
      const xShift =
        fitDistance * Math.tan(horizontalFov / 2) * RIGHT_SHIFT_FRACTION;

      camera.position.set(
        centredCenter.x - xShift,
        centredCenter.y + cameraYOffset,
        centredCenter.z + fitDistance,
      );

      controls.target.set(
        centredCenter.x - xShift,
        centredCenter.y + targetYOffset,
        centredCenter.z,
      );

      controls.update();

      /*
  Save this corrected whole-model view.
*/
      defaultCameraPosition.copy(camera.position);

      defaultTargetPosition.copy(controls.target);

      previousModelPosition.copy(model.position);
      previousModelQuaternion.copy(model.quaternion);

      defaultModelPosition.copy(model.position);
      defaultModelQuaternion.copy(model.quaternion);

      function normalizeMeshName(name = "") {
        return name.toLowerCase().replace(/[^a-z0-9]/g, "");
      }

      services.forEach((service, index) => {
        let board = null;

        const expectedName = normalizeMeshName(service.objectName);

        model.traverse((child) => {
          if (board || !child.isMesh) return;

          const currentName = normalizeMeshName(child.name);

          if (currentName === expectedName) {
            board = child;
          }
        });

        if (!board) {
          console.warn(`❌ Service board not found: ${service.objectName}`);

          return;
        }

        clickableBoards[index] = board;

        meshToService.set(board.uuid, index);

        board.traverse((child) => {
          if (child.isMesh) {
            meshToService.set(child.uuid, index);
          }
        });

        console.log(`✅ Registered ${service.title}:`, {
          requestedName: service.objectName,
          detectedName: board.name,
          serviceIndex: index,
        });
      });

      const registeredBoards = clickableBoards.filter(Boolean);

      console.log(
        `✅ Registered ${registeredBoards.length}/${services.length} service boards`,
      );

      console.table(
        clickableBoards.map((board, index) => ({
          index,
          service: services[index]?.title,
          detectedMesh: board?.name || "NOT FOUND",
        })),
      );

      // Re-apply the overall model view.
      camera.position.copy(defaultCameraPosition);
      controls.target.copy(defaultTargetPosition);
      controls.update();
    },

    undefined,

    (error) => {
      console.error("tiang4.glb load error:", error);
    },
  );

  // =========================================================
  // SERVICES ENTRY STATE
  // =========================================================

  let servicesHasAutoEntered = false;

  const servicesObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          // Desktop deliberately keeps whatever focus/camera state you
          // scrolled away with (see checkStaleFocusState, which also hides
          // the fixed-position panel so it doesn't linger over the next
          // section) — only mobile gets the full reset here.
          if (!isMobileServicesView()) return;

          servicesHasAutoEntered = false;

          resetToDefaultView();

          return;
        }
      });
    },
    {
      threshold: [0],
    },
  );

  servicesObserver.observe(section);

  // =========================================================
  // CLICK / POINTER
  // =========================================================
  canvas.addEventListener("pointerdown", (event) => {
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!model || isAnimating) return;

    const movedDistance = Math.hypot(
      event.clientX - pointerDownX,
      event.clientY - pointerDownY,
    );

    /*
      Ignore the pointer release if the user dragged OrbitControls.
    */
    if (movedDistance > 6) return;

    const rect = canvas.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;

    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersections = raycaster.intersectObject(model, true);

    let clickedServiceIndex = null;

    for (const hit of intersections) {
      if (meshToService.has(hit.object.uuid)) {
        clickedServiceIndex = meshToService.get(hit.object.uuid);

        break;
      }
    }

    if (clickedServiceIndex !== null) {
      focusBoard(clickedServiceIndex);
      return;
    }

    /*
      Clicking an empty area exits focus.
    */
    if (isFocused) {
      exitFocus();
    }
  });

  // =========================================================
  // HOVER POINTER
  // =========================================================
  canvas.addEventListener("pointermove", (event) => {
    if (!model || isAnimating) {
      canvas.style.cursor = "default";
      return;
    }

    const rect = canvas.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;

    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersections = raycaster.intersectObject(model, true);

    const hoveringClickable = intersections.some((hit) =>
      meshToService.has(hit.object.uuid),
    );

    canvas.style.cursor = hoveringClickable
      ? "pointer"
      : isFocused
        ? "zoom-out"
        : "grab";
  });

  // =========================================================
  // SERVICE INFO PANEL SCROLL HELPERS
  // =========================================================

  function servicePanelCanScrollDown() {
    const maxScroll = infoPanel.scrollHeight - infoPanel.clientHeight;

    return infoPanel.scrollTop < maxScroll - 2;
  }

  function servicePanelCanScrollUp() {
    return infoPanel.scrollTop > 2;
  }

  function scrollServicePanel(deltaY) {
    infoPanel.scrollTop += deltaY;
  }

  // =========================================================
  // SERVICE SECTION WHEEL CONTROL
  // =========================================================

  let lastServiceWheelTime = 0;

  const serviceWheelCooldown = 850;

  let serviceSequenceCompleted = false;

  /*
  ---------------------------------------------------------
  NATURAL SCROLL → FOCUS MODE TRIGGER
  ---------------------------------------------------------

  The user can freely scroll through the beginning of
  the Services section.

  Once this much of the Services section is visible,
  the next downward scroll will start the focused
  service sequence.
*/
  // heroScene owns the real trigger: it snaps the section to 100% once it
  // covers 60% of the screen and calls window.maliensFocusFirstService(). This
  // in-section wheel check is only a fallback for when the section is already
  // essentially full and nothing has engaged it yet.
  const SERVICE_FOCUS_TRIGGER = 0.95;

  /*
  Check how far the Services section has entered
  the viewport.

  Returns a value between 0 and 1.

  Example:

  0.00 = Services barely entering
  0.50 = roughly half visible
  0.72 = focus trigger
  1.00 = entire section visible
*/
  function getServicesVisibilityProgress() {
    const rect = section.getBoundingClientRect();

    const viewportHeight = window.innerHeight;

    /*
    Services section is completely below viewport.
  */
    if (rect.top >= viewportHeight) {
      return 0;
    }

    /*
    Services section has completely passed above viewport.
  */
    if (rect.bottom <= 0) {
      return 1;
    }

    /*
    Fraction of the SCREEN that the Services section currently covers
    (0 = just entering, 1 = fills the viewport). The section is taller than
    the viewport, so 1.0 is reachable — and "0.6" means it fills 60% of the
    screen, matching the heroScene snap-to-100% trigger.
  */
    const visible =
      Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
    return THREE.MathUtils.clamp(visible / viewportHeight, 0, 1);
  }

  window.addEventListener(
    "wheel",
    (event) => {
      if (!isServicesVisible()) return;

      if (!model) return;

      // =====================================================
      // WAIT FOR CAMERA ANIMATION
      // =====================================================

      if (isAnimating) {
        event.preventDefault();
        event.stopImmediatePropagation();

        return;
      }

      // =====================================================
      // MAKE SURE ALL BOARDS ARE READY
      // =====================================================

      const allBoardsReady =
        clickableBoards.filter(Boolean).length === services.length;

      if (!allBoardsReady) return;

      // =====================================================
      // SCROLL DOWN
      // =====================================================

      if (event.deltaY > 0) {
        /*
        ---------------------------------------------------
        PHASE 1
        NATURAL PAGE SCROLL
        ---------------------------------------------------
      */
        if (!isFocused) {
          const visibilityProgress = getServicesVisibilityProgress();

          if (visibilityProgress < SERVICE_FOCUS_TRIGGER) {
            return;
          }

          /*
          ------------------------------------------------
          FOCUS TRIGGER REACHED
          ------------------------------------------------

        */

          event.preventDefault();
          event.stopImmediatePropagation();

          const now = performance.now();

          if (now - lastServiceWheelTime < serviceWheelCooldown) {
            return;
          }

          lastServiceWheelTime = now;

          serviceSequenceCompleted = false;

          /*
          Enter first service.
        */
          focusBoard(0);

          return;
        }

        // ===================================================
        // ALL SERVICES FINISHED
        // ===================================================

        // Checked before the panel-scroll/cooldown gates below: once
        // finished, this wheel event (and every one after it) should flow
        // straight through to heroScene's normal page scroll toward the
        // next section in one continuous motion — not get consumed first by
        // "scroll the (now-hidden) text panel" or a cooldown wait, which
        // made the section only start scrolling on a following gesture.
        if (focusedIndex === services.length - 1 && serviceSequenceCompleted) {
          if (window.maliensServiceFocused) {
            window.maliensServiceFocused = false;

            // Fade out just the text — the panel's dark scrim keeps
            // showing, still masking the model's edge, until you actually
            // scroll away from the section (see checkStaleFocusState / the
            // IntersectionObserver below, both of which call
            // hideServiceContent() to clear the scrim too at that point).
            // Grow the scrim to cover the full model rather than just its
            // usual 55-85vh band, so nothing (including the bare pole) is
            // left peeking out while the page scrolls on from here.
            hideServiceText();
            infoPanel.classList.add("covers-model");
          }

          return;
        }

        // ===================================================
        // FOCUS MODE — SCROLL INFORMATION FIRST
        // ===================================================

        if (servicePanelCanScrollDown()) {
          event.preventDefault();
          event.stopImmediatePropagation();

          scrollServicePanel(event.deltaY);

          return;
        }

        // ===================================================
        // FOCUS MODE — CHANGE SERVICE
        // ===================================================

        const now = performance.now();

        if (now - lastServiceWheelTime < serviceWheelCooldown) {
          event.preventDefault();
          event.stopImmediatePropagation();

          return;
        }

        // ===================================================
        // NEXT SERVICE
        // ===================================================

        if (focusedIndex < services.length - 1) {
          event.preventDefault();
          event.stopImmediatePropagation();

          lastServiceWheelTime = now;

          const nextIndex = focusedIndex + 1;

          focusBoard(nextIndex);

          if (nextIndex === services.length - 1) {
            serviceSequenceCompleted = true;
          }

          return;
        }

        return;
      }

      // =====================================================
      // SCROLL UP
      // =====================================================

      if (event.deltaY < 0) {
        /*
        ---------------------------------------------------
        NOT FOCUSED
        ---------------------------------------------------

      */
        if (!isFocused) {
          return;
        }

        // ===================================================
        // SCROLL SERVICE TEXT UP FIRST
        // ===================================================

        if (servicePanelCanScrollUp()) {
          event.preventDefault();
          event.stopImmediatePropagation();

          scrollServicePanel(event.deltaY);

          return;
        }

        // ===================================================
        // PREVIOUS SERVICE
        // ===================================================

        const now = performance.now();

        if (now - lastServiceWheelTime < serviceWheelCooldown) {
          event.preventDefault();
          event.stopImmediatePropagation();

          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        lastServiceWheelTime = now;

        serviceSequenceCompleted = false;

        // ===================================================
        // FIRST SERVICE → EXIT FOCUS
        // ===================================================

        if (focusedIndex === 0) {
          exitFocus();

          return;
        }

        // ===================================================
        // PREVIOUS SERVICE
        // =====================================================

        focusBoard(focusedIndex - 1);
      }
    },
    {
      passive: false,
      capture: true,
    },
  );

  // =========================================================
  // RESIZE
  // =========================================================
  window.addEventListener("resize", () => {
    const width = section.clientWidth;
    const height = section.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);

    /*
    Recalculate the full-model camera position
    after the browser size changes.
  */
    fitDefaultModelView();
  });

  // =========================================================
  // ANIMATION
  // =========================================================
  function updateFocusAnimation() {
    if (!isAnimating || !model) return;

    const elapsed = (performance.now() - animationStartTime) / 1000;

    const rawT = Math.min(elapsed / animationDuration, 1);

    const easedT = easeInOutCubic(rawT);

    camera.position.lerpVectors(startCameraPosition, endCameraPosition, easedT);

    controls.target.lerpVectors(startTargetPosition, endTargetPosition, easedT);

    model.position.lerpVectors(startModelPosition, endModelPosition, easedT);

    model.quaternion.slerpQuaternions(
      startModelQuaternion,
      endModelQuaternion,
      easedT,
    );

    if (rawT >= 1) {
      isAnimating = false;
      controls.enabled = true;

      /*
        Do not allow orbit rotation while focused,
        because the selected board must remain front-facing.
      */
      controls.enableRotate = !isFocused;
    }
  }

  /*
    Once the Services section covers SERVICE_FOCUS_TRIGGER (60%) of the screen,
    kick off the first service's tiang rotate + zoom. heroScene snaps the
    section to 100% on that same scroll. Fires once per section entry (re-armed
    by the IntersectionObserver when the section fully leaves the viewport).
  */
  function focusFirstService() {
    if (!model || isFocused || isAnimating || servicesHasAutoEntered) return;
    const ready =
      clickableBoards.filter(Boolean).length === services.length;
    if (!ready) return;

    // Lock the section flush to the top of the viewport before the sequence
    // takes over the wheel — the safety-net path (checkAutoFocus) can reach
    // here mid-scroll at ~90% coverage, which would otherwise freeze the
    // section with the top cut off and the marquee showing above it.
    if (window.maliensSnapServicesToTop) window.maliensSnapServicesToTop();

    servicesHasAutoEntered = true;
    serviceSequenceCompleted = false;
    focusBoard(0);
  }

  // heroScene calls this on the scroll that snaps the Services section to 100%
  // (fired once it covers >= 60% of the screen) so the tiang starts spinning on
  // that same gesture.
  window.maliensFocusFirstService = focusFirstService;

  // Safety net: if the section ends up almost fully on screen without going
  // through heroScene's snap (e.g. a nav jump or resize), engage it anyway.
  function checkAutoFocus() {
    if (window.maliensSuppressServiceFocus) return;
    if (!model || isFocused || isAnimating || servicesHasAutoEntered) return;
    if (!isServicesVisible()) return;
    if (getServicesVisibilityProgress() >= 0.9) focusFirstService();
  }

  // Backstop for stale focus state: "ALL SERVICES FINISHED" deliberately
  // leaves isFocused true (so scrolling back up immediately still walks
  // backward through the boards), and the IntersectionObserver below is
  // meant to clear it once the section is actually out of view — but that
  // callback is async and isn't reliable with this site's GSAP-driven snap
  // scrolling. Checking isServicesVisible() every frame (the same check the
  // wheel handler itself trusts) means a stale isFocused/focusedIndex can
  // never survive long enough to make scrolling back up land mid-sequence
  // (e.g. "Website Creation") instead of resetting to the default view.
  function checkStaleFocusState() {
    if (!isFocused || isAnimating) return;

    // Desktop keeps stale focus state on purpose (scrolling back up should
    // resume mid-sequence, not snap to the default view) — the full reset
    // below only applies at the mobile breakpoint.
    if (!isMobileServicesView()) {
      if (!isServicesVisible()) {
        // The panel is position:fixed, so leaving camera/model/focusedIndex
        // untouched isn't enough on its own — the panel would keep
        // rendering on top of whatever section scrolled into view next
        // (e.g. Contact) unless it's explicitly hidden here too.
        if (!desktopPanelHiddenForExit) {
          desktopPanelHiddenForExit = true;
          serviceSequenceCompleted = false;
          infoPanel.classList.remove("covers-model");
          hideServiceContent();
        }
        return;
      }

      // Back in view: restore the same board's panel now that camera/model
      // never moved from it.
      if (desktopPanelHiddenForExit) {
        desktopPanelHiddenForExit = false;
        showServiceContent(focusedIndex);
      }

      return;
    }

    if (isServicesVisible()) return;

    resetToDefaultView();
  }

  function animate() {
    requestAnimationFrame(animate);

    checkAutoFocus();
    checkStaleFocusState();

    updateFocusAnimation();

    controls.update();

    if (isServicesOnScreen()) {
      renderer.render(scene, camera);
    }
  }

  animate();
}
