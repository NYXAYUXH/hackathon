# 🚀 How to Upload NIGHTSTOCK to GitHub

This folder has been cleaned and prepared specifically for uploading to GitHub. All virtual environments (`venv/`), temporary caches (`__pycache__/`), and local database files have been excluded so your repository is lightweight, professional, and fast.

---

## 🌟 Method 1: Upload via GitHub Web Interface (Easiest & No Terminal Needed)

1. Open your browser and go to [https://github.com/new](https://github.com/new).
2. Enter a **Repository name**: e.g., `nightstock` or `nightstock-inventory`.
3. Choose **Public** (recommended for hackathons so judges can view it).
4. **Leave "Add a README file" UNCHECKED** (you already have a full README!).
5. Click **Create repository**.
6. On the next screen, click the link that says:  
   **"uploading an existing file"** (or click `Add file` → `Upload files`).
7. Open Finder on your Mac and navigate to:  
   `/Users/elyxian/.gemini/antigravity/scratch/nightstock-github`
8. **Select all files and folders** inside `nightstock-github` and drag them directly into the GitHub upload box in your browser.
9. Type a commit message: `Initial commit: NIGHTSTOCK Hackathon Project` and click **Commit changes**.
10. 🎉 Done! Your project is live on GitHub!

---

## 💻 Quick Push to Your Repository (`NYXAYUXH/hackathon`)

The Git repository is already initialized and committed! To push it into your repo:

```bash
cd /Users/elyxian/Desktop/nightstock-github
DEVELOPER_DIR=/Library/Developer/CommandLineTools git push -u origin main
```

> **Note on GitHub Password**: When Git prompts for your password in terminal, enter a **GitHub Personal Access Token** (GitHub no longer accepts account passwords for git push). Generate one at [github.com/settings/tokens](https://github.com/settings/tokens) with `repo` permission.

---

## 🖥️ Method 3: Using GitHub Desktop

1. Open the **GitHub Desktop** app.
2. Click **File** → **Add Local Repository...** (or `Cmd + O`).
3. Select the folder: `/Users/elyxian/.gemini/antigravity/scratch/nightstock-github`.
4. If it says "This directory does not appear to be a Git repository", click **create a repository** and click **Create**.
5. Click **Publish repository** to push it to your GitHub account!

---

## 📋 What's Inside This Clean Repository Folder?

```
nightstock-github/
├── .gitignore            # Excludes venv, pycache, local sqlite db, DS_Store
├── LICENSE               # MIT Open Source License
├── README.md             # Polished documentation with architecture & quickstart
├── HACKATHON_PITCH.md    # 3-minute presentation script for the 3 team members
├── GITHUB_SETUP.md       # This upload guide
├── requirements.txt      # Python dependencies
├── main.py               # FastAPI server application
├── run.py                # 1-click Python launcher with browser auto-open
├── run.sh                # Executable shell launcher
├── backend/              # SQLite database, REST API, models, and ML prediction engine
├── data/                 # Real retail benchmark CSV files (no mock data)
└── static/               # HTML5 Single Page App, CSS animations, Chart.js, sound synth
```

---

## 🏆 Checklist for Hackathon Submission
- [ ] Repository is set to **Public** so judges can view code.
- [ ] Add the GitHub URL to your hackathon submission portal (Devpost, Unstop, etc.).
- [ ] Include the 3-minute pitch script from `HACKATHON_PITCH.md` in your presentation slides.
