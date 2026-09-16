export function initHeader() {
  const header = document.getElementById("siteHeader");
  const ufo = document.getElementById("ufoIcon");

  // Include header, footer and mobile full-screen menu navigation
  const navLinks = document.querySelectorAll(
    ".header-bar a, .footer-nav a, .footer-cta-btn",
  );
  const mobileNavLinks = document.querySelectorAll(".mobile-nav-links a");

  if (!header || !ufo) return;

  let isClosed = header.classList.contains("closed");

  function closeHeader() {
    header.classList.add("closed");
    header.classList.remove("expanded");
    isClosed = true;
  }

  function openHeader() {
    header.classList.remove("closed");
    header.classList.add("expanded");
    isClosed = false;
  }

  ufo.addEventListener("click", () => {
    if (isClosed) {
      openHeader();
    } else {
      closeHeader();
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const href = link.getAttribute("href");

      if (!href || !href.startsWith("#")) return;

      const targetId = href.replace("#", "");

      if (window.maliensGoToSection) {
        window.maliensGoToSection(targetId);
      } else {
        console.warn("maliensGoToSection is not available.");
      }

      closeHeader();
    });
  });

  // Mobile full-screen menu links: navigate, then collapse the overlay back down
  mobileNavLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const href = link.getAttribute("href");

      if (!href || !href.startsWith("#")) return;

      const targetId = href.replace("#", "");

      if (window.maliensGoToSection) {
        window.maliensGoToSection(targetId);
      } else {
        console.warn("maliensGoToSection is not available.");
      }

      openHeader();
    });
  });

  window.addEventListener(
    "wheel",
    (event) => {
      if (window.innerWidth <= 500) return;

      if (event.deltaY > 0 && !isClosed) {
        closeHeader();
      }

      if (event.deltaY < 0 && isClosed) {
        openHeader();
      }
    },
    { passive: true },
  );
}
