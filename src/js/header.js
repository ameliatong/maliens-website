export function initHeader() {
  const header = document.getElementById("siteHeader");
  const ufo = document.getElementById("ufoIcon");

  // Include header, mobile and footer navigation
  const navLinks = document.querySelectorAll(
    ".header-bar a, .mobile-links a, .footer-nav a, .footer-cta-btn",
  );

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

  window.addEventListener(
    "wheel",
    (event) => {
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

// ==================================================
// TABLET + MOBILE UFO MENU
// ==================================================

const mobileHeader = document.getElementById("mobileHeader");
const mobileUfoButton = document.getElementById("mobileUfoButton");
const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");
const mobileMenuLinks = document.querySelectorAll(".mobile-menu-nav a");

function openMobileMenu() {
  if (!mobileHeader || !mobileUfoButton || !mobileMenuOverlay) return;

  mobileHeader.classList.add("menu-open");

  mobileUfoButton.setAttribute("aria-expanded", "true");
  mobileUfoButton.setAttribute("aria-label", "Close navigation menu");

  mobileMenuOverlay.setAttribute("aria-hidden", "false");

  // Prevent the website behind the menu from scrolling
  document.body.classList.add("mobile-menu-active");
}

function closeMobileMenu() {
  if (!mobileHeader || !mobileUfoButton || !mobileMenuOverlay) return;

  mobileHeader.classList.remove("menu-open");

  mobileUfoButton.setAttribute("aria-expanded", "false");
  mobileUfoButton.setAttribute("aria-label", "Open navigation menu");

  mobileMenuOverlay.setAttribute("aria-hidden", "true");

  // Allow website scrolling again
  document.body.classList.remove("mobile-menu-active");
}

function toggleMobileMenu() {
  if (!mobileHeader) return;

  const isOpen = mobileHeader.classList.contains("menu-open");

  if (isOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

if (mobileUfoButton) {
  mobileUfoButton.addEventListener("click", toggleMobileMenu);
}

// Close menu after clicking HOME, ABOUT, SERVICES or CONTACT
mobileMenuLinks.forEach((link) => {
  link.addEventListener("click", () => {
    closeMobileMenu();
  });
});

// Close with Escape key
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileMenu();
  }
});

// Reset menu when changing back to desktop width
window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) {
    closeMobileMenu();
  }
});
