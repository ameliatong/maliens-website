import * as THREE from "https://esm.sh/three@0.160.0";

// Shared across every scene file (heroScene.js, nextsectionLogo.js,
// servicesScene.js) — pass this into every GLTFLoader/TextureLoader
// constructor instead of leaving them plain, so loadingScreen.js can watch
// combined progress across all of them instead of each loader reporting in
// isolation.
export const sharedLoadingManager = new THREE.LoadingManager();
