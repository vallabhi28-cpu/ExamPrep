# 📚 ExamPrep — AI-Powered Study App

A full-featured React Native / Expo app for students with:
- 🏠 **Dashboard** — Streaks, stats, quick actions
- 📄 **PDF Storage** — Upload, store, download PDFs via Supabase
- 🧠 **Quiz Generator** — AI-powered quizzes from your PDFs (Google Gemini)
- 🧘 **Zen Mode** — Focus timer with app-blocker reminders
- 🗓️ **Schedule Generator** — AI study plans from exam dates (Google Gemini)

---

## 🚀 Quick Start

### Step 1 — Install dependencies

```bash
cd examprep
npm install
```

### Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project**, give it a name, choose a region
3. Wait for it to provision (~2 min)
4. Go to **SQL Editor → New Query**
5. Paste the entire contents of `supabase_schema.sql` and click **Run**
6. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon / public** key

### Step 3 — Set up Google Gemini API

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key (no credit card required!)

### Step 4 — Add your credentials

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
```

### Step 5 — Run the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `w` to open in the browser.

---

## 🐳 Docker (Web Version)

Build and run the web version in a container:

```bash
# Using docker-compose (reads .env automatically)
docker compose up --build

# OR manually
docker build \
  --build-arg EXPO_PUBLIC_SUPABASE_URL=your-url \
  --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key \
  --build-arg EXPO_PUBLIC_GEMINI_API_KEY=your-key \
  -t examprep .

docker run -p 3000:80 examprep
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
examprep/
├── app/
│   ├── _layout.tsx          # Root layout + auth guard
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx        # Login screen
│   │   └── signup.tsx       # Sign up screen
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar
│       ├── dashboard.tsx    # Home / streaks
│       ├── storage.tsx      # PDF upload & storage
│       ├── quiz.tsx         # AI quiz generator
│       ├── zen.tsx          # Focus / zen mode
│       └── schedule.tsx     # AI schedule generator
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── gemini.ts            # Google Gemini AI helpers
├── context/
│   └── AuthContext.tsx      # Auth state provider
├── constants/
│   └── theme.ts             # Colors, spacing, radius
├── supabase_schema.sql      # DB schema — run once in Supabase
├── Dockerfile               # Multi-stage Docker build (web)
├── docker-compose.yml       # Docker Compose config
├── nginx.conf               # Nginx config for serving web build
├── .env.example             # Template for environment variables
└── package.json
```

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User profile, streak, last login |
| `pdf_files` | PDF metadata (actual files in Supabase Storage) |
| `quiz_results` | Quiz scores per user |
| `exams` | Upcoming exams with dates |
| `schedules` | AI-generated schedule JSON |
| `zen_sessions` | Focus session logs |

---

## ✨ Feature Details

### Dashboard
- Personalized greeting + time-of-day
- 🔥 Login streak tracker (resets if you skip a day)
- Quick stat cards: PDFs, quizzes, exams
- Recent PDFs preview
- Upcoming exams with urgency colours (red < 3 days, yellow < 7 days)
- Quick action grid

### PDF Storage
- Pick any PDF from device
- Upload to Supabase Storage (50 MB limit per file)
- Download & share files
- Delete files
- Storage usage stats

### Quiz Generator
- Pick a PDF from device
- Choose number of questions (3–20)
- AI analyzes document and generates multiple-choice questions (Google Gemini)
- Instant answer feedback with explanations
- Score saved to database

### Zen Mode
- Select social media apps to "block"
- Choose session duration (15 / 25 / 45 / 60 / 90 min)
- Countdown timer
- **AppState listener** — alerts you when you leave the app during a session
- > Note: Full native app blocking requires device-level Screen Time (iOS) or Digital Wellbeing (Android). This app enforces focus through reminders and accountability.
- Sessions logged to DB

### Schedule Generator
- Add multiple exams with names and dates
- Set daily study hours
- AI generates a day-by-day study plan with:
  - Task types: New Content / Revision / Practice / Rest
  - Daily study tips
  - Urgency-aware prioritisation
- Schedule saved to DB and persists

---

## 🔧 Troubleshooting

**"Cannot find module" errors**
```bash
npm install
npx expo start --clear
```

**Supabase auth not working**
- Double-check your URL and anon key in `.env`
- Make sure you ran `supabase_schema.sql` in the SQL editor

**Quiz / Schedule AI not working**
- Check your Gemini API key in `.env`
- Get a FREE key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

**PDF upload failing**
- Make sure the `pdfs` storage bucket was created (check the SQL schema ran fully)
- Check Supabase Storage policies in Dashboard → Storage → Policies

**Expo Go not connecting**
- Ensure phone and computer are on the same WiFi
- Try `npx expo start --tunnel`

---

## 📱 Requirements

- Node.js 18+
- Expo Go app on iOS or Android (for mobile)
- Docker (optional, for web deployment)
- Supabase account (free tier works)
- Google Gemini API key (free!)
