package handlers

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/deped-sms/backend/internal/models"
)

// GradeHandler handles all grading, quarterly encoding, and SF9 generation.
type GradeHandler struct {
	Grades     *mongo.Collection
	Students   *mongo.Collection
	Sections   *mongo.Collection
	Attendance *mongo.Collection
}

func NewGradeHandler(db *mongo.Database) *GradeHandler {
	return &GradeHandler{
		Grades:     db.Collection("grades"),
		Students:   db.Collection("students"),
		Sections:   db.Collection("sections"),
		Attendance: db.Collection("attendance"),
	}
}

// Routes returns the subrouter mounted at /grades.
func (h *GradeHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/subjects", h.GetSubjects)
	r.Get("/weights", h.GetGradingWeights)
	r.Post("/calculate", h.CalculateQuarterGrade)
	r.Get("/section/{sectionId}/sheet", h.GetSectionSheet)
	r.Post("/batch", h.BatchSaveQuarter)
	r.Get("/student/{studentId}/sf9", h.GetStudentSF9)
	r.Get("/sf9/{studentId}", h.GetStudentSF9)
	r.Put("/{id}", h.UpdateGrade)
	return r
}

// ── GetSubjects ────────────────────────────────────────────────────────────────
// Query: gradeLevel (7-12), strand (optional)
func (h *GradeHandler) GetSubjects(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	gl, err := strconv.Atoi(q.Get("gradeLevel"))
	if err != nil || gl < 7 || gl > 12 {
		writeError(w, http.StatusBadRequest, "gradeLevel (7-12) is required")
		return
	}

	strand := models.Strand(q.Get("strand"))
	subjects := models.GetCurriculumSubjects(gl, strand)

	semStr := q.Get("semester")
	if semStr != "" {
		if sem, err := strconv.Atoi(semStr); err == nil && (sem == 1 || sem == 2) {
			var filtered []models.Subject
			for _, s := range subjects {
				if s.Semester == 0 || s.Semester == sem {
					filtered = append(filtered, s)
				}
			}
			subjects = filtered
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"gradeLevel": gl,
		"strand":     strand,
		"semester":   semStr,
		"data":       subjects,
	})
}

// ── GetGradingWeights ─────────────────────────────────────────────────────────
// Query: gradeLevel (required), subjectCode (required), strand (optional)
func (h *GradeHandler) GetGradingWeights(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	gl, _ := strconv.Atoi(q.Get("gradeLevel"))
	subjectCode := q.Get("subjectCode")
	strand := models.Strand(q.Get("strand"))

	weights := models.GetDO8GradingWeights(gl, subjectCode, strand)
	writeJSON(w, http.StatusOK, weights)
}

// ── CalculateQuarterGrade ─────────────────────────────────────────────────────
type calculateGradeRequest struct {
	GradeLevel  int     `json:"gradeLevel"`
	SubjectCode string  `json:"subjectCode"`
	Strand      string  `json:"strand"`
	WWScore     float64 `json:"wwScore"`
	WWTotal     float64 `json:"wwTotal"`
	PTScore     float64 `json:"ptScore"`
	PTTotal     float64 `json:"ptTotal"`
	QAScore     float64 `json:"qaScore"`
	QATotal     float64 `json:"qaTotal"`
}

func (h *GradeHandler) CalculateQuarterGrade(w http.ResponseWriter, r *http.Request) {
	var req calculateGradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	weights := models.GetDO8GradingWeights(req.GradeLevel, req.SubjectCode, models.Strand(req.Strand))

	var psWW, psPT, psQA float64
	if req.WWTotal > 0 {
		psWW = math.Round((req.WWScore/req.WWTotal)*10000) / 100
	}
	if req.PTTotal > 0 {
		psPT = math.Round((req.PTScore/req.PTTotal)*10000) / 100
	}
	if req.QATotal > 0 {
		psQA = math.Round((req.QAScore/req.QATotal)*10000) / 100
	}

	wsWW := math.Round(psWW*(float64(weights.WrittenWork)/100.0)*100) / 100
	wsPT := math.Round(psPT*(float64(weights.PerformanceTask)/100.0)*100) / 100
	wsQA := math.Round(psQA*(float64(weights.QuarterlyAssessment)/100.0)*100) / 100

	initialGrade := math.Round((wsWW+wsPT+wsQA)*100) / 100
	transmutedGrade := models.TransmuteInitialGrade(initialGrade)
	descriptor := models.GradeDescriptor(transmutedGrade)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"weights": weights,
		"breakdown": map[string]interface{}{
			"writtenWork": map[string]interface{}{
				"score":  req.WWScore,
				"total":  req.WWTotal,
				"ps":     psWW,
				"ws":     wsWW,
				"weight": weights.WrittenWork,
			},
			"performanceTask": map[string]interface{}{
				"score":  req.PTScore,
				"total":  req.PTTotal,
				"ps":     psPT,
				"ws":     wsPT,
				"weight": weights.PerformanceTask,
			},
			"quarterlyAssessment": map[string]interface{}{
				"score":  req.QAScore,
				"total":  req.QATotal,
				"ps":     psQA,
				"ws":     wsQA,
				"weight": weights.QuarterlyAssessment,
			},
		},
		"initialGrade":    initialGrade,
		"transmutedGrade": transmutedGrade,
		"descriptor":      descriptor,
		"passed":          transmutedGrade >= 75.0,
	})
}

// ── GetSectionSheet ────────────────────────────────────────────────────────────
// Query: subjectCode (required), schoolYear (optional)
func (h *GradeHandler) GetSectionSheet(w http.ResponseWriter, r *http.Request) {
	sectionID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "sectionId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid sectionId")
		return
	}

	subjectCode := strings.TrimSpace(r.URL.Query().Get("subjectCode"))
	if subjectCode == "" {
		writeError(w, http.StatusBadRequest, "subjectCode is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// 1. Fetch section details
	var section models.Section
	if err := h.Sections.FindOne(ctx, bson.M{"_id": sectionID}).Decode(&section); err != nil {
		writeError(w, http.StatusNotFound, "section not found")
		return
	}

	schoolYear := r.URL.Query().Get("schoolYear")
	if schoolYear == "" {
		schoolYear = section.SchoolYear
	}

	// 2. Fetch all students in this section (sorted by last_name, first_name)
	studentCursor, err := h.Students.Find(ctx,
		bson.M{"section_id": sectionID},
		options.Find().
			SetProjection(bson.M{
				"_id": 1, "lrn": 1, "first_name": 1, "last_name": 1, "middle_name": 1, "sex": 1,
			}).
			SetSort(bson.D{
				{Key: "sex", Value: -1}, // Male first, then Female
				{Key: "last_name", Value: 1},
				{Key: "first_name", Value: 1},
			}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query section students")
		return
	}
	defer studentCursor.Close(ctx)

	var students []models.StudentSummary
	if err := studentCursor.All(ctx, &students); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode students")
		return
	}
	if students == nil {
		students = []models.StudentSummary{}
	}

	// 3. Fetch existing grade records for this section & subject
	gradeCursor, err := h.Grades.Find(ctx, bson.M{
		"section_id":   sectionID,
		"subject_code": subjectCode,
		"school_year":  schoolYear,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query grades")
		return
	}
	defer gradeCursor.Close(ctx)

	var gradeRecords []models.GradeRecord
	if err := gradeCursor.All(ctx, &gradeRecords); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode grades")
		return
	}

	gradeMap := make(map[string]models.GradeRecord)
	for _, g := range gradeRecords {
		gradeMap[g.StudentID.Hex()] = g
	}

	// 4. Calculate class quarter averages
	var sumQ1, sumQ2, sumQ3, sumQ4, sumFinal float64
	var countQ1, countQ2, countQ3, countQ4, countFinal, passedCount, failedCount int

	for _, g := range gradeRecords {
		if g.Q1 != nil {
			sumQ1 += *g.Q1
			countQ1++
		}
		if g.Q2 != nil {
			sumQ2 += *g.Q2
			countQ2++
		}
		if g.Q3 != nil {
			sumQ3 += *g.Q3
			countQ3++
		}
		if g.Q4 != nil {
			sumQ4 += *g.Q4
			countQ4++
		}
		if g.FinalGrade != nil {
			sumFinal += *g.FinalGrade
			countFinal++
			if *g.FinalGrade >= 75.0 {
				passedCount++
			} else {
				failedCount++
			}
		}
	}

	stats := map[string]interface{}{
		"avgQ1":       roundOrZero(sumQ1, countQ1),
		"avgQ2":       roundOrZero(sumQ2, countQ2),
		"avgQ3":       roundOrZero(sumQ3, countQ3),
		"avgQ4":       roundOrZero(sumQ4, countQ4),
		"avgFinal":    roundOrZero(sumFinal, countFinal),
		"passedCount": passedCount,
		"failedCount": failedCount,
		"totalCount":  len(students),
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"section":     section,
		"subjectCode": subjectCode,
		"schoolYear":  schoolYear,
		"students":    students,
		"grades":      gradeMap,
		"stats":       stats,
	})
}

func roundOrZero(sum float64, count int) float64 {
	if count == 0 {
		return 0
	}
	return math.Round((sum/float64(count))*10) / 10
}

// ── BatchSaveQuarter ───────────────────────────────────────────────────────────
type batchQuarterEntry struct {
	StudentID string   `json:"studentId"`
	Grade     *float64 `json:"grade"`
}

type batchQuarterRequest struct {
	SectionID   string              `json:"sectionId"`
	SubjectCode string              `json:"subjectCode"`
	SubjectName string              `json:"subjectName"`
	SchoolYear  string              `json:"schoolYear"`
	GradeLevel  int                 `json:"gradeLevel"`
	Quarter     string              `json:"quarter"` // "q1", "q2", "q3", "q4"
	Entries     []batchQuarterEntry `json:"entries"`
}

func (h *GradeHandler) BatchSaveQuarter(w http.ResponseWriter, r *http.Request) {
	var req batchQuarterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Quarter = strings.ToLower(strings.TrimSpace(req.Quarter))
	if req.Quarter != "q1" && req.Quarter != "q2" && req.Quarter != "q3" && req.Quarter != "q4" {
		writeError(w, http.StatusBadRequest, "quarter must be 'q1', 'q2', 'q3', or 'q4'")
		return
	}

	secID, err := primitive.ObjectIDFromHex(req.SectionID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid sectionId")
		return
	}

	if req.SubjectCode == "" || len(req.Entries) == 0 {
		writeError(w, http.StatusBadRequest, "subjectCode and entries are required")
		return
	}

	encoderID := callerID(r)
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	now := time.Now()

	// Process each student entry
	for _, entry := range req.Entries {
		sid, err := primitive.ObjectIDFromHex(entry.StudentID)
		if err != nil {
			continue
		}

		// Find existing grade record or initialize
		var gr models.GradeRecord
		err = h.Grades.FindOne(ctx, bson.M{
			"student_id":   sid,
			"subject_code": req.SubjectCode,
			"school_year":  req.SchoolYear,
		}).Decode(&gr)

		if err != nil {
			// New record
			gr = models.GradeRecord{
				ID:          primitive.NewObjectID(),
				StudentID:   sid,
				SectionID:   secID,
				SchoolYear:  req.SchoolYear,
				GradeLevel:  req.GradeLevel,
				SubjectCode: req.SubjectCode,
				SubjectName: req.SubjectName,
				EncodedBy:   encoderID,
				CreatedAt:   now,
				UpdatedAt:   now,
			}
		}

		// Set the appropriate quarter
		switch req.Quarter {
		case "q1":
			gr.Q1 = entry.Grade
		case "q2":
			gr.Q2 = entry.Grade
		case "q3":
			gr.Q3 = entry.Grade
		case "q4":
			gr.Q4 = entry.Grade
		}

		// Compute final grade and remarks
		gr.ComputeFinalRating()
		gr.UpdatedAt = now
		gr.EncodedBy = encoderID

		// Upsert
		opts := options.Update().SetUpsert(true)
		_, _ = h.Grades.UpdateOne(ctx,
			bson.M{
				"student_id":   sid,
				"subject_code": req.SubjectCode,
				"school_year":  req.SchoolYear,
			},
			bson.M{"$set": gr},
			opts,
		)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "saved",
		"quarter": req.Quarter,
		"total":   len(req.Entries),
	})
}

// ── GetStudentSF9 ──────────────────────────────────────────────────────────────
// Generates official DepEd Form 9 (Learner Progress Report Card).
// Query: schoolYear (optional)
func (h *GradeHandler) GetStudentSF9(w http.ResponseWriter, r *http.Request) {
	studentID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "studentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid studentId")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// 1. Fetch Student
	var student models.Student
	if err := h.Students.FindOne(ctx, bson.M{"_id": studentID}).Decode(&student); err != nil {
		writeError(w, http.StatusNotFound, "student not found")
		return
	}

	schoolYear := r.URL.Query().Get("schoolYear")
	if schoolYear == "" {
		schoolYear = student.SchoolYear
	}
	if schoolYear == "" {
		schoolYear = "2024-2025"
	}

	// 2. Fetch Section (if student has section_id)
	var sectionWithAdviser models.SectionWithAdviser
	if !student.SectionID.IsZero() {
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"_id": student.SectionID}}},
			{{Key: "$lookup", Value: bson.M{
				"from":         "users",
				"localField":   "adviser_id",
				"foreignField": "_id",
				"as":           "adviser",
				"pipeline": bson.A{
					bson.M{"$project": bson.M{"_id": 1, "first_name": 1, "last_name": 1, "email": 1}},
				},
			}}},
			{{Key: "$unwind", Value: bson.M{"path": "$adviser", "preserveNullAndEmptyArrays": true}}},
		}
		cursor, _ := h.Sections.Aggregate(ctx, pipeline)
		var secResults []models.SectionWithAdviser
		if cursor != nil {
			_ = cursor.All(ctx, &secResults)
			if len(secResults) > 0 {
				sectionWithAdviser = secResults[0]
			}
		}
	}

	// 3. Fetch Grades for this student and school year
	gradeCursor, err := h.Grades.Find(ctx,
		bson.M{"student_id": studentID, "school_year": schoolYear},
		options.Find().SetSort(bson.D{{Key: "subject_code", Value: 1}}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query student grades")
		return
	}
	defer gradeCursor.Close(ctx)

	var grades []models.GradeRecord
	_ = gradeCursor.All(ctx, &grades)
	if grades == nil {
		grades = []models.GradeRecord{}
	}

	// 4. Calculate General Average across all subjects
	var sumFinal float64
	var countFinal int
	for _, g := range grades {
		if g.FinalGrade != nil {
			sumFinal += *g.FinalGrade
			countFinal++
		}
	}

	var genAvg *float64
	var descriptor, remarks string
	if countFinal > 0 {
		avg := math.Round((sumFinal/float64(countFinal))*100) / 100
		genAvg = &avg
		descriptor = models.GradeDescriptor(avg)
		if avg >= 75.0 {
			remarks = "Promoted"
		} else {
			remarks = "Retained"
		}
	}

	// 5. Fetch Attendance summary for SF9 Part C
	attendanceSum := models.AttendanceSummary{
		StudentID: studentID,
	}
	attPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"student_id": studentID, "school_year": schoolYear}}},
		{{Key: "$group", Value: bson.M{
			"_id":     "$student_id",
			"present": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "present"}}, 1, 0}}},
			"absent":  bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "absent"}}, 1, 0}}},
			"late":    bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "late"}}, 1, 0}}},
			"excused": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "excused"}}, 1, 0}}},
			"total":   bson.M{"$sum": 1},
		}}},
	}
	attCursor, _ := h.Attendance.Aggregate(ctx, attPipeline)
	if attCursor != nil {
		var attRows []struct {
			Present int `bson:"present"`
			Absent  int `bson:"absent"`
			Late    int `bson:"late"`
			Excused int `bson:"excused"`
			Total   int `bson:"total"`
		}
		_ = attCursor.All(ctx, &attRows)
		if len(attRows) > 0 {
			r := attRows[0]
			attendanceSum.Present = r.Present
			attendanceSum.Absent = r.Absent
			attendanceSum.Late = r.Late
			attendanceSum.Excused = r.Excused
			attendanceSum.Total = r.Total
		}
	}

	sf9 := models.LearnerSF9{
		Student:        student,
		Section:        sectionWithAdviser,
		SchoolYear:     schoolYear,
		GradeLevel:     int(student.GradeLevel),
		Grades:         grades,
		GeneralAverage: genAvg,
		Descriptor:     descriptor,
		Remarks:        remarks,
		Attendance:     attendanceSum,
	}

	writeJSON(w, http.StatusOK, sf9)
}

// ── UpdateGrade ────────────────────────────────────────────────────────────────
type updateGradeRequest struct {
	Q1 *float64 `json:"q1"`
	Q2 *float64 `json:"q2"`
	Q3 *float64 `json:"q3"`
	Q4 *float64 `json:"q4"`
}

func (h *GradeHandler) UpdateGrade(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid grade id")
		return
	}

	var req updateGradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var gr models.GradeRecord
	if err := h.Grades.FindOne(ctx, bson.M{"_id": id}).Decode(&gr); err != nil {
		writeError(w, http.StatusNotFound, "grade record not found")
		return
	}

	gr.Q1 = req.Q1
	gr.Q2 = req.Q2
	gr.Q3 = req.Q3
	gr.Q4 = req.Q4
	gr.ComputeFinalRating()
	gr.UpdatedAt = time.Now()
	gr.EncodedBy = callerID(r)

	_, err = h.Grades.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": gr})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update grade record")
		return
	}

	writeJSON(w, http.StatusOK, gr)
}
