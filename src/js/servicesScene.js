import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

export function initServicesScene() {
  // =========================================================
  // DOM
  // =========================================================
  const section = document.getElementById("services");
  const canvas = document.getElementById("servicesCanvas");

  const infoPanel = document.getElementById("serviceInfoPanel");
  const infoTitle = document.getElementById("serviceInfoTitle");
  const infoDescription = document.getElementById("serviceInfoDescription");
  const infoList = document.getElementById("serviceInfoList");

  if (
    !section ||
    !canvas ||
    !infoPanel ||
    !infoTitle ||
    !infoDescription ||
    !infoList
  ) {
    console.error("Services section DOM elements are missing:", {
      section,
      canvas,
      infoPanel,
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
      title: "Creative Branding",
      description:
        "We build distinctive brand identities that help businesses stand out, connect with audiences, and create lasting impressions.",
      items: [
        "Brand strategy & positioning",
        "Logo & visual identity design",
        "Brand guidelines development",
        "Brand messaging & storytelling",
      ],
      objectName: "Cube.025",
    },

    {
      title: "Social Media Management",
      description:
        "We manage your social presence with consistent content, community engagement, and strategic planning to keep your brand active and relevant.",
      items: [
        "Content planning & scheduling",
        "Monthly content calendars",
        "Performance monitoring & reporting",
      ],
      objectName: "Cube.024",
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
      objectName: "Cube.013",
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
      objectName: "Cube.006",
    },

    {
      title: "Website Creation",
      description:
        "We design and build websites that combine seamless user experiences, strong visual storytelling, and business-driven functionality.",
      items: [
        "Website & landing page UI design",
        "User experience strategy",
        "Website development & CMS implementation",
        "Content writing & copywriting",
        "SEO & performance optimization",
      ],
      objectName: "Cube.018",
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

  function showServiceContent(index) {
    const service = services[index];

    if (!service) return;

    infoTitle.textContent = service.title;
    infoDescription.textContent = service.description;

    infoList.innerHTML = "";

    service.items.forEach((item) => {
      const li = document.createElement("li");

      li.textContent = item;
      infoList.appendChild(li);
    });

    infoPanel.classList.add("visible");
  }

  function hideServiceContent() {
    infoPanel.classList.remove("visible");
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

    /*
      Save the current complete view only when entering focus
      from the overall model view.

      This means clicking empty space restores the view from
      before focus, instead of returning to a hard-coded camera.
    */
    if (!isFocused) {
      previousCameraPosition.copy(camera.position);
      previousTargetPosition.copy(controls.target);
      previousModelPosition.copy(model.position);
      previousModelQuaternion.copy(model.quaternion);
    }

    focusedIndex = index;
    isFocused = true;

    showServiceContent(index);

    const boardCenter = getBoardWorldCenter(board);
    const boardSize = getBoardWorldSize(board);
    const boardQuaternion = getBoardWorldQuaternion(board);

    /*
      Local board-facing direction.

      Most exported boards face local positive Z.
      The direction is converted to world space.
    */
    const boardNormal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(boardQuaternion)
      .normalize();

    /*
      Place camera in front of board.

      Because it follows the board normal, clicking the back
      automatically moves the camera around to its front.
    */
    const focusDistance = Math.max(boardSize.x, boardSize.y) * 2.2 + 3.2;

    const desiredCamera = boardCenter
      .clone()
      .add(boardNormal.clone().multiplyScalar(focusDistance));

    /*
      Small right offset creates room for the HTML content panel.

      The complete signpost appears shifted to the left,
      while the selected sign is displayed around the centre-left.
    */
    const cameraRight = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(boardQuaternion)
      .normalize();

    desiredCamera.add(cameraRight.multiplyScalar(-boardSize.x * 0.2));

    /*
      Rotate the entire model so the selected board becomes
      parallel to the screen.

      Inverse board rotation removes its current world rotation.
    */
    const desiredModelQuaternion = model.quaternion
      .clone()
      .multiply(boardQuaternion.clone().invert());

    /*
      Move the full pole group left while focused.
    */
    const desiredModelPosition = model.position
      .clone()
      .add(new THREE.Vector3(-3.5, 0, 0));

    beginAnimation({
      cameraPosition: desiredCamera,
      targetPosition: boardCenter,
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
  const loader = new GLTFLoader();

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
        Centre the model based on its bounds.
      */
      model.scale.setScalar(0.68);
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

      model.rotation.y = Math.PI;

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
  Use whichever distance is larger, then add padding.
*/
      const fitDistance = Math.max(distanceForHeight, distanceForWidth) * 1.32;

      /*
  Lower the composition so the complete model sits
  underneath the Services headings.
*/
      const targetYOffset = -centredSize.y * 0.06;

      /*
  Camera sits slightly below the target, creating
  a subtle upward-looking angle.
*/
      const cameraYOffset = -centredSize.y * 0.1;

      camera.position.set(
        centredCenter.x,
        centredCenter.y + cameraYOffset,
        centredCenter.z + fitDistance,
      );

      controls.target.set(
        centredCenter.x,
        centredCenter.y + targetYOffset,
        centredCenter.z,
      );

      controls.update();

      /*
  Save this corrected whole-model view.
*/
      defaultCameraPosition.copy(camera.position);

      defaultTargetPosition.copy(controls.target);
      function normalizeMeshName(name = "") {
        return name.toLowerCase().replace(/[^a-z0-9]/g, "");
      }

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
  // SERVICE SECTION WHEEL CONTROL
  // =========================================================
  let lastServiceWheelTime = 0;
  const serviceWheelCooldown = 850;

  window.addEventListener(
    "wheel",
    (event) => {
      if (!isServicesVisible()) return;
      if (!model || isAnimating) return;

      const now = performance.now();

      if (now - lastServiceWheelTime < serviceWheelCooldown) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      /*
      First downward scroll:
      enter focus on the first service board.
    */
      if (event.deltaY > 0) {
        /*
    Do not intercept the page wheel until all service
    boards have been successfully registered.
  */
        if (clickableBoards.filter(Boolean).length !== services.length) {
          return;
        }

        if (!isFocused || focusedIndex < services.length - 1) {
          event.preventDefault();
          event.stopImmediatePropagation();

          lastServiceWheelTime = now;
          focusNextBoard(1);
        }

        return;
      }

      /*
      Upward scroll:
      move to previous signboard.

      From the first signboard, return to
      the saved full-model view.
    */
      if (event.deltaY < 0 && isFocused) {
        event.preventDefault();
        event.stopImmediatePropagation();

        lastServiceWheelTime = now;
        focusNextBoard(-1);
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

  function animate() {
    requestAnimationFrame(animate);

    updateFocusAnimation();

    controls.update();

    renderer.render(scene, camera);
  }

  animate();
}
