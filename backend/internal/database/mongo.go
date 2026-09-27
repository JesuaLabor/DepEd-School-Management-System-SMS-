package database

import (
	"context"
	"log"
	"time"

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

// EnsureIndexes creates the core indexes the app relies on. Call once at startup.
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	usersCol := db.Collection("users")
	_, err := usersCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    map[string]int{"email": 1},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	studentsCol := db.Collection("students")
	_, err = studentsCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    map[string]int{"lrn": 1},
		Options: options.Index().SetUnique(true),
	})
	return err
}
