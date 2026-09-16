import Matter from "https://esm.sh/matter-js@0.19.0";

export async function initGravitySection() {
  const container = document.getElementById("gravitySection");
  if (!container) return;

  // Parallax background — shifts vertically as the section scrolls through
  // the viewport, independent of the physics scroll-gate below. The layer
  // is oversized (see CSS) so the shift never reveals its edges.
  //
  // Tied directly to the container's own on-screen position (rect.top) so
  // the motion is visible over the actual scroll distance the section
  // passes through — an earlier version normalized progress across the
  // section's full enter-to-exit journey (way more scroll than what's ever
  // on screen at once), which shrank the visible shift to a few px.
  const bgLayer = document.getElementById("gravityBgLayer");
  if (bgLayer) {
    const parallaxRange = 800; // px, matches the oversize built into the CSS layer — big enough that it never visibly caps out while the section is anywhere near the viewport
    const parallaxSpeed = 0.8; // px of shift per px scrolled
    (function updateParallax() {
      const rect = container.getBoundingClientRect();
      const shift = Math.max(-parallaxRange, Math.min(parallaxRange, -rect.top * parallaxSpeed));
      bgLayer.style.transform = `translateY(${shift}px)`;
      requestAnimationFrame(updateParallax);
    })();
  }

  // Old-TV power-on reveal — the section sits clipped to a thin horizontal
  // line (see the CSS clip-path default) and expands open vertically from
  // its center once it's scrolled 30% into the viewport. Resets if the user
  // scrolls back up past the section, matching the reset behavior used for
  // the other scroll-triggered reveals on this page.
  let sectionRevealed = false;
  (function updateSectionReveal() {
    const rect = container.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / window.innerHeight));

    if (!sectionRevealed && progress >= 0.3) {
      sectionRevealed = true;
      container.classList.add("is-revealed");
    } else if (sectionRevealed && progress < 0.1) {
      sectionRevealed = false;
      container.classList.remove("is-revealed");
    }

    requestAnimationFrame(updateSectionReveal);
  })();

  const pillElements = Array.from(container.querySelectorAll(".gravity-pill"));
  const imgElements = Array.from(container.querySelectorAll(".gravity-img"));
  const allElements = [...pillElements, ...imgElements];
  if (!allElements.length) return;

  // Wait for images to finish loading so their rendered (auto) height is
  // known before we size physics bodies off getBoundingClientRect().
  await Promise.all(
    imgElements.map(
      (img) =>
        img.complete && img.naturalWidth
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            })
    )
  );

  const { Engine, Runner, World, Bodies, Body, Mouse, MouseConstraint, Events } = Matter;

  const engine = Engine.create();
  engine.gravity.y = 0.9; // slightly softer than the default 1
  // Extra solver iterations — bigger/heavier pills collide harder, and the
  // defaults aren't accurate enough to stop fast bodies tunneling through walls.
  engine.positionIterations = 10;
  engine.velocityIterations = 8;

  const runner = Runner.create();

  let width = container.clientWidth;
  let height = container.clientHeight;

  // Invisible static walls (floor + sides) so pills fall in from above and
  // stay contained inside the section instead of falling off forever.
  // Thick on purpose: thin walls let fast-moving bodies tunnel straight
  // through in a single physics step (the floor surface itself stays at
  // `height` regardless of thickness, since these are centered on it).
  const wallOptions = { isStatic: true, restitution: 0.22, friction: 0.12 };
  let walls = [];

  function createWalls() {
    if (walls.length) World.remove(engine.world, walls);

    const thickness = 200;
    walls = [
      Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, wallOptions),
      Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 3, wallOptions),
      Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 3, wallOptions),
    ];
    World.add(engine.world, walls);
  }

  createWalls();

  // One physics body per pill/image, sized to match its real rendered DOM
  // size, spawned above the container so it visibly drops in. Pills get a
  // capsule shape (chamfer = half height); images get a lightly rounded box.
  // Spawn slots are shuffled + jittered (rather than either fully random or
  // a perfectly even grid): fully random placement put several bodies right
  // on top of each other and the solver's deep-overlap separation could
  // launch one hard enough to skip clean through a wall (see the speed cap
  // and safety net below), but a strict grid looked too mechanical. The
  // shuffle randomizes which slot each element lands in, the jitter nudges
  // it off-center, and the vertical gap is randomized within a floor that
  // keeps arrivals spaced out enough to stay safe.
  const slotWidth = width / (allElements.length + 1);
  const slotOrder = allElements.map((_, i) => i + 1);
  for (let i = slotOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slotOrder[i], slotOrder[j]] = [slotOrder[j], slotOrder[i]];
  }

  let nextStartY = -180;

  const bodies = allElements.map((el, i) => {
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const isPill = el.classList.contains("gravity-pill");

    const startX = slotWidth * slotOrder[i] + (Math.random() - 0.5) * slotWidth * 0.95;
    const startY = nextStartY;
    // Vary the vertical spacing so pills arrive in clusters rather than a
    // steady one-by-one drip: mostly tight gaps (a few land together), with an
    // occasional wide gap (a lone pill). Min gap stays above a pill's height so
    // bodies never spawn overlapping.
    nextStartY -=
      Math.random() < 0.4
        ? 260 + Math.random() * 180 // isolated drop
        : 75 + Math.random() * 55; // part of a cluster

    const body = Bodies.rectangle(startX, startY, w, h, {
      chamfer: { radius: isPill ? h / 2 : Math.min(10, h / 4) },
      restitution: 0.2, // softer bounce than before (was 0.35)
      friction: 0.18,
      frictionAir: 0.022, // more air resistance — slows the fall and settle for a gentler feel
      density: 0.002,
      angle: (Math.random() - 0.5) * 0.9,
    });

    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.12);

    return { el, body, w, h, stuckFrames: 0 };
  });

  World.add(engine.world, bodies.map((b) => b.body));

  // Cap top speed — on top of the thicker walls and extra solver iterations
  // above, this is the last line of defense against tunneling: a body that
  // gets slammed by a bigger/heavier neighbor mid-fall never moves fast
  // enough in one step to skip clean through a wall.
  const maxSpeed = 16; // lower cap than before (was 25) — keeps collisions gentler overall
  Events.on(engine, "beforeUpdate", () => {
    bodies.forEach(({ body }) => {
      const { x: vx, y: vy } = body.velocity;
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        Body.setVelocity(body, { x: vx * scale, y: vy * scale });
      }
    });
  });

  // Dragging — visitors can pick up and toss pills around
  const mouse = Mouse.create(container);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } },
  });
  World.add(engine.world, mouseConstraint);

  // Sync each pill's DOM element to its physics body every frame
  function syncPositions() {
    bodies.forEach((entry) => {
      const { el, body, w, h } = entry;

      // Safety net — if a body ever escapes the container despite the
      // measures above (thick walls, extra solver iterations, speed cap),
      // drop it back in from above instead of leaving it lost off-screen
      // forever. Two failure shapes are covered: (1) tunneled way past the
      // floor/ceiling, and (2) wedged into a stable rest above the visible
      // container — invisible behind overflow:hidden — which can happen
      // when a body settles into an equilibrium against a wall or another
      // body before ever falling in; caught by tracking how long it's sat
      // still up there rather than a one-off position check.
      const speed = Math.abs(body.velocity.x) + Math.abs(body.velocity.y);
      const stuckAboveView = body.position.y < -20 && speed < 0.05;
      entry.stuckFrames = stuckAboveView ? entry.stuckFrames + 1 : 0;

      if (body.position.y > height + 400 || body.position.y < -3000 || entry.stuckFrames > 40) {
        Body.setPosition(body, { x: width / 2, y: -200 });
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
        entry.stuckFrames = 0;
      }
      el.style.transform = `translate(${body.position.x - w / 2}px, ${body.position.y - h / 2}px) rotate(${body.angle}rad)`;
    });
    requestAnimationFrame(syncPositions);
  }

  // Only start the simulation once the section has opened (same 30%
  // threshold as the reveal above) — otherwise the pills would be visibly
  // falling behind a still-closed clip-path. Checked every frame rather
  // than via a scroll event, since this site's custom scroll setup doesn't
  // reliably fire scroll events everywhere.
  let started = false;

  function checkAndStart() {
    if (started) return;

    const rect = container.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / window.innerHeight));
    if (progress >= 0.3) {
      started = true;
      Runner.run(runner, engine);
      syncPositions();
    } else {
      requestAnimationFrame(checkAndStart);
    }
  }

  checkAndStart();

  // Resize — rebuild the walls to match the new container size; the pills
  // keep their current positions/velocities, only the boundaries move.
  window.addEventListener("resize", () => {
    width = container.clientWidth;
    height = container.clientHeight;
    createWalls();
  });
}
