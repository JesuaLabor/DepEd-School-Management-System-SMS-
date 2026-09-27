package database

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Connect establishes a connection to MongoDB and returns a *mongo.Database handle.
func Connect(uri, dbName string) *mongo.Database {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatalf("mongo: failed to connect: %v", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("mongo: failed to ping: %v", err)
	}

	log.Printf("mongo: connected to database %q", dbName)
	return client.Database(dbName)
}

// EnsureIndexes creates the core indexes the app relies on. Safe to call on every startup.
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	// ── users ──────────────────────────────────────────────────────────────────
	usersCol := db.Collection("users")
	if _, err := usersCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}); err != nil {
		return err
	}

	// ── students ───────────────────────────────────────────────────────────────
	studentsCol := db.Collection("students")

	// Unique LRN
	if _, err := studentsCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "lrn", Value: 1}},
		Options: options.Index().SetUnique(true),
	}); err != nil {
		return err
	}

	// Compound query index: grade_level + status (common filter combo)
	if _, err := studentsCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "grade_level", Value: 1},
			{Key: "status", Value: 1},
		},
	}); err != nil {
		return err
	}

	// Name sort / search support
	if _, err := studentsCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "last_name", Value: 1},
			{Key: "first_name", Value: 1},
		},
	}); err != nil {
		return err
	}

	return nil
}
