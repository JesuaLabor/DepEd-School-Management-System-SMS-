package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GradeLevel covers Junior High (7-10) and Senior High (11-12).
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
	StrandNone      Strand = ""
	StrandAcademic  Strand = "academic"
	StrandTVL       Strand = "tvl"
	StrandSports    Strand = "sports"
	StrandArtsDesig Strand = "arts_design"
)

// Student is a learner record spanning JHS and SHS.
type Student struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	LRN         string             `bson:"lrn" json:"lrn"` // DepEd Learner Reference Number
	FirstName   string             `bson:"first_name" json:"firstName"`
	LastName    string             `bson:"last_name" json:"lastName"`
	MiddleName  string             `bson:"middle_name,omitempty" json:"middleName,omitempty"`
	BirthDate   time.Time          `bson:"birth_date" json:"birthDate"`
	Sex         string             `bson:"sex" json:"sex"`
	GradeLevel  GradeLevel         `bson:"grade_level" json:"gradeLevel"`
	Strand      Strand             `bson:"strand,omitempty" json:"strand,omitempty"`
	SectionID   primitive.ObjectID `bson:"section_id,omitempty" json:"sectionId,omitempty"`
	SchoolID    primitive.ObjectID `bson:"school_id" json:"schoolId"`
	GuardianIDs []primitive.ObjectID `bson:"guardian_ids,omitempty" json:"guardianIds,omitempty"`
	Status      string             `bson:"status" json:"status"` // enrolled, dropped, transferred, graduated
	CreatedAt   time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updatedAt"`
}
