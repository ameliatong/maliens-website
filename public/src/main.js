import { initLoadingScreen } from "./js/loadingScreen.js";
import { initBreakpointReload } from "./js/breakpointReload.js";
import { initCustomCursor } from "./js/customCursor.js";
import { initHeroScene } from "./js/heroScene.js?v=6";
import { initHeader } from "./js/header.js";
import { initNextScene } from "./js/nextsectionLogo.js?v=4";
import { initQuoteReveal } from "./js/quoteReveal.js";
import { initGravitySection } from "./js/gravitySection.js";
import { initContactForm } from "./js/contactForm.js?v=2";
import { initServicesScene } from "./js/servicesScene.js?v=5";

// Attach the loading-screen listeners before any scene starts loading
// assets, so no progress ticks can slip by before it's watching.
initLoadingScreen();
initBreakpointReload();

initCustomCursor();
initHeader();
initHeroScene();
initNextScene();
initQuoteReveal();
initGravitySection();
initContactForm();
initServicesScene();
