# WEB FORGE AI – Official Jury Scoring Portal

A dependable, minimal, and secure evaluation portal built for **WEB FORGE AI** according to the official architecture action plan and system blueprint.

---

## 🚀 Live Demo & Access

The application runs locally on **`http://127.0.0.1:5000`**.

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
  - **Local Fallback**: Embedded SQLite engine (`database/jury_local.db`) auto-seeded with official competition rounds, 10 official criteria, and participating teams.

### Official Palette
- Ink Black: `#171717`
- Charcoal Grey: `#414141`
- Muted Grey: `#777777`
- Peach: `#F2B99F`
- Pale Peach: `#FBE9E0`
- Pure White: `#FFFFFF`
- Soft Grey: `#F4F3F1`

---

## 📋 Evaluation Structure

### Round A: Machine Learning (ML) Model (100 Max Marks)
1. **Model Accuracy & Performance** (Max: 20 marks)
2. **Data Handling & Preprocessing** (Max: 20 marks)
3. **Model Selection & Implementation** (Max: 20 marks)
4. **Innovation & Problem-Solving** (Max: 20 marks)
5. **Presentation & Explanation** (Max: 20 marks)

### Round B: Web Development (100 Max Marks)
1. **UI/UX Design** (Max: 20 marks)
2. **Functionality** (Max: 20 marks)
3. **Code Quality & Structure** (Max: 20 marks)
4. **Innovation & Creativity** (Max: 20 marks)
5. **Responsiveness & Performance** (Max: 20 marks)

---

## 🏁 How to Run Locally

1. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

2. **Launch the Server**:
   ```powershell
   python run.py
   ```
   Open **http://127.0.0.1:5000** in your browser.

---

## ☁️ Deploying to Vercel

The project is fully configured for Vercel serverless deployment (`vercel.json`, `api/index.py`, `.vercelignore`).

### Option 1: Via Vercel CLI (Fastest)
1. In your terminal, run:
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

## 🛡 Security & Audit Rules
- **Server-Side Authorization**: Roles are enforced on the backend on every protected route.
- **Judge Isolation**: Judges can only view and modify their own scores.
- **Locking & Reopening**: Submitted scores are immediately locked. Only an Administrator can reopen an evaluation, which logs an audit entry.
- **CSV Export**: Real-time aggregated results download with Judge 1 totals, Judge 2 totals, combined averages, and completion status.
