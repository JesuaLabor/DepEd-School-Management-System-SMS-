# DepEd SMS — Backend (Go)

Go + Chi router + MongoDB backend for the DepEd School Management System.

## Structure

```
cmd/server/main.go        Entry point
internal/config/          Env/config loading
internal/database/        MongoDB connection + indexes
internal/models/          Student, User, etc.
internal/handlers/        HTTP handlers (auth, students, ...)
internal/routes/          Route wiring
internal/middleware/      JWT auth middleware
```

## Setup

1. Copy `.env.example` to `.env` and adjust values.
2. Make sure MongoDB is running locally (or point `MONGO_URI` at your instance):
   ```bash
   docker run -d -p 27017:27017 --name deped-sms-mongo mongo:7
   ```
3. Fetch dependencies and run:
   ```bash
   go mod tidy
   go run ./cmd/server
   ```
4. Health check: `GET http://localhost:8080/health`

## API (v1 prefix: `/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create a user account |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/students` | Yes | List students (optional `?gradeLevel=`) |
| POST | `/students` | Yes | Create a student |
| GET | `/students/{id}` | Yes | Get one student |
| PUT | `/students/{id}` | Yes | Update a student |
| DELETE | `/students/{id}` | Yes | Delete a student |

Send `Authorization: Bearer <token>` on protected routes.

## Notes

- `go mod tidy` needs network access to the Go module proxy — run it on your machine; it couldn't be run in this sandbox.
- This is a scaffold: role-based route guards (`middleware.RequireRole`), SHS strand/section handlers, School Forms (SF9/SF10) generation, and attendance/grading modules still need to be built out.
