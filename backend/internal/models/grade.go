package models

import (
	"math"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Subject represents a DepEd curriculum learning area.
type Subject struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	GradeLevel int    `json:"gradeLevel"`
	Strand     Strand `json:"strand,omitempty"`
	Semester   int    `json:"semester,omitempty"` // 1 or 2 for SHS
}

// GradeRecord stores quarterly ratings for a student in a specific subject.
type GradeRecord struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	StudentID   primitive.ObjectID `bson:"student_id"             json:"studentId"`
	SectionID   primitive.ObjectID `bson:"section_id"             json:"sectionId"`
	SchoolYear  string             `bson:"school_year"            json:"schoolYear"`
	GradeLevel  int                `bson:"grade_level"            json:"gradeLevel"`
	SubjectCode string             `bson:"subject_code"           json:"subjectCode"`
	SubjectName string             `bson:"subject_name"           json:"subjectName"`
	Q1          *float64           `bson:"q1,omitempty"          json:"q1,omitempty"`
	Q2          *float64           `bson:"q2,omitempty"          json:"q2,omitempty"`
	Q3          *float64           `bson:"q3,omitempty"          json:"q3,omitempty"`
	Q4          *float64           `bson:"q4,omitempty"          json:"q4,omitempty"`
	FinalGrade  *float64           `bson:"final_grade,omitempty"  json:"finalGrade,omitempty"`
	Remarks     string             `bson:"remarks,omitempty"      json:"remarks,omitempty"` // "Passed" or "Failed"
	EncodedBy   primitive.ObjectID `bson:"encoded_by,omitempty"   json:"encodedBy,omitempty"`
	CreatedAt   time.Time          `bson:"created_at"             json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at"             json:"updatedAt"`
}

// ComputeFinalRating calculates the final rating and remarks based on encoded quarters.
func (g *GradeRecord) ComputeFinalRating() {
	var quarters []float64
	if g.Q1 != nil {
		quarters = append(quarters, *g.Q1)
	}
	if g.Q2 != nil {
		quarters = append(quarters, *g.Q2)
	}
	if g.Q3 != nil {
		quarters = append(quarters, *g.Q3)
	}
	if g.Q4 != nil {
		quarters = append(quarters, *g.Q4)
	}

	if len(quarters) == 0 {
		g.FinalGrade = nil
		g.Remarks = ""
		return
	}

	sum := 0.0
	for _, q := range quarters {
		sum += q
	}
	// DepEd standard: rounded to whole number or 2 decimal places
	avg := math.Round(sum / float64(len(quarters)))
	g.FinalGrade = &avg

	if avg >= 75.0 {
		g.Remarks = "Passed"
	} else {
		g.Remarks = "Failed"
	}
}

// GradeDescriptor returns the DepEd verbal descriptor for a numerical grade.
func GradeDescriptor(rating float64) string {
	switch {
	case rating >= 90.0:
		return "Outstanding"
	case rating >= 85.0:
		return "Very Satisfactory"
	case rating >= 80.0:
		return "Satisfactory"
	case rating >= 75.0:
		return "Fairly Satisfactory"
	default:
		return "Did Not Meet Expectations"
	}
}

// GradeWithStudent embeds the student summary for class grading sheets.
type GradeWithStudent struct {
	GradeRecord `bson:",inline"`
	Student     StudentSummary `bson:"student" json:"student"`
}

// LearnerSF9 contains all information needed to render DepEd School Form 9 (Report Card).
type LearnerSF9 struct {
	Student        Student            `json:"student"`
	Section        SectionWithAdviser `json:"section"`
	SchoolYear     string             `json:"schoolYear"`
	GradeLevel     int                `json:"gradeLevel"`
	Grades         []GradeRecord      `json:"grades"`
	GeneralAverage *float64           `json:"generalAverage,omitempty"`
	Descriptor     string             `json:"descriptor,omitempty"`
	Remarks        string             `json:"remarks,omitempty"` // Promoted, Retained
	Attendance     AttendanceSummary  `json:"attendance"`
}

// GetCurriculumSubjects returns standard DepEd learning areas for a given grade level & strand.
func GetCurriculumSubjects(gradeLevel int, strand Strand) []Subject {
	if gradeLevel <= 10 {
		// Junior High School Standard Curriculum
		return []Subject{
			{Code: "FIL", Name: "Filipino", GradeLevel: gradeLevel},
			{Code: "ENG", Name: "English", GradeLevel: gradeLevel},
			{Code: "MATH", Name: "Mathematics", GradeLevel: gradeLevel},
			{Code: "SCI", Name: "Science", GradeLevel: gradeLevel},
			{Code: "AP", Name: "Araling Panlipunan (AP)", GradeLevel: gradeLevel},
			{Code: "ESP", Name: "Edukasyon sa Pagpapakatao (EsP)", GradeLevel: gradeLevel},
			{Code: "MAPEH", Name: "MAPEH (Music, Arts, PE, Health)", GradeLevel: gradeLevel},
			{Code: "TLE", Name: "Technology & Livelihood Education (TLE)", GradeLevel: gradeLevel},
		}
	}

	// Senior High School (Grades 11-12)
	core := []Subject{
		{Code: "ORALCOM", Name: "Oral Communication in Context", GradeLevel: gradeLevel, Strand: strand, Semester: 1},
		{Code: "KOM", Name: "Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino", GradeLevel: gradeLevel, Strand: strand, Semester: 1},
		{Code: "GENMATH", Name: "General Mathematics", GradeLevel: gradeLevel, Strand: strand, Semester: 1},
		{Code: "ELS", Name: "Earth and Life Science", GradeLevel: gradeLevel, Strand: strand, Semester: 1},
		{Code: "PE1", Name: "Physical Education and Health 1", GradeLevel: gradeLevel, Strand: strand, Semester: 1},
		{Code: "EAPP", Name: "English for Academic and Professional Purposes", GradeLevel: gradeLevel, Strand: strand, Semester: 1},
		{Code: "UCSP", Name: "Understanding Culture, Society and Politics", GradeLevel: gradeLevel, Strand: strand, Semester: 2},
		{Code: "STATPROB", Name: "Statistics and Probability", GradeLevel: gradeLevel, Strand: strand, Semester: 2},
		{Code: "PR1", Name: "Practical Research 1", GradeLevel: gradeLevel, Strand: strand, Semester: 2},
	}

	if strand == "academic" {
		core = append(core,
			Subject{Code: "PRECALC", Name: "Pre-Calculus", GradeLevel: gradeLevel, Strand: strand, Semester: 1},
			Subject{Code: "BASCALC", Name: "Basic Calculus", GradeLevel: gradeLevel, Strand: strand, Semester: 2},
		)
	} else if strand == "tvl" {
		core = append(core,
			Subject{Code: "TVLICT", Name: "Computer Systems Servicing / Tech-Voc", GradeLevel: gradeLevel, Strand: strand, Semester: 1},
			Subject{Code: "EMPETECH", Name: "Empowerment Technologies", GradeLevel: gradeLevel, Strand: strand, Semester: 2},
		)
	}

	return core
}
