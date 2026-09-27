package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// EnrollmentRecordStatus tracks the admin approval state of an enrollment application.
type EnrollmentRecordStatus string

const (
	EnrollmentPending  EnrollmentRecordStatus = "pending"
	EnrollmentApproved EnrollmentRecordStatus = "approved"
	EnrollmentRejected EnrollmentRecordStatus = "rejected"
)

// EnrollmentType distinguishes how the student is enrolling.
type EnrollmentType string

const (
	EnrollmentTypeNew        EnrollmentType = "new"        // first time in this school
	EnrollmentTypeReturning  EnrollmentType = "returning"  // was enrolled last year
	EnrollmentTypeTransferee EnrollmentType = "transferee" // coming from another school
	EnrollmentTypePromotion  EnrollmentType = "promotion"  // promoted to next grade (system-generated)
)

// Enrollment is a per-school-year enrollment application for a student.
// It is separate from the Student record so we can track enrollment history
// across multiple school years without mutating the core learner profile.
type Enrollment struct {
	ID           primitive.ObjectID     `bson:"_id,omitempty"        json:"id"`
	StudentID    primitive.ObjectID     `bson:"student_id"           json:"studentId"`
	SchoolYear   string                 `bson:"school_year"          json:"schoolYear"`   // "2025-2026"
	GradeLevel   GradeLevel             `bson:"grade_level"          json:"gradeLevel"`
	Strand       Strand                 `bson:"strand,omitempty"     json:"strand,omitempty"`
	Track        string                 `bson:"track,omitempty"      json:"track,omitempty"`
	SectionID    primitive.ObjectID     `bson:"section_id,omitempty" json:"sectionId,omitempty"`
	Type         EnrollmentType         `bson:"type"                 json:"type"`
	Status       EnrollmentRecordStatus `bson:"status"               json:"status"`
	Remarks      string                 `bson:"remarks,omitempty"    json:"remarks,omitempty"`
	RejectedReason string               `bson:"rejected_reason,omitempty" json:"rejectedReason,omitempty"`
	ProcessedBy  primitive.ObjectID     `bson:"processed_by,omitempty" json:"processedBy,omitempty"`
	ProcessedAt  *time.Time             `bson:"processed_at,omitempty" json:"processedAt,omitempty"`
	SchoolID     primitive.ObjectID     `bson:"school_id,omitempty"  json:"schoolId,omitempty"`
	CreatedAt    time.Time              `bson:"created_at"           json:"createdAt"`
	UpdatedAt    time.Time              `bson:"updated_at"           json:"updatedAt"`
}

// EnrollmentWithStudent is the enriched enrollment returned to the frontend,
// embedding basic student info for display without a separate join request.
type EnrollmentWithStudent struct {
	Enrollment `bson:",inline"`
	Student    *StudentSummary `bson:"student,omitempty" json:"student,omitempty"`
}

// StudentSummary is a lightweight projection of Student used in enrollment responses.
type StudentSummary struct {
	ID         primitive.ObjectID `bson:"_id"         json:"id"`
	LRN        string             `bson:"lrn"         json:"lrn"`
	FirstName  string             `bson:"first_name"  json:"firstName"`
	LastName   string             `bson:"last_name"   json:"lastName"`
	MiddleName string             `bson:"middle_name" json:"middleName,omitempty"`
	Sex        string             `bson:"sex"         json:"sex"`
	BirthDate  time.Time          `bson:"birth_date"  json:"birthDate"`
}
