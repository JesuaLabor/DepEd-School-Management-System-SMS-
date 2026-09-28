package models

import (
	"math"
	"strings"
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

// GradingWeights defines summative component percentages under DepEd Order No. 8, s. 2015.
type GradingWeights struct {
	WrittenWork         int     `json:"writtenWork"`         // e.g. 30 (for 30%)
	PerformanceTask     int     `json:"performanceTask"`     // e.g. 50 (for 50%)
	QuarterlyAssessment int     `json:"quarterlyAssessment"` // e.g. 20 (for 20%)
	GroupClassification string  `json:"groupClassification"` // Descriptor of group
}

// GetDO8GradingWeights returns the official DepEd DO 8, s. 2015 component percentages.
func GetDO8GradingWeights(gradeLevel int, subjectCode string, strand Strand) GradingWeights {
	code := strings.ToUpper(strings.TrimSpace(subjectCode))

	if gradeLevel <= 10 {
		// Junior High School (Grades 7 - 10)
		switch code {
		case "FIL", "ENG", "AP", "ESP":
			return GradingWeights{
				WrittenWork:         30,
				PerformanceTask:     50,
				QuarterlyAssessment: 20,
				GroupClassification: "Languages, AP, and EsP (30-50-20)",
			}
		case "SCI", "MATH":
			return GradingWeights{
				WrittenWork:         40,
				PerformanceTask:     40,
				QuarterlyAssessment: 20,
				GroupClassification: "Science and Mathematics (40-40-20)",
			}
		case "MAPEH", "TLE", "EPP":
			return GradingWeights{
				WrittenWork:         20,
				PerformanceTask:     60,
				QuarterlyAssessment: 20,
				GroupClassification: "MAPEH and TLE/EPP (20-60-20)",
			}
		default:
			return GradingWeights{
				WrittenWork:         30,
				PerformanceTask:     50,
				QuarterlyAssessment: 20,
				GroupClassification: "Standard JHS Learning Area (30-50-20)",
			}
		}
	}

	// Senior High School (Grades 11 - 12)
	// Track-based weights
	if strand == "tvl" || strand == "sports" || strand == "arts_design" {
		return GradingWeights{
			WrittenWork:         20,
			PerformanceTask:     60,
			QuarterlyAssessment: 20,
			GroupClassification: "TVL / Sports / Arts & Design Tracks (20-60-20)",
		}
	}

	// Academic Track Immersion / Research subjects
	if code == "PR1" || code == "PR2" || code == "IMMERSION" || code == "CULMINATING" {
		return GradingWeights{
			WrittenWork:         35,
			PerformanceTask:     40,
			QuarterlyAssessment: 25,
			GroupClassification: "Work Immersion, Research, Exhibit & Performance (35-40-25)",
		}
	}

	// SHS Core Subjects
	if code == "ORALCOM" || code == "KOM" || code == "GENMATH" || code == "ELS" || code == "PE1" || code == "UCSP" || code == "STATPROB" {
		return GradingWeights{
			WrittenWork:         25,
			PerformanceTask:     50,
			QuarterlyAssessment: 25,
			GroupClassification: "SHS Core Curriculum Subjects (25-50-25)",
		}
	}

	// All other Academic Track specialized subjects
	return GradingWeights{
		WrittenWork:         25,
		PerformanceTask:     45,
		QuarterlyAssessment: 30,
		GroupClassification: "SHS Academic Track Specialized Subjects (25-45-30)",
	}
}

// TransmuteInitialGrade converts an initial grade (0 - 100) into DepEd Transmuted Grade
// using official Table 1: Transmutation Table from DepEd Order No. 8, s. 2015.
func TransmuteInitialGrade(initial float64) float64 {
	switch {
	case initial >= 100.0:
		return 100
	case initial >= 98.40:
		return 99
	case initial >= 96.80:
		return 98
	case initial >= 95.20:
		return 97
	case initial >= 93.60:
		return 96
	case initial >= 92.00:
		return 95
	case initial >= 90.40:
		return 94
	case initial >= 88.80:
		return 93
	case initial >= 87.20:
		return 92
	case initial >= 85.60:
		return 91
	case initial >= 84.00:
		return 90
	case initial >= 82.40:
		return 89
	case initial >= 80.80:
		return 88
	case initial >= 79.20:
		return 87
	case initial >= 77.60:
		return 86
	case initial >= 76.00:
		return 85
	case initial >= 74.40:
		return 84
	case initial >= 72.80:
		return 83
	case initial >= 71.20:
		return 82
	case initial >= 69.60:
		return 81
	case initial >= 68.00:
		return 80
	case initial >= 66.40:
		return 79
	case initial >= 64.80:
		return 78
	case initial >= 63.20:
		return 77
	case initial >= 61.60:
		return 76
	case initial >= 60.00:
		return 75
	case initial >= 56.00:
		return 74
	case initial >= 52.00:
		return 73
	case initial >= 48.00:
		return 72
	case initial >= 44.00:
		return 71
	case initial >= 40.00:
		return 70
	case initial >= 36.00:
		return 69
	case initial >= 32.00:
		return 68
	case initial >= 28.00:
		return 67
	case initial >= 24.00:
		return 66
	case initial >= 20.00:
		return 65
	case initial >= 16.00:
		return 64
	case initial >= 12.00:
		return 63
	case initial >= 8.00:
		return 62
	case initial >= 4.00:
		return 61
	default:
		return 60
	}
}

// ComputeQuarterRating computes Percentage Scores, Weighted Scores, Initial Grade,
// and Transmuted Quarterly Grade under DepEd Order No. 8, s. 2015.
func ComputeQuarterRating(
	weights GradingWeights,
	wwScore, wwTotal, ptScore, ptTotal, qaScore, qaTotal float64,
) (initialGrade float64, transmutedGrade float64) {
	var psWW, psPT, psQA float64
	if wwTotal > 0 {
		psWW = (wwScore / wwTotal) * 100.0
	}
	if ptTotal > 0 {
		psPT = (ptScore / ptTotal) * 100.0
	}
	if qaTotal > 0 {
		psQA = (qaScore / qaTotal) * 100.0
	}

	wsWW := psWW * (float64(weights.WrittenWork) / 100.0)
	wsPT := psPT * (float64(weights.PerformanceTask) / 100.0)
	wsQA := psQA * (float64(weights.QuarterlyAssessment) / 100.0)

	initialGrade = math.Round((wsWW+wsPT+wsQA)*100) / 100
	transmutedGrade = TransmuteInitialGrade(initialGrade)
	return initialGrade, transmutedGrade
}

