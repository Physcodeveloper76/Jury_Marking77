# WEB FORGE AI – Official Jury Scoring Portal

A dependable, minimal, and secure evaluation portal built for **WEB FORGE AI** according to the official architecture action plan and system blueprint.

---

## 🚀 Live Demo & Access

The application runs locally on **`http://127.0.0.1:5000`** or on Vercel (`.vercel.app`).

### Default Credentials

| Role | Username / Identifier | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Judge 1** | `judge1` | `judge1pass` | Evaluate Round A & B, save drafts, lock & submit scores |
| **Judge 2** | `judge2` | `judge2pass` | Independent evaluation of Round A & B |
| **Administrator** | `admin` | `adminpass` | Results matrix, unlock/reopen evaluations, manage teams & criteria, CSV export, audit trail |

---

## 🛠 Tech Stack & Architecture

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Modern Editorial CSS (Strict 0px square corners, 1px dividers, zero glassmorphism).
- **Backend**: Python Flask with modular Blueprints (`/routes`) and service layer (`/services`).
- **Database**: Dual-engine architecture:
  - **Remote**: Dedicated Supabase PostgreSQL project.
  - **Local Fallback**: Embedded SQLite engine auto-seeded with official competition rounds, 10 official criteria, and the 32 participating teams.

---

## ☁️ Deploying to Vercel

The project is fully configured for Vercel serverless deployment (`vercel.json`, `api/index.py`, `.vercelignore`).

### Option 1: Via Vercel CLI (Fastest)
1. Open terminal in this folder and run:
   ```bash
   npx vercel
   ```
2. Follow the interactive prompts (defaults are pre-configured).

### Option 2: Via GitHub Integration
1. Push your code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Ready for Vercel deployment"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Go to **[vercel.com/new](https://vercel.com/new)** and import your repository.
3. If deploying from the repository root, leave **Root Directory** as default (`.`).
4. (Optional) In **Environment Variables**, you can add:
   - `FLASK_SECRET_KEY`: Any secure random string
   - `SUPABASE_URL`: Your Supabase API URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
5. Click **Deploy**. Your jury scoring portal will be live on your `.vercel.app` domain!

---

## 🏁 How to Run Locally

1. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

2. **Launch the Server**:
   ```powershell
   python web_forge_jury/run.py
   ```
   Open **http://127.0.0.1:5000** in your browser.
