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

// EnsureIndexes creates all required indexes. Safe to call on every startup (idempotent).
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	// ── users ──────────────────────────────────────────────────────────────────
	if _, err := db.Collection("users").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}); err != nil {
		return err
	}

	// ── students ───────────────────────────────────────────────────────────────
	students := db.Collection("students")
	studentIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "lrn", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "grade_level", Value: 1}, {Key: "status", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}},
		},
	}
	if _, err := students.Indexes().CreateMany(ctx, studentIndexes); err != nil {
		return err
	}

	// ── enrollments ────────────────────────────────────────────────────────────
	enrollments := db.Collection("enrollments")
	enrollmentIndexes := []mongo.IndexModel{
		// Unique: one active enrollment per student per school year
		{
			Keys: bson.D{
				{Key: "student_id",  Value: 1},
				{Key: "school_year", Value: 1},
				{Key: "status",      Value: 1},
			},
		},
		// Common query: school year + status
		{
			Keys: bson.D{
				{Key: "school_year", Value: 1},
				{Key: "status",      Value: 1},
			},
		},
		// Grade level breakdown
		{
			Keys: bson.D{
				{Key: "school_year", Value: 1},
				{Key: "grade_level", Value: 1},
			},
		},
	}
	if _, err := enrollments.Indexes().CreateMany(ctx, enrollmentIndexes); err != nil {
		return err
	}

	// ── attendance ─────────────────────────────────────────────────────────────
	attendanceIndexes := []mongo.IndexModel{
		// Unique per student per date per type (+ subjectName for subject-type)
		{
			Keys: bson.D{
				{Key: "student_id",   Value: 1},
				{Key: "date",         Value: 1},
				{Key: "type",         Value: 1},
				{Key: "subject_name", Value: 1},
			},
		},
		// Queries by date + grade (daily report)
		{Keys: bson.D{{Key: "date", Value: 1}, {Key: "grade_level", Value: 1}}},
		// Absence report
		{Keys: bson.D{{Key: "student_id", Value: 1}, {Key: "school_year", Value: 1}, {Key: "status", Value: 1}}},
	}
	if _, err := db.Collection("attendance").Indexes().CreateMany(ctx, attendanceIndexes); err != nil {
		return err
	}

	return nil
}
