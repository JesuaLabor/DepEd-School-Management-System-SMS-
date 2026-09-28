package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GradeLevel covers Junior High (7–10) and Senior High (11–12).
type GradeLevel int

const (
	Grade7  GradeLevel = 7
	Grade8  GradeLevel = 8
	Grade9  GradeLevel = 9
	Grade10 GradeLevel = 10
	Grade11 GradeLevel = 11
	Grade12 GradeLevel = 12
)

// Strand applies only to Senior High School students.
type Strand string

const (
	StrandNone       Strand = ""
	StrandAcademic   Strand = "academic"
	StrandTVL        Strand = "tvl"
	StrandSports     Strand = "sports"
	StrandArtsDesign Strand = "arts_design"
)

// EnrollmentStatus tracks the learner's current standing.
type EnrollmentStatus string

const (
	StatusEnrolled    EnrollmentStatus = "enrolled"
	StatusDropped     EnrollmentStatus = "dropped"
	StatusTransferred EnrollmentStatus = "transferred"
	StatusGraduated   EnrollmentStatus = "graduated"
)

// Guardian holds information about a parent or legal guardian.
type Guardian struct {
	Name         string `bson:"name"          json:"name"`
	Relationship string `bson:"relationship"  json:"relationship"` // e.g. mother, father, lolo
	ContactNo    string `bson:"contact_no"    json:"contactNo"`
	Email        string `bson:"email,omitempty" json:"email,omitempty"`
	Occupation   string `bson:"occupation,omitempty" json:"occupation,omitempty"`
}

// Address is a reusable embedded address block.
type Address struct {
	HouseNo    string `bson:"house_no,omitempty"   json:"houseNo,omitempty"`
	Street     string `bson:"street,omitempty"     json:"street,omitempty"`
	Barangay   string `bson:"barangay"             json:"barangay"`
	City       string `bson:"city"                 json:"city"`
	Province   string `bson:"province"             json:"province"`
	Region     string `bson:"region,omitempty"     json:"region,omitempty"`
	PostalCode string `bson:"postal_code,omitempty" json:"postalCode,omitempty"`
}

// Student is a learner record spanning JHS (Gr. 7–10) and SHS (Gr. 11–12).
type Student struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"        json:"id"`
	LRN        string             `bson:"lrn"                  json:"lrn"` // DepEd Learner Reference Number (12 digits)

	// Personal information
	FirstName   string    `bson:"first_name"           json:"firstName"`
	LastName    string    `bson:"last_name"            json:"lastName"`
	MiddleName  string    `bson:"middle_name,omitempty" json:"middleName,omitempty"`
	ExtName     string    `bson:"ext_name,omitempty"   json:"extName,omitempty"` // Jr., Sr., III
	BirthDate   time.Time `bson:"birth_date"           json:"birthDate"`
	BirthPlace  string    `bson:"birth_place,omitempty" json:"birthPlace,omitempty"`
	Sex         string    `bson:"sex"                  json:"sex"` // Male | Female
	CivilStatus string    `bson:"civil_status,omitempty" json:"civilStatus,omitempty"`
	Religion    string    `bson:"religion,omitempty"   json:"religion,omitempty"`
	MotherTongue string   `bson:"mother_tongue,omitempty" json:"motherTongue,omitempty"`
	Nationality string    `bson:"nationality,omitempty" json:"nationality,omitempty"`
	ContactNo   string    `bson:"contact_no,omitempty" json:"contactNo,omitempty"`
	Email       string    `bson:"email,omitempty"      json:"email,omitempty"`

	// Address
	Address Address `bson:"address" json:"address"`

	// Academic
	GradeLevel  GradeLevel       `bson:"grade_level"          json:"gradeLevel"`
	Strand      Strand           `bson:"strand,omitempty"     json:"strand,omitempty"`
	Track       string           `bson:"track,omitempty"      json:"track,omitempty"` // e.g. Academic, TVL
	SectionID   primitive.ObjectID `bson:"section_id,omitempty" json:"sectionId,omitempty"`
	SchoolYear  string           `bson:"school_year"          json:"schoolYear"` // e.g. "2025-2026"
	Status      EnrollmentStatus `bson:"status"               json:"status"`
	Remarks     string           `bson:"remarks,omitempty"    json:"remarks,omitempty"`

	// Guardian
	Guardian Guardian `bson:"guardian" json:"guardian"`

	// Meta
	SchoolID  primitive.ObjectID `bson:"school_id,omitempty" json:"schoolId,omitempty"`
	CreatedAt time.Time          `bson:"created_at"          json:"createdAt"`
	UpdatedAt time.Time          `bson:"updated_at"          json:"updatedAt"`
}

// ValidateLRN validates a DepEd 12-digit Learner Reference Number.
func ValidateLRN(lrn string) bool {
	if len(lrn) != 12 {
		return false
	}
	for _, r := range lrn {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
