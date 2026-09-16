// Several independent scenes/components (quoteReveal.js, nextsectionLogo.js,
// servicesScene.js) each decide once at load time — via window.innerWidth or
// matchMedia — which of several very different code paths to run for
// phone/tablet/desktop. None of that is designed to be torn down and
// re-initialized on the fly, so live-resizing the browser across one of
// those breakpoints leaves the page in a stale, half-mobile/half-desktop
// state until it's reloaded.
//
// Rather than retrofit resize-reactivity into every one of those (risking
// new bugs in interconnected Three.js scenes for a browser action real
// visitors rarely take — dragging a window across a device-class boundary
// is mostly a dev/QA move, not normal usage), this just reloads the page
// itself when a resize actually crosses one of the site's real breakpoints
// (500px, 768px), so everything re-initializes cleanly from scratch. A
// resize that stays within the same bucket never triggers this.
export function initBreakpointReload() {
  function bucketFor(width) {
    if (width <= 500) return "phone";
    if (width <= 768) return "tablet";
    return "desktop";
  }

  let currentBucket = bucketFor(window.innerWidth);
  let debounceTimer = null;

  window.addEventListener("resize", () => {
    clearTimeout(debounceTimer);

    // Wait for the resize to actually settle (e.g. finish dragging the
    // window edge) rather than reloading mid-drag on every intermediate
    // frame.
    debounceTimer = setTimeout(() => {
      const nextBucket = bucketFor(window.innerWidth);

      if (nextBucket !== currentBucket) {
        window.location.reload();
      }
    }, 400);
  });
}
