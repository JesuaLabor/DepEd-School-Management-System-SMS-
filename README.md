# DepEd School Management System — Scaffold

Stack: **Go** (backend, Chi router) · **React 19 + TypeScript** (frontend, Vite) · **MongoDB** (database)

## Quick start

```bash
# 1. Start MongoDB
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
go mod tidy
go run ./cmd/server
# -> http://localhost:8080

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

## What's included

- **Backend**: config loading, MongoDB connection + indexes, JWT auth (register/login),
  role model (super_admin/registrar/teacher/student/guardian), Student model covering
  JHS (Grades 7–10) and SHS (Grades 11–12, with strand), full CRUD for students,
  auth middleware for protected routes.
- **Frontend**: Vite + React 19 + TS, React Router, a typed API client, a login page,
  a dashboard placeholder, and a student list page wired to the backend.

## What's not built yet (next steps)

- School, Section, Subject, and Enrollment models/handlers
- Grade encoding + SF9/SF10 report generation
- Attendance module
- SHS subject-per-semester scheduling
- Role-based UI (currently any logged-in user sees the same pages)
- Tests

See `backend/README.md` and `frontend/README.md` for stack-specific details.
