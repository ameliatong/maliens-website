// Frees GPU-side memory (geometry buffers + textures) for everything under
// `root`, without touching the JS-side objects or removing them from the
// scene. three.js re-uploads a disposed geometry/texture automatically the
// next time it's actually rendered, so this is safe to call on content
// that's just scrolled out of view and may come back — no reload needed.
//
// Materials are left alone deliberately: disposing them forces a shader
// recompile on next use, which is a visible stutter, while the geometry
// and textures they reference are what actually account for the memory.
const TEXTURE_SLOTS = [
  "map",
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "emissiveMap",
  "aoMap",
  "alphaMap",
  "bumpMap",
  "displacementMap",
  "clearcoatMap",
  "clearcoatNormalMap",
  "clearcoatRoughnessMap",
  "transmissionMap",
  "thicknessMap",
  "specularIntensityMap",
  "specularColorMap",
  "envMap",
];

export function disposeObject3DGPUResources(root) {
  const seenTextures = new Set();

  root.traverse((child) => {
    if (!child.isMesh) return;

    if (child.geometry) {
      child.geometry.dispose();
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((mat) => {
      if (!mat) return;

      TEXTURE_SLOTS.forEach((slot) => {
        const tex = mat[slot];
        if (tex && tex.isTexture && !seenTextures.has(tex)) {
          seenTextures.add(tex);
          tex.dispose();
        }
      });
    });
  });
}
