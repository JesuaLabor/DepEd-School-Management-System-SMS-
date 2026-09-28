package models_test

import (
	"testing"

	"github.com/deped-sms/backend/internal/models"
)

// TestTransmuteInitialGrade verifies DepEd Order No. 8, s. 2015 Table 1 Transmutation.
func TestTransmuteInitialGrade(t *testing.T) {
	tests := []struct {
		name     string
		initial  float64
		expected float64
	}{
		{"Perfect score", 100.0, 100},
		{"Near perfect", 99.5, 99},
		{"Interval 98.40-99.99", 98.40, 99},
		{"Interval 96.80-98.39", 96.80, 98},
		{"High grade 90.40", 90.40, 94},
		{"Grade 84.00 to 90", 84.00, 90},
		{"Satisfactory initial 74.40", 74.40, 84},
		{"Passing boundary exact 60.00", 60.00, 75},
		{"Failing boundary exact 59.99", 59.99, 74},
		{"Mid-failing 56.00", 56.00, 74},
		{"Low failing 20.00", 20.00, 65},
		{"Lowest bucket 4.00", 4.00, 61},
		{"Zero score 0.00", 0.00, 60},
		{"Negative fallback", -5.0, 60},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := models.TransmuteInitialGrade(tc.initial)
			if got != tc.expected {
				t.Errorf("TransmuteInitialGrade(%v) = %v; want %v", tc.initial, got, tc.expected)
			}
		})
	}
}

// TestGetDO8GradingWeights verifies component percentage distributions under DO 8, s. 2015.
func TestGetDO8GradingWeights(t *testing.T) {
	tests := []struct {
		name        string
		gradeLevel  int
		subjectCode string
		strand      models.Strand
		wantWW      int
		wantPT      int
		wantQA      int
	}{
		{
			name:        "JHS Filipino (Languages)",
			gradeLevel:  7,
			subjectCode: "FIL",
			strand:      models.StrandNone,
			wantWW:      30, wantPT: 50, wantQA: 20,
		},
		{
			name:        "JHS English (Languages)",
			gradeLevel:  8,
			subjectCode: "ENG",
			strand:      models.StrandNone,
			wantWW:      30, wantPT: 50, wantQA: 20,
		},
		{
			name:        "JHS Science (Math & Science)",
			gradeLevel:  9,
			subjectCode: "SCI",
			strand:      models.StrandNone,
			wantWW:      40, wantPT: 40, wantQA: 20,
		},
		{
			name:        "JHS Mathematics (Math & Science)",
			gradeLevel:  10,
			subjectCode: "MATH",
			strand:      models.StrandNone,
			wantWW:      40, wantPT: 40, wantQA: 20,
		},
		{
			name:        "JHS MAPEH",
			gradeLevel:  7,
			subjectCode: "MAPEH",
			strand:      models.StrandNone,
			wantWW:      20, wantPT: 60, wantQA: 20,
		},
		{
			name:        "JHS TLE",
			gradeLevel:  8,
			subjectCode: "TLE",
			strand:      models.StrandNone,
			wantWW:      20, wantPT: 60, wantQA: 20,
		},
		{
			name:        "SHS Core Subject (General Math)",
			gradeLevel:  11,
			subjectCode: "GENMATH",
			strand:      models.StrandAcademic,
			wantWW:      25, wantPT: 50, wantQA: 25,
		},
		{
			name:        "SHS TVL Track",
			gradeLevel:  11,
			subjectCode: "TVLICT",
			strand:      models.StrandTVL,
			wantWW:      20, wantPT: 60, wantQA: 20,
		},
		{
			name:        "SHS Practical Research (Immersion/Research)",
			gradeLevel:  12,
			subjectCode: "PR1",
			strand:      models.StrandAcademic,
			wantWW:      35, wantPT: 40, wantQA: 25,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := models.GetDO8GradingWeights(tc.gradeLevel, tc.subjectCode, tc.strand)
			if w.WrittenWork != tc.wantWW || w.PerformanceTask != tc.wantPT || w.QuarterlyAssessment != tc.wantQA {
				t.Errorf("GetDO8GradingWeights(%d, %s, %s) = (%d, %d, %d); want (%d, %d, %d)",
					tc.gradeLevel, tc.subjectCode, tc.strand,
					w.WrittenWork, w.PerformanceTask, w.QuarterlyAssessment,
					tc.wantWW, tc.wantPT, tc.wantQA,
				)
			}
			// Sum of weights must equal 100%
			sum := w.WrittenWork + w.PerformanceTask + w.QuarterlyAssessment
			if sum != 100 {
				t.Errorf("Total weight percentage sum = %d; want 100", sum)
			}
		})
	}
}

// TestComputeQuarterRating verifies calculation of initial and transmuted grades.
func TestComputeQuarterRating(t *testing.T) {
	// Mathematics DO 8 weights: 40% WW, 40% PT, 20% QA
	weights := models.GradingWeights{
		WrittenWork:         40,
		PerformanceTask:     40,
		QuarterlyAssessment: 20,
	}

	// Perfect scores across all components
	initial, transmuted := models.ComputeQuarterRating(weights, 50, 50, 60, 60, 40, 40)
	if initial != 100.0 {
		t.Errorf("expected initial 100.0, got %v", initial)
	}
	if transmuted != 100.0 {
		t.Errorf("expected transmuted 100.0, got %v", transmuted)
	}

	// 60% raw score across all components -> initial 60.00 -> transmuted 75 (Passing)
	initialPassing, transmutedPassing := models.ComputeQuarterRating(weights, 30, 50, 36, 60, 24, 40)
	if initialPassing != 60.0 {
		t.Errorf("expected initial 60.0, got %v", initialPassing)
	}
	if transmutedPassing != 75.0 {
		t.Errorf("expected transmuted 75.0 (Passing), got %v", transmutedPassing)
	}
}

// TestGradeDescriptor verifies DepEd verbal descriptors.
func TestGradeDescriptor(t *testing.T) {
	tests := []struct {
		rating   float64
		expected string
	}{
		{95.0, "Outstanding"},
		{90.0, "Outstanding"},
		{89.0, "Very Satisfactory"},
		{85.0, "Very Satisfactory"},
		{82.0, "Satisfactory"},
		{80.0, "Satisfactory"},
		{77.0, "Fairly Satisfactory"},
		{75.0, "Fairly Satisfactory"},
		{74.9, "Did Not Meet Expectations"},
		{60.0, "Did Not Meet Expectations"},
	}

	for _, tc := range tests {
		t.Run(tc.expected, func(t *testing.T) {
			got := models.GradeDescriptor(tc.rating)
			if got != tc.expected {
				t.Errorf("GradeDescriptor(%v) = %q; want %q", tc.rating, got, tc.expected)
			}
		})
	}
}

// TestComputeFinalRating verifies calculation of subject final rating and remarks.
func TestComputeFinalRating(t *testing.T) {
	q1, q2, q3, q4 := 88.0, 90.0, 92.0, 94.0
	rec := models.GradeRecord{
		Q1: &q1,
		Q2: &q2,
		Q3: &q3,
		Q4: &q4,
	}
	rec.ComputeFinalRating()

	if rec.FinalGrade == nil {
		t.Fatalf("expected non-nil FinalGrade")
	}
	if *rec.FinalGrade != 91.0 {
		t.Errorf("expected final grade 91.0, got %v", *rec.FinalGrade)
	}
	if rec.Remarks != "Passed" {
		t.Errorf("expected remarks 'Passed', got %q", rec.Remarks)
	}

	// Failing case
	f1, f2, f3, f4 := 70.0, 72.0, 71.0, 73.0
	failingRec := models.GradeRecord{
		Q1: &f1,
		Q2: &f2,
		Q3: &f3,
		Q4: &f4,
	}
	failingRec.ComputeFinalRating()
	if failingRec.Remarks != "Failed" {
		t.Errorf("expected remarks 'Failed', got %q", failingRec.Remarks)
	}
}
