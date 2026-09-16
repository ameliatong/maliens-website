let quoteRevealStarted = false;

export function initQuoteReveal() {
  // Guard against a double init (double import / re-call): a second pass would
  // re-wrap the already-wrapped words and nest the transforms, which shows up
  // as overlapping, garbled headings.
  if (quoteRevealStarted) return;
  quoteRevealStarted = true;

  const headingRow = document.querySelector(".quote-heading-row");
  const heading = document.querySelector(".quote-heading-main");
  const ideas = document.querySelector(".quote-heading-ideas");
  const bigText = document.querySelector(".quote-big-text");
  const introCopy = document.querySelector(".quote-intro-copy");
  const cowGroup = document.querySelector(".quote-cow-group");

  if (!headingRow || !heading || !ideas || !bigText || !introCopy || !cowGroup) return;

  // Mobile (<=500px): the whole quote hero uses a "vertical cut reveal" — every
  // word sits in an overflow-clipped box and slides up into place once,
  // staggered, when the section scrolls into view. Desktop keeps the original
  // scroll-scrubbed slide-in below, unchanged.
  if (window.matchMedia("(max-width: 500px)").matches) {
    initMobileCutReveal({ headingRow, heading, ideas, bigText, introCopy, cowGroup });
    return;
  }

  let revealed = false;

  function update() {
    const rect = headingRow.getBoundingClientRect();
    const viewportH = window.innerHeight;

    // 0 = row just entering at the bottom of the screen
    // 1 = row has traveled 55% of the screen height (needs more scroll than before to lock in)
    const t = Math.min(1, Math.max(0, (viewportH - rect.top) / (viewportH * 0.55)));

    heading.style.transform = `translateX(${(1 - t) * -120}px)`;
    heading.style.opacity = t;

    ideas.style.transform = `translateX(${(1 - t) * -120}px)`;
    ideas.style.opacity = t;

    bigText.style.transform = `translateX(${(1 - t) * 120}px)`;
    bigText.style.opacity = t;

    const shouldReveal = t >= 1;
    if (shouldReveal !== revealed) {
      revealed = shouldReveal;
      introCopy.classList.toggle("is-revealed", revealed);
      cowGroup.classList.toggle("is-revealed", revealed);
    }

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/* ---------------------------------------------------------------------------
   MOBILE: vertical cut reveal
   Each word is wrapped as
     <span class="vcr-word"><span class="vcr-inner">word</span></span>
   The wrapper clips (overflow:hidden); the inner starts translated fully down
   (CSS) and is animated up to 0 here with the Web Animations API, per-word
   staggered, when its block scrolls into view. The clip/rest styling lives in
   the mobile @media block of quotesection.css.
--------------------------------------------------------------------------- */
function wrapWords(el) {
  // Already processed (or partly) — never wrap twice.
  if (el.querySelector(".vcr-word")) return;

  Array.from(el.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const tokens = node.textContent.split(/(\s+)/);
      if (!tokens.some((tok) => tok.trim())) return;

      const frag = document.createDocumentFragment();
      tokens.forEach((tok) => {
        if (tok === "") return;
        if (!tok.trim()) {
          frag.appendChild(document.createTextNode(" "));
          return;
        }
        const outer = document.createElement("span");
        outer.className = "vcr-word";
        const inner = document.createElement("span");
        inner.className = "vcr-inner";
        inner.textContent = tok;
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
      el.replaceChild(frag, node);
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.nodeName !== "BR" &&
      !node.classList.contains("vcr-word") &&
      !node.classList.contains("vcr-inner")
    ) {
      wrapWords(node);
    }
  });
}

function initMobileCutReveal({ headingRow, heading, ideas, bigText, introCopy, cowGroup }) {
  // Second guard, on the DOM itself: survives a module re-evaluation and makes
  // wrapping strictly one-time.
  if (headingRow.dataset.cutReveal === "on") return;
  headingRow.dataset.cutReveal = "on";

  const STAGGER = 50; // ms between consecutive words
  const SETTLE = 700; // ms for one word to travel up into place

  // Visual top-to-bottom order on mobile: "We Built", "Ideas", then the
  // subheading row where .quote-big-text is visually pulled above the intro
  // copy (order:-1), so big text is listed before the paragraph here.
  const targets = [heading, ideas, bigText, introCopy];

  targets.forEach(wrapWords);

  // The desktop rAF loop (skipped on mobile) is what normally clears these CSS
  // start states. The per-word wrappers own the reveal now, so the containers
  // just stay visible; each word is hidden by its own clip until it animates.
  [heading, ideas, bigText, introCopy].forEach((el) => {
    el.style.opacity = "1";
    el.style.transform = "none";
  });
  introCopy.classList.add("is-revealed");

  const words = [];
  targets.forEach((el) => words.push(...el.querySelectorAll(".vcr-word")));

  const headingWordCount = heading.querySelectorAll(".vcr-word").length;
  const ideasWordCount = ideas.querySelectorAll(".vcr-word").length;

  // The cow gap opens 0.3s after "Ideas" (the last word of the heading + ideas
  // group) has finished its slide.
  const cowDelay =
    (headingWordCount + ideasWordCount - 1) * STAGGER + SETTLE + 300;

  let playing = false;
  let anims = [];
  let cowTimer = null;

  function play() {
    if (playing) return;
    playing = true;

    anims = words.map((word, i) =>
      word.querySelector(".vcr-inner").animate(
        [{ transform: "translateY(110%)" }, { transform: "translateY(0)" }],
        {
          duration: SETTLE,
          delay: i * STAGGER,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        }
      )
    );

    cowTimer = setTimeout(
      () => cowGroup.classList.add("is-revealed"),
      cowDelay
    );
  }

  function reset() {
    if (!playing) return;
    playing = false;

    clearTimeout(cowTimer);
    cowTimer = null;
    anims.forEach((a) => a.cancel()); // back to the CSS translateY(110%) — hidden
    anims = [];
    cowGroup.classList.remove("is-revealed");
  }

  // Play when the heading row enters the viewport. Only RESET when the row has
  // dropped back below the bottom of the screen — i.e. you scrolled back up
  // toward the previous section — so scrolling on past it downward keeps it
  // revealed, but coming back to it re-runs the whole reveal from scratch.
  // rAF-poll pattern (matches the desktop path; IntersectionObserver is
  // unreliable against this page's transformed virtual scroller).
  function watch() {
    const rect = headingRow.getBoundingClientRect();
    const vh = window.innerHeight;

    if (!playing && rect.top < vh * 0.75 && rect.bottom > 0) {
      play();
    } else if (playing && rect.top > vh + 20) {
      reset();
    }

    requestAnimationFrame(watch);
  }

  requestAnimationFrame(watch);

  // The "At Maliens..." block further down the section gets the same reveal,
  // on its own scroll trigger.
  initAboutCutReveal();
}

/* Same word cut-reveal for the "At Maliens..." paragraph + tagline, triggered
   when that block (much lower in the section) scrolls into view. Replays when
   you scroll back up past it, like the hero block. */
function initAboutCutReveal() {
  const aboutText = document.querySelector(".quote-about-text");
  const aboutCopy = document.querySelector(".quote-about-copy");
  const aboutTagline = document.querySelector(".quote-about-tagline");
  if (!aboutText || !aboutCopy || !aboutTagline) return;
  if (aboutText.dataset.cutReveal === "on") return;
  aboutText.dataset.cutReveal = "on";

  const STAGGER = 32; // tighter — this block has many more words
  const SETTLE = 700;

  wrapWords(aboutCopy);
  wrapWords(aboutTagline);

  const words = [
    ...aboutCopy.querySelectorAll(".vcr-word"),
    ...aboutTagline.querySelectorAll(".vcr-word"),
  ];

  let playing = false;
  let anims = [];

  function play() {
    if (playing) return;
    playing = true;
    anims = words.map((word, i) =>
      word.querySelector(".vcr-inner").animate(
        [{ transform: "translateY(110%)" }, { transform: "translateY(0)" }],
        {
          duration: SETTLE,
          delay: i * STAGGER,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        }
      )
    );
  }

  function reset() {
    if (!playing) return;
    playing = false;
    anims.forEach((a) => a.cancel());
    anims = [];
  }

  function watch() {
    const rect = aboutText.getBoundingClientRect();
    const vh = window.innerHeight;

    if (!playing && rect.top < vh * 0.8 && rect.bottom > 0) {
      play();
    } else if (playing && rect.top > vh + 20) {
      reset();
    }

    requestAnimationFrame(watch);
  }

  requestAnimationFrame(watch);
}
