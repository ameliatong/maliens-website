# Git & GitHub Setup Guide


## 0. One-time tools you need installed

- **Git** — download from [git-scm.com](https://git-scm.com/downloads),
  install with default options.
- **VS Code** (or any code editor) — download from
  [code.visualstudio.com](https://code.visualstudio.com/).
- A **GitHub account** — sign up at [github.com](https://github.com).

---

## 1. Get the project onto your computer (first time only)

If the repo already exists on GitHub and you're joining the project:

1. Go to the repo page on GitHub.
2. Click the green **Code** button → copy the HTTPS URL
   (looks like `https://github.com/ameliatong/maliens-website.git`).
3. Open a terminal (Command Prompt, PowerShell, or VS Code's built-in
   terminal) and run:

   ```bash
   git clone https://github.com/ameliatong/maliens-website.git
   ```

4. This creates a `maliens-website` folder with everything inside it.
   You're done — skip to **Section 3**.

---

## 2. If you're starting the repo from scratch

Only needed once, by whoever creates the project on GitHub for the first
time.

**On GitHub (in your browser):**

1. Click **+** (top right) → **New repository**.
2. Name it, choose Public or Private.
3. **Leave "Add README," "Add .gitignore," and "license" unchecked** —
   keep it empty.
4. Click **Create repository**. Keep that page open — you'll need the URL.

**On your computer, inside your project folder:**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/maliens-website.git
git push -u origin main
```


If `git push` fails with `Repository not found`, this is almost always a
**login mismatch**, not a missing repo. Run `git remote -v` to check the
exact URL Git is using, and make sure you're logged into the *same* GitHub
account in your browser that owns that repo. 

---

## 3. The daily loop: editing and pushing changes

Every time you make changes and want to save them to GitHub, it's the same
three steps. Pick whichever method you're comfortable with.

### Option A — Terminal

```bash
git add .
git commit -m "describe what you changed"
git push
```

You only need `-u origin main` the very first time you push (Section 2).
After that, plain `git push` remembers where to send things.

### Option B — VS Code's Source Control panel

1. Make sure you have the **folder** open.
2. Click the Source Control icon in the left sidebar.
3. Type a commit message in the box at the top.
4. Click the checkmark (✓) or press `Ctrl+Enter` to commit.
5. Click the **sync/push** icon to push to GitHub.


---

## 7. Don't commit directly to `main` for new features

Once more than one person is working in the repo, create a branch before
making changes:

```bash
git checkout -b yourname/feature-name
```

Push it, open a Pull Request on GitHub, and merge once it's reviewed —
rather than pushing straight to `main` every time.
