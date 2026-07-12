# Git & GitHub Setup Guide

Step-by-step instructions for getting this project onto your machine, making
changes, and pushing them back to GitHub. 

---

## 0. One-time tools you need installed

- **Git** — download from [git-scm.com](https://git-scm.com/downloads),
  install with default options.
- **VS Code** (or any code editor) — download from
  [code.visualstudio.com](https://code.visualstudio.com/).
- A **GitHub account** — sign up at [github.com](https://github.com).

---

## 1. Get the project onto your computer (first time only)

There are 4 ways to do this. **Method A (git clone) is recommended** for
anyone who will be contributing code. Methods B, C, and D are alternatives
depending on your setup.

| Method | Terminal needed | Can push back to GitHub | Best for |
|---|---|---|---|
| A — `git clone` | Yes | ✅ Yes | All contributors — main method |
| B — Download ZIP | No | ⚠️ Extra steps needed | Read-only / reference only |
| C — GitHub Desktop | No | ✅ Yes | Terminal-averse users |
| D — VS Code Clone | No | ✅ Yes | Already using VS Code |

---

### Method A — `git clone` (recommended)

The cleanest method. Creates a fully connected local copy in one command —
no extra setup, push works immediately after.

**Before you start:** Make sure the repo owner has added you as a
collaborator (GitHub → repo → Settings → Collaborators) and you've accepted
the invite from your email or GitHub notifications. Without this, your push
will be rejected even if everything else is correct.

1. Go to the repo page on GitHub:
   `https://github.com/ameliatong/maliens-website`
2. Click the green **Code** button → make sure **HTTPS** is selected →
   copy the URL shown
   (`https://github.com/ameliatong/maliens-website.git`)
3. Open a terminal (Command Prompt, PowerShell, or VS Code's built-in
   terminal via `Ctrl+` ` `)
4. Navigate to where you want the project folder to live:
   ```bash
   cd Documents
   ```
5. Run:
   ```bash
   git clone https://github.com/ameliatong/maliens-website.git
   ```
6. Step into the newly created folder:
   ```bash
   cd maliens-website
   ```

You're done. The folder is fully connected to GitHub — skip to **Section 3**
for the daily editing loop.

---

### Method B — Download ZIP

Use this only if you want to read or reference the code. It has no
connection to GitHub, so pushing requires extra manual steps afterwards.

**Downloading:**

1. Go to the repo page on GitHub
2. Click the green **Code** button → **Download ZIP**
3. Extract the ZIP anywhere on your computer
4. Open and edit files normally

**To connect it to GitHub afterwards (so you can push):**

Open a terminal inside the extracted folder, then run:

```bash
git init
git add .
git commit -m "Initial setup"
git remote add origin https://github.com/ameliatong/maliens-website.git
git branch -M main
git push -u origin main
```

⚠️ If this fails with `Updates were rejected because the remote contains
work that you do not have locally`, it means GitHub already has commits
that your ZIP didn't include. Fix it by pulling first:

```bash
git pull --rebase origin main
git push
```

**Bottom line:** The ZIP route works but creates more friction than cloning.
Only use it for read-only purposes unless you have no other option.

---

### Method C — GitHub Desktop (no terminal)

A standalone visual app for managing Git — no command line needed at all.

1. Download from [desktop.github.com](https://desktop.github.com/) and
   install
2. Open GitHub Desktop → sign in with your GitHub account
3. Click **File → Clone Repository**
4. Select the **URL** tab and paste:
   `https://github.com/ameliatong/maliens-website.git`
5. Choose where to save it locally → click **Clone**

Once cloned, GitHub Desktop handles `add`, `commit`, and `push` entirely
through its interface — no terminal commands needed. See their docs for the
UI walkthrough.

---

### Method D — VS Code Clone (no terminal)
MAKE SURE you Sign into GitHub in VS Code first! how? :

Click the Accounts icon in the bottom-left of VS Code (looks like a person silhouette)
Click Sign in with GitHub

Then: 

1. Open VS Code with no folder open
2. You'll see a **Clone Repository** button in the Explorer panel — click it
   (or open the Command Palette with `Ctrl+Shift+P` and type
   `Git: Clone`)
3. Paste the URL:
   `https://github.com/ameliatong/maliens-website.git`
4. Choose where to save it → click **Select Repository Location**
5. VS Code will ask if you want to open the cloned repo — click **Open**

The folder is now open in VS Code and fully connected to GitHub. The Source
Control panel on the left sidebar is immediately ready to use.

---

## 2. If you're starting the repo from scratch

Only needed once, by whoever creates the project on GitHub for the
first time. If the repo already exists and you're joining it, skip this
entire section and use Method A above.

**On GitHub (in your browser):**

1. Click **+** (top right) → **New repository**
2. Name it, choose Public or Private
3. **Leave "Add README," "Add .gitignore," and "license" unchecked** —
   keep it completely empty
4. Click **Create repository** — keep that page open, you'll need the URL

**On your computer, inside your existing project folder:**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/maliens-website.git
git push -u origin main
```

---

## 3. The daily loop: editing and pushing changes

Every time you make changes and want to save them to GitHub, it's the same
three steps. Pick whichever method you prefer — both do exactly the same
thing.

Always write commit messages in this format:

**`[Your Name] - what you changed`**

### Option A — VS Code Source Control panel USE THISSSSSS METHOD

1. Make sure you have the **folder** open, not just a file
2. Click the Source Control icon in the left sidebar (branching line)
3. You'll see a list of all changed files — review them
4. Type a commit message in the text box at the top
5. Click the checkmark **✓** or press `Ctrl+Enter` to commit
6. Click the **sync/push** icon (circular arrows in the bottom-left status
   bar, next to the branch name) to push to GitHub

### Option B — Terminal

```bash
git add .
git commit -m "Amelia - what you changed"
git push
```

- `git add .` — stages everything you changed (all modified, new, and
  deleted files)
- `git commit -m "..."` — saves a local snapshot with a message. Write
  something specific: "fix hero spacing on mobile" not just "update"
- `git push` — sends that snapshot to GitHub

You only need `-u origin main` the very first time you push a brand new
repo (Section 2). After that, plain `git push` remembers where to send
things.

---


## 4 Pulling latest changes before you start work

Before you begin editing anything, always pull the latest version from
GitHub first — especially if teammates have been working:

```bash
git pull origin main
```

This downloads everyone's latest commits into your local copy. If you skip
this and push without pulling, Git may reject your push because your local
copy is behind. If that happens, run `git pull origin main` then `git push`
again.
