import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

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

  // Light
  const ambient = new THREE.AmbientLight(
    0xffffff,
    2
  );

  scene.add(ambient);

  // Model
  let logoModel;

  const loader = new GLTFLoader();

  loader.load(
    "model/logo_nextsection.glb",

    (gltf) => {

      logoModel = gltf.scene;

      scene.add(logoModel);

      logoModel.position.set(
        0,
        0,
        0
      );

      logoModel.scale.set(
        1,
        1,
        1
      );

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
  });

  // Animate
  function animate() {

    requestAnimationFrame(animate);

    // if (logoModel) {
    //   logoModel.rotation.y += 0.003;
    // }

    renderer.render(
      scene,
      camera
    );
  }

  animate();
}