package main

import (
	"context"
	"log"
	"net/http"

	"github.com/deped-sms/backend/internal/config"
	"github.com/deped-sms/backend/internal/database"
	"github.com/deped-sms/backend/internal/routes"
)

func main() {
	cfg := config.Load()

	db := database.Connect(cfg.MongoURI, cfg.MongoDBName)
	if err := database.EnsureIndexes(context.Background(), db); err != nil {
		log.Fatalf("failed to ensure indexes: %v", err)
	}

	router := routes.New(db, cfg)

	log.Printf("server listening on :%s (env=%s)", cfg.Port, cfg.Env)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
