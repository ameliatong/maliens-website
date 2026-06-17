# Maliens Website

Digital creative agency landing page. Plain HTML/CSS/JS — no build step, no
framework required. Clone it, open `index.html`, edit, done.

## Running locally

No install step required. Either:

- Open `index.html` directly in a browser, or
- Use a local dev server (recommended — avoids occasional browser CORS
  quirks with ES modules): in VS Code, install the **Live Server**
  extension, right-click `index.html`, choose "Open with Live Server."

## File structure

```
MALIENS_WEBSITE/
├── index.html              Single entry point — all page sections live here
├── font/                    Local font files (if any are self-hosted)
├── image/                    All image assets (flat folder)
├── model/                     Design source files (PSD/XD) — NOT committed
│                                to git, see .gitignore. Store separately.
└── src/
    ├── style.css              Import manifest — entry stylesheet, pulls in
    │                            everything in styles/. Add new sections here.
    ├── main.js                 Entry script — imports + runs every
    │                            section's init() function
    ├── styles/
    │   ├── base.css             Resets, shared variables, typography
    │   ├── header.css            Header / nav section
    │   ├── hero.css               Hero section
    │   ├── sections.css            "MALIENS" mid-page section
    │   ├── quotesection.css         Quote / about section
    │   ├── cross-tape.css            Marquee section
    │   ├── responsive.css             Shared breakpoints
    │   └── contact.css                 Contact section (add when built)
    └── js/
        ├── header.js              Header behavior
        ├── heroScene.js            Hero 3D/canvas scene
        ├── nextsectionLogo.js       Mid-page logo scene
        └── contact.js                Contact form logic (add when built)
```

Note: `src/style.css` (singular, the manifest) and `src/styles/` (plural,
the folder of partials) are two different things sitting next to each other.
Double-check which one you're opening before editing.

## Team split

- **Alicia** — header + hero section (`header.css`/`js`, `hero.css`/`js`)
- **[Teammate]** — footer / contact section (`contact.css`/`js`, new files)

Shared files — touch carefully, small additions only, to avoid merge
conflicts:
- `index.html` — add your section's markup block, don't restructure others'
- `src/style.css` — add one `@import` line for any new stylesheet you create
- `src/main.js` — add one `import` + one `init...()` call for any new script

## Adding a new section

1. Create `src/styles/yoursection.css` and `src/js/yoursection.js`
2. Add `@import url("./yoursection.css");` to `src/style.css`
3. Add `import { initYourSection } from "./yoursection.js";` and call it in
   `src/main.js`
4. Add your HTML block inside `index.html`

## Branching

Don't commit directly to `main`. Create a branch per feature or section:

```bash
git checkout -b yourname/contact-form
```

Push it, open a Pull Request on GitHub, and merge once it's been reviewed.

## Design source files

`model/` contains Adobe PSD/XD source files and is excluded from git via
`.gitignore`. These live on your machine only — back them up separately
(Drive/Dropbox), since they won't be in version control.
