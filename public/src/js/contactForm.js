// =====================
// API BASE URL
// =====================
// When running locally (server.js serves both the site and the API on the
// same origin), a relative path works. Once deployed on Hostinger, the
// frontend is a separate static site and the API lives on Render — replace
// the placeholder below with that Render service URL after deploying it.
const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? ""
    : "https://maliens-backend.onrender.com";

export function initContactForm() {
  const form = document.getElementById("contactForm");
  const statusBefore = document.getElementById("contactStatusBefore");
  const statusAfter = document.getElementById("contactStatusAfter");

  if (!form) return;

  initContactReveal(form);

  // =====================
  // STATUS MESSAGE
  // =====================

  function showStatus(message, position = "before") {
    if (statusBefore) {
      statusBefore.textContent = "";
    }

    if (statusAfter) {
      statusAfter.textContent = "";
    }

    if (position === "after") {
      if (statusAfter) {
        statusAfter.textContent = message;
      }
    } else {
      if (statusBefore) {
        statusBefore.textContent = message;
      }
    }
  }

  // =====================
  // FORM SUBMIT
  // =====================

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);

    const token = formData.get("cf-turnstile-response");

    // =====================
    // TURNSTILE CHECK
    // =====================

    if (!token) {
      showStatus("Please verify that you're human.", "before");
      return;
    }

    // =====================
    // FORM DATA
    // =====================

    const payload = {
      name: formData.get("name")?.trim(),
      email: formData.get("email")?.trim(),
      message: formData.get("message")?.trim(),
      turnstileToken: token,
    };

    try {
      // =====================
      // SENDING
      // =====================

      submitButton.disabled = true;

      showStatus("Sending...", "before");

      const response = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Something went wrong.");
      }

      // =====================
      // SUCCESS
      // =====================

      showStatus("Message sent. We’ll get back to you soon.", "after");

      form.reset();

      if (window.turnstile) {
        window.turnstile.reset();
      }
    } catch (error) {
      // =====================
      // ERROR
      // =====================

      showStatus(error.message || "Failed to send message.", "before");
    } finally {
      submitButton.disabled = false;
    }
  });
}

// =====================
// ENTRANCE REVEAL
// =====================
// Kicker types out ("[WE GOT YOUR BACK]", same technique as the hero's
// kicker line), the title slides up word by word (same cut-reveal
// technique as the quote section's paragraphs), and the form fades/slides
// in — all played once, the first time this section scrolls into view.
// Uses the same rAF-poll-against-getBoundingClientRect pattern as
// quoteReveal.js / nextsectionLogo.js rather than IntersectionObserver,
// since that isn't reliable against this page's transformed virtual
// scroller.
function initContactReveal(form) {
  const section = document.querySelector(".contact-section");
  const kicker = document.querySelector(".contact-kicker");
  const title = document.querySelector(".contact-title");
  if (!section) return;

  if (form) {
    Array.from(form.children).forEach((child, i) => {
      child.style.transitionDelay = `${i * 0.12}s`;
    });
  }

  const kickerFullText = kicker ? kicker.textContent : "";
  if (kicker) kicker.textContent = "";

  let typewriterTimeout = null;

  function playKickerTypewriter() {
    if (!kicker) return;

    if (typewriterTimeout) clearTimeout(typewriterTimeout);
    kicker.textContent = "";
    kicker.classList.add("is-typing");

    let charIndex = 0;

    function typeNextChar() {
      charIndex += 1;
      kicker.textContent = kickerFullText.slice(0, charIndex);

      if (charIndex < kickerFullText.length) {
        typewriterTimeout = setTimeout(typeNextChar, 45);
      } else {
        kicker.classList.remove("is-typing");
      }
    }

    typewriterTimeout = setTimeout(typeNextChar, 45);
  }

  function resetKickerTypewriter() {
    if (!kicker) return;

    if (typewriterTimeout) clearTimeout(typewriterTimeout);
    typewriterTimeout = null;
    kicker.textContent = "";
    kicker.classList.remove("is-typing");
  }

  const titleWords = [];

  if (title) {
    const originalChildren = Array.from(title.childNodes);
    title.textContent = "";

    originalChildren.forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) {
        title.appendChild(node);
        return;
      }

      node.textContent.split(/(\s+)/).forEach((token) => {
        if (token === "") return;

        if (/^\s+$/.test(token)) {
          title.appendChild(document.createTextNode(token));
          return;
        }

        const outer = document.createElement("span");
        outer.className = "vcr-word";
        const inner = document.createElement("span");
        inner.className = "vcr-inner";
        inner.textContent = token;
        outer.appendChild(inner);
        title.appendChild(outer);
        titleWords.push(inner);
      });
    });
  }

  const TITLE_STAGGER = 60; // ms between consecutive words
  const TITLE_SETTLE = 800; // ms for one word to slide up into place
  let titleAnims = [];

  function playTitleReveal() {
    titleAnims = titleWords.map((word, i) =>
      word.animate(
        [{ transform: "translateY(110%)" }, { transform: "translateY(0)" }],
        {
          duration: TITLE_SETTLE,
          delay: i * TITLE_STAGGER,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      ),
    );
  }

  function resetTitleReveal() {
    titleAnims.forEach((anim) => anim.cancel());
    titleAnims = [];
  }

  // Replays the whole sequence from scratch every time this section is
  // (re-)entered — reset the instant it's scrolled fully out of view either
  // direction, matching the hero's own re-entry behavior.
  let played = false;

  function watch() {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;

    if (!played && rect.top < vh * 0.75 && rect.bottom > 0) {
      played = true;
      playKickerTypewriter();
      playTitleReveal();
      if (form) form.classList.add("is-revealed");
    } else if (played && (rect.top > vh || rect.bottom < 0)) {
      played = false;
      resetKickerTypewriter();
      resetTitleReveal();
      if (form) form.classList.remove("is-revealed");
    }

    requestAnimationFrame(watch);
  }

  requestAnimationFrame(watch);
}
