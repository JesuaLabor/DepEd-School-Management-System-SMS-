package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/deped-sms/backend/internal/config"
	"github.com/deped-sms/backend/internal/handlers"
	authmw "github.com/deped-sms/backend/internal/middleware"
)

// New builds the full HTTP router for the application.
func New(db *mongo.Database, cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	authHandler        := handlers.NewAuthHandler(db, cfg)
	studentHandler     := handlers.NewStudentHandler(db)
	userHandler        := handlers.NewUserHandler(db)
	enrollmentHandler  := handlers.NewEnrollmentHandler(db)
	attendanceHandler  := handlers.NewAttendanceHandler(db)
	sectionHandler     := handlers.NewSectionHandler(db)
	gradeHandler       := handlers.NewGradeHandler(db)
	schoolFormsHandler := handlers.NewSchoolFormsHandler(db)

	r.Route("/api/v1", func(api chi.Router) {
		// ── Public ────────────────────────────────────────────────────────────────
		api.Post("/auth/login",       authHandler.Login)
		api.Post("/auth/register",    authHandler.Register)
		api.Post("/auth/deped-sso",   authHandler.DepEdSSO)
		api.Get("/auth/sso/config",   authHandler.GetSSOConfig)

		// ── Protected ─────────────────────────────────────────────────────────────
		api.Group(func(protected chi.Router) {
			protected.Use(authmw.RequireAuth(cfg.JWTSecret))

			// Auth
			protected.Get("/auth/me",               authHandler.Me)
			protected.Post("/auth/change-password",  authHandler.ChangePassword)

			// Users (admin / registrar)
			protected.Get("/users",
				authmw.RequireRole("super_admin", "registrar")(http.HandlerFunc(userHandler.ListUsers)).ServeHTTP)
			protected.Post("/users",
				authmw.RequireRole("super_admin", "registrar")(http.HandlerFunc(userHandler.CreateUser)).ServeHTTP)
			protected.Post("/users/bulk-import",
				authmw.RequireRole("super_admin", "registrar")(http.HandlerFunc(userHandler.BulkImport)).ServeHTTP)
			protected.Get("/users/{id}",  userHandler.GetUser)
			protected.Put("/users/{id}",  userHandler.UpdateUser)
			protected.Patch("/users/{id}/status",
				authmw.RequireRole("super_admin")(http.HandlerFunc(userHandler.SetActiveStatus)).ServeHTTP)

			// Students
			protected.Mount("/students", studentHandler.Routes())

			// Enrollments
			protected.Mount("/enrollments", enrollmentHandler.Routes())

			// Attendance
			protected.Mount("/attendance", attendanceHandler.Routes())

			// Sections & Advisory
			protected.Mount("/sections", sectionHandler.Routes())

			// Grading & Assessment (SF9)
			protected.Mount("/grades", gradeHandler.Routes())

			// DepEd School Forms Hub (SF2, SF10)
			protected.Mount("/school-forms", schoolFormsHandler.Routes())
		})
	})

	return r
}
