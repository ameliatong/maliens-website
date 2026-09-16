// Custom cursor (amaterasu.ai-style): a dot glued to the exact pointer
// position plus a ring that eases toward it with a slight trailing lag.
// Color switches between white (over dark backgrounds) and a dark blue
// (over light ones) — see isLightAt() below for how "light" is decided.
export function initCustomCursor() {
  // Touch/coarse-pointer devices have no real cursor to replace.
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const dot = document.createElement("div");
  dot.className = "custom-cursor-dot";

  const ring = document.createElement("div");
  ring.className = "custom-cursor-ring";

  // Curved "SCROLL DOWN" hint that fades in inside the ring after a period
  // of no scroll input — CSS alone can't bend text along an arc, so this
  // is a small SVG overlay (an invisible circular path plus a <textPath>
  // following it) kept positioned exactly on top of the ring.
  const textRingNS = "http://www.w3.org/2000/svg";
  const textRing = document.createElementNS(textRingNS, "svg");
  textRing.setAttribute("class", "custom-cursor-textring");
  textRing.setAttribute("viewBox", "0 0 100 100");
  textRing.innerHTML = `
    <path id="cursorScrollTextPath" d="M 14 46 A 36 36 0 0 0 86 46" fill="none" />
    <text class="custom-cursor-textring-label">
      <textPath href="#cursorScrollTextPath" startOffset="50%" text-anchor="middle">SCROLL DOWN</textPath>
    </text>
  `;

  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.body.appendChild(textRing);
  document.body.classList.add("has-custom-cursor");

  // SVG displacement filter backing the "liquid glass" look — referenced
  // from .custom-cursor-ring.is-glass's backdrop-filter (see cursor.css).
  // Ported from the liquid-glass-css generator: a baked displacement map
  // (a blurred circle over red/green ramps, encoding per-pixel x/y offset
  // in its R/G channels) drives THREE separate feDisplacementMap passes at
  // slightly different scales — one isolated per color channel via
  // feColorMatrix, then screen-blended back together — which reads as a
  // real lens' chromatic aberration (each color channel bending by a
  // marginally different amount) instead of a flat, colorless warp.
  const GLASS_SIZE = 200; // must match .custom-cursor-ring.is-glass's width/height
  const displacementMapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${GLASS_SIZE}" height="${GLASS_SIZE}" viewBox="0 0 ${GLASS_SIZE} ${GLASS_SIZE}"><defs><linearGradient id="Y" x1="0" x2="0" y1="3%" y2="97%"><stop offset="0%" stop-color="#0F0" /><stop offset="100%" stop-color="#000" /></linearGradient><linearGradient id="X" x1="2%" x2="98%" y1="0" y2="0"><stop offset="0%" stop-color="#F00" /><stop offset="100%" stop-color="#000" /></linearGradient></defs><rect width="${GLASS_SIZE}" height="${GLASS_SIZE}" fill="#808080" /><g filter="blur(2px)"><rect width="${GLASS_SIZE}" height="${GLASS_SIZE}" fill="#000080" /><rect width="${GLASS_SIZE}" height="${GLASS_SIZE}" fill="url(#Y)" style="mix-blend-mode:screen" /><rect width="${GLASS_SIZE}" height="${GLASS_SIZE}" fill="url(#X)" style="mix-blend-mode:screen" /><circle cx="${GLASS_SIZE / 2}" cy="${GLASS_SIZE / 2}" r="${GLASS_SIZE / 2 - 10}" fill="#808080" filter="blur(9px)" /></g></svg>`;
  const displacementMapDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(displacementMapSvg)}`;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  // Three displacement passes (chromatic aberration) — each RGB channel
  // isolated via feColorMatrix and displaced at a slightly different
  // scale, then screen-blended back together. Costs ~3x a single pass,
  // but reads as real glass (each color channel bending a marginally
  // different amount) rather than a flat, colorless warp — worth the
  // extra GPU cost for how much nicer it looks.
  svg.innerHTML = `
    <filter id="cursor-glass-distortion" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage x="0" y="0" width="${GLASS_SIZE}" height="${GLASS_SIZE}" href="${displacementMapDataUri}" result="displacementMap" />
      <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="225" xChannelSelector="R" yChannelSelector="G" />
      <feColorMatrix type="matrix" result="displacedR" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
      <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="220" xChannelSelector="R" yChannelSelector="G" />
      <feColorMatrix type="matrix" result="displacedG" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
      <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="215" xChannelSelector="R" yChannelSelector="G" />
      <feColorMatrix type="matrix" result="displacedB" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
      <feBlend in="displacedR" in2="displacedG" mode="screen" result="rg" />
      <feBlend in="rg" in2="displacedB" mode="screen" />
    </filter>
  `;
  document.body.appendChild(svg);

  // The glass-ring look only turns on inside the About section (the one
  // with the 3D glass logo) — cheap getBoundingClientRect check, same
  // pattern nextsectionLogo.js already uses for its own visibility checks.
  const glassSection = document.querySelector(".next-section");

  function isOverGlassSection() {
    if (!glassSection) return false;
    const rect = glassSection.getBoundingClientRect();
    const viewportMiddle = window.innerHeight / 2;
    return rect.top <= viewportMiddle && rect.bottom >= viewportMiddle;
  }

  // "SCROLL DOWN" idle hint — starts the clock at page load (so it can
  // still fire before any scroll happens at all) and resets on every wheel
  // tick. Only makes sense on the plain ring, so it's suppressed whenever
  // the glass look is active.
  const SCROLL_IDLE_MS = 2500;
  let lastWheelTime = performance.now();

  window.addEventListener(
    "wheel",
    () => {
      lastWheelTime = performance.now();
    },
    { passive: true },
  );

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let hasMoved = false;

  const RING_EASE = 0.18;

  // Decides light vs dark at a point. An explicit
  // data-cursor-theme="light"/"dark" on an ancestor always wins (used for
  // elements styled with a background-image/gradient, e.g. the header nav
  // pill, where there's no plain background-color to read). Otherwise walk
  // up looking for the nearest ancestor with an actual opaque
  // background-color and judge its luminance; default to dark (white
  // cursor) since that's this site's base look.
  function isLightAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return false;

    const themed = el.closest("[data-cursor-theme]");
    if (themed) return themed.dataset.cursorTheme === "light";

    let node = el;
    while (node && node !== document.documentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      const match = bg.match(
        /rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)/,
      );

      if (match) {
        const [, r, g, b, a] = match;
        const alpha = a === undefined ? 1 : parseFloat(a);

        if (alpha > 0.5) {
          const luminance =
            (parseFloat(r) * 299 + parseFloat(g) * 587 + parseFloat(b) * 114) /
            1000;
          return luminance > 150;
        }
      }

      node = node.parentElement;
    }

    return false;
  }

  window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;

    if (!hasMoved) {
      // First real position — snap the ring straight there instead of
      // easing in from the initial center-of-viewport guess.
      hasMoved = true;
      ringX = mouseX;
      ringY = mouseY;
    }
  });

  document.addEventListener("mouseleave", () => {
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  });

  document.addEventListener("mouseenter", () => {
    dot.style.opacity = "";
    ring.style.opacity = "";
  });

  window.addEventListener("mousedown", () => ring.classList.add("is-active"));
  window.addEventListener("mouseup", () => ring.classList.remove("is-active"));

  function animate() {
    ringX += (mouseX - ringX) * RING_EASE;
    ringY += (mouseY - ringY) * RING_EASE;

    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    textRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;

    const light = isLightAt(mouseX, mouseY);
    dot.classList.toggle("is-light-bg", light);
    ring.classList.toggle("is-light-bg", light);
    textRing.classList.toggle("is-light-bg", light);

    const glass = isOverGlassSection();
    ring.classList.toggle("is-glass", glass);
    dot.classList.toggle("is-glass", glass);

    const idle = !glass && performance.now() - lastWheelTime > SCROLL_IDLE_MS;
    textRing.classList.toggle("is-visible", idle);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
