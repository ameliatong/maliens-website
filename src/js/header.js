export function initHeader() {
  const header = document.getElementById("siteHeader");
  const ufo = document.getElementById("ufoIcon");
  const navLinks = document.querySelectorAll(".header-bar a");

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

      const targetId = link.getAttribute("href").replace("#", "");

      if (window.maliensGoToSection) {
        window.maliensGoToSection(targetId);
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
