package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/deped-sms/backend/internal/config"
	authmw "github.com/deped-sms/backend/internal/middleware"
	"github.com/deped-sms/backend/internal/handlers"
)

// New builds the full HTTP router for the application.
func New(db *mongo.Database, cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"}, // Vite dev server
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})

	authHandler := handlers.NewAuthHandler(db, cfg.JWTSecret, cfg.JWTExpiryHours)
	studentHandler := handlers.NewStudentHandler(db)

	r.Route("/api/v1", func(api chi.Router) {
		api.Post("/auth/login", authHandler.Login)
		api.Post("/auth/register", authHandler.Register)

		api.Group(func(protected chi.Router) {
			protected.Use(authmw.RequireAuth(cfg.JWTSecret))
			protected.Mount("/students", studentHandler.Routes())
		})
	})

	return r
}
