# DepEd School Management System — Scaffold

Stack: **Go** (backend, Chi router) · **React 19 + TypeScript** (frontend, Vite) · **MongoDB** (database)

## Quick start

### Option 1: Unified Runner (Recommended)

Run everything (MongoDB, Backend, and Frontend) with a single command:

```bash
./run_project.sh
```

To view additional options (such as skipping DB checks or stopping Docker on exit):
```bash
./run_project.sh --help
```

### Option 2: Manual Start

```bash
# 1. Start MongoDB
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
go run ./cmd/server
# -> http://localhost:8080

# 3. Frontend (in another terminal)
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

## Modules & Features Included

- **Authentication & RBAC**: JWT auth (register/login), Argon2id / bcrypt password hashing, 5 DepEd roles (`super_admin`, `registrar`, `teacher`, `student`, `guardian`).
- **Student Information System (SIS)**: Full DepEd student profile management, 12-digit LRN validation, JHS (Grades 7–10) & SHS tracks/strands (Grades 11–12), detailed profile views and drawers.
- **Enrollment Management**: Academic year enrollments, section assignments, status workflow (`pending`, `enrolled`, `promoted`, `retained`, `transferred_out`, `dropped_out`), and Grade 10 to 11 SHS promotion wizard.
- **Sections & Class Registers**: Section capacity, adviser assignments, room assignments, and automatic DepEd School Form 1 (SF1) Class Register generation.
- **Attendance Tracking & Early Warning**: Daily and per-subject attendance recording, SARDO (Students at Risk of Dropping Out) early warning indicators, and monthly attendance summaries.
- **DepEd Order No. 8, s. 2015 Grading**: Weight distributions (Written Work, Performance Tasks, Quarterly Assessment), transmuted grading table (transmuted grade 60–100 scale), and DepEd SF9 Learner's Progress Report Card.
- **DepEd School Forms Hub**: DepEd standard forms generator including SF1 (Class Register), SF2 (Daily Attendance), and SF10 (Learner's Permanent Academic Record).
- **Unified Project Runner**: `run_project.sh` with automated dependency checking, database orchestration, health monitoring, colored multiplexed logs, and graceful shutdown.

See `backend/README.md` and `frontend/README.md` for stack-specific details.
