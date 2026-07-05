# Junior Developer Pull and Run Guide

This guide explains how to run the i-PESO system on a junior developer's local device after pulling the project.

The system has two main local apps:

- `i-peso-backend`: Laravel API
- `i-peso-frontend`: React + Vite web app

## Required Tools

Install these first:

- Git
- PHP 8.2 or newer
- Composer
- Node.js LTS
- npm
- Google Cloud CLI, only if testing Vertex AI features

## First-Time Setup

### 1. Clone the Repository

```powershell
git clone <your-repo-url>
cd i-peso-capstone-system
```

Replace `<your-repo-url>` with the real GitHub repository URL.

### 2. Set Up the Backend

```powershell
cd i-peso-backend
composer install
copy .env.example .env
php artisan key:generate
```

### 3. Create the Local SQLite Database

```powershell
New-Item database/database.sqlite -ItemType File -Force
```

### 4. Run Backend Database Setup

```powershell
php artisan migrate --seed
php artisan storage:link
php artisan optimize:clear
```

Important: `php artisan migrate` is required because the system has new matching, skill, PSOC, and work experience date columns.

### 5. Start the Backend Server

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

Keep this terminal open.

### 6. Set Up the Frontend

Open a second terminal:

```powershell
cd i-peso-capstone-system
cd i-peso-frontend
npm install
npm run dev
```

### 7. Open the App

Open this in the browser:

```text
http://localhost:5173
```

## Local Environment Values

### Backend `.env`

The default `.env.example` is already close to local setup. Make sure these values are correct:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
DB_CONNECTION=sqlite
```

### Frontend `.env.local`

Create or update:

```text
i-peso-frontend/.env.local
```

Recommended local values:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_MAPS_EMBED_API_KEY=
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

The frontend also falls back to `http://localhost:8000/api` if `VITE_API_BASE_URL` is missing.

## Daily Pull Routine

Use this after every `git pull`.

### 1. Pull the Latest Code

```powershell
git pull
```

### 2. Refresh Backend

```powershell
cd i-peso-backend
composer install
php artisan migrate
php artisan optimize:clear
php artisan skills:sync-taxonomy-links
```

### 3. Start Backend

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

### 4. Refresh Frontend

Open another terminal:

```powershell
cd i-peso-frontend
npm install
npm run dev
```

## New APIs and Data Setup Notes

### Matching and Skill Taxonomy

Run this after migrations or after importing new skills:

```powershell
php artisan skills:sync-taxonomy-links
```

This reconnects seeker skills and vacancy skill requirements to the canonical skill taxonomy used by the matching algorithm.

### PSOC API

PSOC sync is optional for normal testing.

Only run this if the developer has a valid PSA Classification API token:

```powershell
php artisan occupations:sync-psoc
```

If no token is available, leave this blank in `.env`:

```env
PSOC_API_TOKEN=
```

### Vertex AI / Google Cloud

For normal local testing without AI suggestions, set:

```env
GOOGLE_VERTEX_AI_ENABLED=false
```

To test AI suggestions, install Google Cloud CLI and run:

```powershell
gcloud auth application-default login
gcloud config set project project-7c2a45e1-23fd-41ae-a42
```

Then keep these backend `.env` values:

```env
GOOGLE_VERTEX_AI_ENABLED=true
GOOGLE_CLOUD_PROJECT_ID=project-7c2a45e1-23fd-41ae-a42
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_VERTEX_AI_MODEL=gemini-2.5-flash
```

## Testing Checklist

After the system runs, test these flows:

- Register a job seeker
- Complete seeker onboarding
- Select PSOC preferred occupations
- Select taxonomy skills
- Add work experience with start and end dates
- Register or log in as employer
- Create a job posting
- Select PSOC occupation, required skills, education, and experience
- Open seeker dashboard
- Confirm job seeker home feed loads
- Confirm nearby jobs work if seeker has latitude and longitude

## Common Problems

### Frontend Cannot Connect to Backend

Check backend is running:

```text
http://localhost:8000
```

Check frontend API URL:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Restart frontend after changing `.env.local`.

### Database Table or Column Missing

Run:

```powershell
cd i-peso-backend
php artisan migrate
php artisan optimize:clear
```

### AI Suggestions Fail Locally

For normal testing, disable AI:

```env
GOOGLE_VERTEX_AI_ENABLED=false
```

If AI must be tested, run:

```powershell
gcloud auth application-default login
```

### PSOC Sync Fails

This usually means the API token is missing or the IP is not whitelisted.

For normal local testing, skip PSOC sync and use existing database data.

## Quick Command Summary

Backend:

```powershell
cd i-peso-backend
composer install
php artisan migrate
php artisan optimize:clear
php artisan skills:sync-taxonomy-links
php artisan serve --host=0.0.0.0 --port=8000
```

Frontend:

```powershell
cd i-peso-frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```
