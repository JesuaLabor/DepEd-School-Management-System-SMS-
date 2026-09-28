package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ApplicationStatus string

const (
	ApplicationSubmitted   ApplicationStatus = "submitted"
	ApplicationUnderReview ApplicationStatus = "under_review"
	ApplicationApproved    ApplicationStatus = "approved"
	ApplicationRejected    ApplicationStatus = "rejected"
)

// AdmissionApplication represents a public online enrollment / admission application.
type AdmissionApplication struct {
	ID               primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	ApplicationNo    string             `bson:"application_no"         json:"applicationNo"`
	LRN              string             `bson:"lrn,omitempty"          json:"lrn,omitempty"`
	HasLRN           bool               `bson:"has_lrn"                json:"hasLrn"`

	// Learner Info
	FirstName        string             `bson:"first_name"             json:"firstName"`
	LastName         string             `bson:"last_name"              json:"lastName"`
	MiddleName       string             `bson:"middle_name,omitempty"  json:"middleName,omitempty"`
	ExtName          string             `bson:"ext_name,omitempty"     json:"extName,omitempty"`
	BirthDate        time.Time          `bson:"birth_date"             json:"birthDate"`
	BirthPlace       string             `bson:"birth_place,omitempty"  json:"birthPlace,omitempty"`
	Sex              string             `bson:"sex"                    json:"sex"`
	CivilStatus      string             `bson:"civil_status,omitempty" json:"civilStatus,omitempty"`
	Religion         string             `bson:"religion,omitempty"     json:"religion,omitempty"`
	MotherTongue     string             `bson:"mother_tongue,omitempty" json:"motherTongue,omitempty"`
	Nationality      string             `bson:"nationality,omitempty"  json:"nationality,omitempty"`
	ContactNo        string             `bson:"contact_no,omitempty"   json:"contactNo,omitempty"`
	Email            string             `bson:"email,omitempty"        json:"email,omitempty"`
	PSABirthCertNo   string             `bson:"psa_birth_cert_no,omitempty" json:"psaBirthCertNo,omitempty"`

	// Address
	Address          Address            `bson:"address"                json:"address"`

	// Academic Application Details
	EnrollmentType   EnrollmentType     `bson:"enrollment_type"        json:"enrollmentType"`
	TargetGradeLevel GradeLevel         `bson:"target_grade_level"     json:"targetGradeLevel"`
	Strand           Strand             `bson:"strand,omitempty"       json:"strand,omitempty"`
	Track            string             `bson:"track,omitempty"        json:"track,omitempty"`
	PreviousSchool   string             `bson:"previous_school,omitempty" json:"previousSchool,omitempty"`
	PreviousSchoolID string             `bson:"previous_school_id,omitempty" json:"previousSchoolId,omitempty"`
	SchoolYear       string             `bson:"school_year"            json:"schoolYear"`

	// Parent / Guardian Info
	Guardian         Guardian           `bson:"guardian"               json:"guardian"`

	// Status & Review
	Status           ApplicationStatus  `bson:"status"                 json:"status"`
	ReviewRemarks    string             `bson:"review_remarks,omitempty" json:"reviewRemarks,omitempty"`
	ReviewedBy       primitive.ObjectID `bson:"reviewed_by,omitempty"  json:"reviewedBy,omitempty"`
	ReviewedAt       *time.Time         `bson:"reviewed_at,omitempty"  json:"reviewedAt,omitempty"`

	// Resulting Student ID upon approval
	CreatedStudentID *primitive.ObjectID `bson:"created_student_id,omitempty" json:"createdStudentId,omitempty"`

	CreatedAt        time.Time          `bson:"created_at"             json:"createdAt"`
	UpdatedAt        time.Time          `bson:"updated_at"             json:"updatedAt"`
}
