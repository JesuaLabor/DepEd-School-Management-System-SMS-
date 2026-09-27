# DepEd SMS — Frontend (React 19 + TypeScript)

Vite + React 19 + TypeScript client for the DepEd School Management System.

## Structure

```
src/
  main.tsx            React 19 root render
  App.tsx             Router setup
  components/          Shared UI (Layout, etc.)
  pages/               Route-level pages (Dashboard, Login, students/StudentList)
  services/api.ts      Typed fetch wrapper for the Go backend
  types/index.ts       Shared TS types mirroring the Go models
```

## Setup

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api/*` calls to the
Go backend on `http://localhost:8080` (see `vite.config.ts`).

## Notes

- Auth is a simple token-in-localStorage flow for the scaffold; move to httpOnly
  cookies or a more robust flow before production.
- No UI library is wired in yet — feel free to drop in Tailwind, MUI, shadcn/ui, etc.
- `npm install` wasn't run in this sandbox (no npm registry access here) — run it locally.
