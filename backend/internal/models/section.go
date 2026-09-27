package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Section represents a class advisory section for a specific grade level and school year.
type Section struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	Name        string             `bson:"name"                  json:"name"`
	GradeLevel  int                `bson:"grade_level"           json:"gradeLevel"`
	SchoolYear  string             `bson:"school_year"           json:"schoolYear"` // e.g. "2024-2025"
	Strand      Strand             `bson:"strand,omitempty"      json:"strand,omitempty"`
	Track       string             `bson:"track,omitempty"       json:"track,omitempty"`
	AdviserID   primitive.ObjectID `bson:"adviser_id,omitempty"  json:"adviserId,omitempty"`
	Room        string             `bson:"room,omitempty"        json:"room,omitempty"`
	MaxCapacity int                `bson:"max_capacity"          json:"maxCapacity"`
	SchoolID    primitive.ObjectID `bson:"school_id,omitempty"   json:"schoolId,omitempty"`
	CreatedAt   time.Time          `bson:"created_at"             json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at"             json:"updatedAt"`
}

// AdviserSummary is a minimal projection of the assigned teacher adviser.
type AdviserSummary struct {
	ID        primitive.ObjectID `bson:"_id"        json:"id"`
	FirstName string             `bson:"first_name" json:"firstName"`
	LastName  string             `bson:"last_name"  json:"lastName"`
	Email     string             `bson:"email"      json:"email"`
}

// SectionWithAdviser hydrates the section with adviser details and current enrollment headcounts.
type SectionWithAdviser struct {
	Section      `bson:",inline"`
	Adviser      *AdviserSummary `bson:"adviser,omitempty" json:"adviser,omitempty"`
	StudentCount int             `bson:"student_count"     json:"studentCount"`
	MaleCount    int             `bson:"male_count"        json:"maleCount"`
	FemaleCount  int             `bson:"female_count"      json:"femaleCount"`
}

// SectionRoster includes the section details, adviser, and full list of sectioned students.
type SectionRoster struct {
	Section     SectionWithAdviser `json:"section"`
	Students    []Student          `json:"students"`
	TotalMale   int                `json:"totalMale"`
	TotalFemale int                `json:"totalFemale"`
	TotalCount  int                `json:"totalCount"`
}
