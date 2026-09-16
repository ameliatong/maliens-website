import { sharedLoadingManager } from "./loadingManager.js";

// Gate: the overlay only slides away once BOTH are true —
//   1) every asset routed through sharedLoadingManager (the GLTF models +
//      textures loaded by heroScene.js / nextsectionLogo.js /
//      servicesScene.js) has finished, and
//   2) the native window "load" event has fired, which covers everything
//      NOT routed through that manager (plain <img> tags, the JS-created
//      Image() objects used for the CRT/mini-screen canvases, the galaxy
//      video's initial data, fonts referenced via CSS, etc).
// The displayed percentage eases toward the manager's real progress instead
// of snapping between its handful of discrete steps, so it reads as a
// smooth count rather than a jumpy one.
export function initLoadingScreen() {
  const screen = document.getElementById("loadingScreen");
  const percentEl = document.getElementById("loadingPercentNumber");
  if (!screen || !percentEl) return;

  let targetPercent = 0;
  let displayedPercent = 0;
  let managerDone = false;
  let managerSeenAnyItem = false;
  let windowLoaded = document.readyState === "complete";
  let hidden = false;

  // THREE.LoadingManager reports progress via the onProgress callback's own
  // arguments (url, itemsLoaded, itemsTotal) — it does not expose those as
  // readable properties on the manager instance itself.
  sharedLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    managerSeenAnyItem = true;
    const pct = itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 0;
    targetPercent = Math.max(targetPercent, pct);
  };

  sharedLoadingManager.onLoad = () => {
    managerDone = true;
    targetPercent = 100;
  };

  sharedLoadingManager.onError = (url) => {
    console.error("Loading screen: failed to load", url);
  };

  window.addEventListener("load", () => {
    windowLoaded = true;
  });

  // Safety net — if something never resolves (a stalled request, a loader
  // that silently never fires), don't trap visitors behind the overlay
  // forever.
  const FALLBACK_TIMEOUT = 20000;
  const fallbackTimer = setTimeout(() => {
    managerDone = true;
    windowLoaded = true;
    targetPercent = 100;
  }, FALLBACK_TIMEOUT);

  function isManagerSatisfied() {
    // Nothing was ever routed through the manager — treat that as "nothing
    // to wait for" rather than hanging forever.
    return managerDone || (windowLoaded && !managerSeenAnyItem);
  }

  function finish() {
    if (hidden) return;
    hidden = true;
    clearTimeout(fallbackTimer);

    percentEl.textContent = "100";
    screen.classList.add("is-hidden");
    screen.addEventListener(
      "transitionend",
      () => screen.remove(),
      { once: true },
    );
  }

  // The final approach to 100% is a fixed-duration tween keyed to real
  // elapsed time (not a per-frame decay) so it can't stall out if frames
  // happen to come in slowly or sparsely (e.g. a backgrounded tab) right
  // at the finish line.
  const FINISH_TWEEN_MS = 500;
  let finishStartedAt = null;
  let finishStartPercent = 0;

  function tick(now) {
    const everythingDone = isManagerSatisfied() && windowLoaded;

    if (everythingDone) {
      if (finishStartedAt === null) {
        finishStartedAt = now;
        finishStartPercent = displayedPercent;
      }

      const t = Math.min(1, (now - finishStartedAt) / FINISH_TWEEN_MS);
      displayedPercent = finishStartPercent + (100 - finishStartPercent) * t;
      percentEl.textContent = `${Math.round(displayedPercent)}`;

      if (t >= 1) {
        // A brief pause at a settled 100% before the slide-up starts, so
        // it doesn't feel like it's cutting away the instant the count
        // finishes.
        setTimeout(finish, 500);
        return;
      }
    } else {
      displayedPercent += (targetPercent - displayedPercent) * 0.08;
      percentEl.textContent = `${Math.round(displayedPercent)}`;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
