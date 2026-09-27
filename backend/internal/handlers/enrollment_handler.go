package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/deped-sms/backend/internal/middleware"
	"github.com/deped-sms/backend/internal/models"
)

// EnrollmentHandler handles enrollment-related HTTP requests.
type EnrollmentHandler struct {
	Enrollments *mongo.Collection
	Students    *mongo.Collection
}

func NewEnrollmentHandler(db *mongo.Database) *EnrollmentHandler {
	return &EnrollmentHandler{
		Enrollments: db.Collection("enrollments"),
		Students:    db.Collection("students"),
	}
}

// Routes returns a subrouter mounted at /enrollments.
func (h *EnrollmentHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/",            h.List)
	r.Post("/",           h.Create)
	r.Get("/summary",     h.Summary)
	r.Post("/promote",    h.BulkPromote)
	r.Get("/{id}",        h.Get)
	r.Patch("/{id}/approve", h.Approve)
	r.Patch("/{id}/reject",  h.Reject)
	r.Delete("/{id}",     h.Delete)
	return r
}

// ── List ───────────────────────────────────────────────────────────────────────
// Query: schoolYear, gradeLevel, status, type, search, limit, skip
func (h *EnrollmentHandler) List(w http.ResponseWriter, r *http.Request) {
	filter := bson.M{}
	if sy := r.URL.Query().Get("schoolYear"); sy != "" {
		filter["school_year"] = sy
	}
	if gl := r.URL.Query().Get("gradeLevel"); gl != "" {
		if n, err := strconv.Atoi(gl); err == nil {
			filter["grade_level"] = n
		}
	}
	if st := r.URL.Query().Get("status"); st != "" {
		filter["status"] = st
	}
	if t := r.URL.Query().Get("type"); t != "" {
		filter["type"] = t
	}

	limit := int64(100)
	skip  := int64(0)
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, _ := strconv.ParseInt(l, 10, 64); n > 0 {
			limit = n
		}
	}
	if s := r.URL.Query().Get("skip"); s != "" {
		if n, _ := strconv.ParseInt(s, 10, 64); n >= 0 {
			skip = n
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	total, _ := h.Enrollments.CountDocuments(ctx, filter)

	// Use aggregation to join student info
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$sort",  Value: bson.D{{Key: "created_at", Value: -1}}}},
		{{Key: "$skip",  Value: skip}},
		{{Key: "$limit", Value: limit}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "students",
			"localField":   "student_id",
			"foreignField": "_id",
			"as":           "student",
			"pipeline": bson.A{
				bson.M{"$project": bson.M{
					"lrn": 1, "first_name": 1, "last_name": 1,
					"middle_name": 1, "sex": 1, "birth_date": 1,
				}},
			},
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$student", "preserveNullAndEmptyArrays": true}}},
	}

	// Optional search by student name / LRN via $lookup filter
	if q := strings.TrimSpace(r.URL.Query().Get("search")); q != "" {
		pipeline = mongo.Pipeline{
			{{Key: "$lookup", Value: bson.M{
				"from":         "students",
				"localField":   "student_id",
				"foreignField": "_id",
				"as":           "student",
				"pipeline": bson.A{
					bson.M{"$project": bson.M{
						"lrn": 1, "first_name": 1, "last_name": 1,
						"middle_name": 1, "sex": 1, "birth_date": 1,
					}},
				},
			}}},
			{{Key: "$unwind", Value: bson.M{"path": "$student", "preserveNullAndEmptyArrays": true}}},
			{{Key: "$match", Value: bson.M{
				"$and": bson.A{
					filter,
					bson.M{"$or": bson.A{
						bson.M{"student.lrn":        primitive.Regex{Pattern: q, Options: "i"}},
						bson.M{"student.first_name": primitive.Regex{Pattern: q, Options: "i"}},
						bson.M{"student.last_name":  primitive.Regex{Pattern: q, Options: "i"}},
					}},
				},
			}}},
			{{Key: "$sort",  Value: bson.D{{Key: "created_at", Value: -1}}}},
			{{Key: "$skip",  Value: skip}},
			{{Key: "$limit", Value: limit}},
		}
	}

	cursor, err := h.Enrollments.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch enrollments")
		return
	}
	defer cursor.Close(ctx)

	var results []models.EnrollmentWithStudent
	if err := cursor.All(ctx, &results); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode enrollments")
		return
	}
	if results == nil {
		results = []models.EnrollmentWithStudent{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":  results,
		"total": total,
	})
}

// ── Create ─────────────────────────────────────────────────────────────────────
type createEnrollmentRequest struct {
	StudentID  string                 `json:"studentId"`
	SchoolYear string                 `json:"schoolYear"`
	GradeLevel int                    `json:"gradeLevel"`
	Strand     models.Strand          `json:"strand"`
	Track      string                 `json:"track"`
	Type       models.EnrollmentType  `json:"type"`
	Remarks    string                 `json:"remarks"`
}

func (h *EnrollmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createEnrollmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.StudentID == "" || req.SchoolYear == "" || req.GradeLevel == 0 {
		writeError(w, http.StatusBadRequest, "studentId, schoolYear, and gradeLevel are required")
		return
	}
	if req.GradeLevel < 7 || req.GradeLevel > 12 {
		writeError(w, http.StatusBadRequest, "gradeLevel must be 7–12")
		return
	}

	studentID, err := primitive.ObjectIDFromHex(req.StudentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid studentId")
		return
	}

	validTypes := map[models.EnrollmentType]bool{
		models.EnrollmentTypeNew: true, models.EnrollmentTypeReturning: true,
		models.EnrollmentTypeTransferee: true,
	}
	if !validTypes[req.Type] {
		req.Type = models.EnrollmentTypeReturning
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Ensure student exists
	count, _ := h.Students.CountDocuments(ctx, bson.M{"_id": studentID})
	if count == 0 {
		writeError(w, http.StatusNotFound, "student not found")
		return
	}

	// Prevent duplicate active enrollment for same student + school year
	existing, _ := h.Enrollments.CountDocuments(ctx, bson.M{
		"student_id":  studentID,
		"school_year": req.SchoolYear,
		"status":      bson.M{"$in": bson.A{"pending", "approved"}},
	})
	if existing > 0 {
		writeError(w, http.StatusConflict, "student already has an active enrollment for this school year")
		return
	}

	now := time.Now()
	enrollment := models.Enrollment{
		ID:         primitive.NewObjectID(),
		StudentID:  studentID,
		SchoolYear: req.SchoolYear,
		GradeLevel: models.GradeLevel(req.GradeLevel),
		Strand:     req.Strand,
		Track:      req.Track,
		Type:       req.Type,
		Status:     models.EnrollmentPending,
		Remarks:    req.Remarks,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if _, err := h.Enrollments.InsertOne(ctx, enrollment); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create enrollment")
		return
	}
	writeJSON(w, http.StatusCreated, enrollment)
}

// ── Get ────────────────────────────────────────────────────────────────────────
func (h *EnrollmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"_id": id}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "students", "localField": "student_id",
			"foreignField": "_id", "as": "student",
			"pipeline": bson.A{bson.M{"$project": bson.M{
				"lrn": 1, "first_name": 1, "last_name": 1,
				"middle_name": 1, "sex": 1, "birth_date": 1,
			}}},
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$student", "preserveNullAndEmptyArrays": true}}},
	}

	cursor, err := h.Enrollments.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer cursor.Close(ctx)

	var results []models.EnrollmentWithStudent
	if err := cursor.All(ctx, &results); err != nil || len(results) == 0 {
		writeError(w, http.StatusNotFound, "enrollment not found")
		return
	}
	writeJSON(w, http.StatusOK, results[0])
}

// ── Approve ────────────────────────────────────────────────────────────────────
// Approving an enrollment also updates the student's gradeLevel, strand, track, and schoolYear.
func (h *EnrollmentHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	processorID, _ := primitive.ObjectIDFromHex(claims["sub"].(string))

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	var enrollment models.Enrollment
	if err := h.Enrollments.FindOne(ctx, bson.M{"_id": id}).Decode(&enrollment); err != nil {
		writeError(w, http.StatusNotFound, "enrollment not found")
		return
	}
	if enrollment.Status != models.EnrollmentPending {
		writeError(w, http.StatusBadRequest, "only pending enrollments can be approved")
		return
	}

	now := time.Now()

	// Update enrollment record
	_, err = h.Enrollments.UpdateOne(ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{
			"status":       models.EnrollmentApproved,
			"processed_by": processorID,
			"processed_at": now,
			"updated_at":   now,
		}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to approve enrollment")
		return
	}

	// Update student record: bump grade_level, strand, track, school_year, status
	studentUpdate := bson.M{
		"grade_level":  enrollment.GradeLevel,
		"school_year":  enrollment.SchoolYear,
		"status":       models.StatusEnrolled,
		"updated_at":   now,
	}
	if enrollment.Strand != "" {
		studentUpdate["strand"] = enrollment.Strand
	}
	if enrollment.Track != "" {
		studentUpdate["track"] = enrollment.Track
	}
	_, err = h.Students.UpdateOne(ctx,
		bson.M{"_id": enrollment.StudentID},
		bson.M{"$set": studentUpdate},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "enrollment approved but failed to update student record")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

// ── Reject ─────────────────────────────────────────────────────────────────────
type rejectRequest struct {
	Reason string `json:"reason"`
}

func (h *EnrollmentHandler) Reject(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var req rejectRequest
	json.NewDecoder(r.Body).Decode(&req) // optional body

	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	processorID, _ := primitive.ObjectIDFromHex(claims["sub"].(string))

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var enrollment models.Enrollment
	if err := h.Enrollments.FindOne(ctx, bson.M{"_id": id}).Decode(&enrollment); err != nil {
		writeError(w, http.StatusNotFound, "enrollment not found")
		return
	}
	if enrollment.Status != models.EnrollmentPending {
		writeError(w, http.StatusBadRequest, "only pending enrollments can be rejected")
		return
	}

	now := time.Now()
	_, err = h.Enrollments.UpdateOne(ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{
			"status":          models.EnrollmentRejected,
			"rejected_reason": req.Reason,
			"processed_by":    processorID,
			"processed_at":    now,
			"updated_at":      now,
		}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reject enrollment")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

// ── Delete ─────────────────────────────────────────────────────────────────────
func (h *EnrollmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var enrollment models.Enrollment
	if err := h.Enrollments.FindOne(ctx, bson.M{"_id": id}).Decode(&enrollment); err != nil {
		writeError(w, http.StatusNotFound, "enrollment not found")
		return
	}
	if enrollment.Status == models.EnrollmentApproved {
		writeError(w, http.StatusBadRequest, "approved enrollments cannot be deleted")
		return
	}

	h.Enrollments.DeleteOne(ctx, bson.M{"_id": id})
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// ── Summary ────────────────────────────────────────────────────────────────────
// Returns counts grouped by status for a given school year.
func (h *EnrollmentHandler) Summary(w http.ResponseWriter, r *http.Request) {
	sy := r.URL.Query().Get("schoolYear")
	filter := bson.M{}
	if sy != "" {
		filter["school_year"] = sy
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$status",
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := h.Enrollments.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to compute summary")
		return
	}
	defer cursor.Close(ctx)

	type row struct {
		Status string `bson:"_id" json:"status"`
		Count  int    `bson:"count" json:"count"`
	}
	var rows []row
	cursor.All(ctx, &rows)

	summary := map[string]int{"pending": 0, "approved": 0, "rejected": 0, "total": 0}
	for _, r := range rows {
		summary[r.Status] = r.Count
		summary["total"] += r.Count
	}

	// Also fetch grade level breakdown for approved
	glPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "approved", "school_year": func() interface{} {
			if sy != "" { return sy }; return bson.M{"$exists": true}
		}()}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$grade_level",
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	}
	glCursor, _ := h.Enrollments.Aggregate(ctx, glPipeline)
	type glRow struct {
		Grade int `bson:"_id" json:"grade"`
		Count int `bson:"count" json:"count"`
	}
	var gradeBreakdown []glRow
	if glCursor != nil {
		glCursor.All(ctx, &gradeBreakdown)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"summary":        summary,
		"gradeBreakdown": gradeBreakdown,
	})
}

// ── BulkPromote ────────────────────────────────────────────────────────────────
// Promotes all approved enrolled students from one school year to the next.
// For Grade 10 → 11 a strand is required.
type bulkPromoteRequest struct {
	FromSchoolYear string        `json:"fromSchoolYear"`
	ToSchoolYear   string        `json:"toSchoolYear"`
	GradeLevel     int           `json:"gradeLevel"` // source grade (7-11); 12 → graduated
	Strand         models.Strand `json:"strand"`     // required when GradeLevel == 10
	Track          string        `json:"track"`
}

func (h *EnrollmentHandler) BulkPromote(w http.ResponseWriter, r *http.Request) {
	var req bulkPromoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.FromSchoolYear == "" || req.ToSchoolYear == "" || req.GradeLevel == 0 {
		writeError(w, http.StatusBadRequest, "fromSchoolYear, toSchoolYear, and gradeLevel are required")
		return
	}
	if req.GradeLevel < 7 || req.GradeLevel > 12 {
		writeError(w, http.StatusBadRequest, "gradeLevel must be 7–12")
		return
	}
	if req.GradeLevel == 10 && req.Strand == "" {
		writeError(w, http.StatusBadRequest, "strand is required when promoting Grade 10 → Grade 11")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Find all approved enrollments for the source grade + school year
	cursor, err := h.Enrollments.Find(ctx, bson.M{
		"school_year": req.FromSchoolYear,
		"grade_level": req.GradeLevel,
		"status":      models.EnrollmentApproved,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch enrollments")
		return
	}
	defer cursor.Close(ctx)

	var source []models.Enrollment
	cursor.All(ctx, &source)

	if len(source) == 0 {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"promoted": 0,
			"message":  "no approved enrollments found for the given grade and school year",
		})
		return
	}

	nextGrade := models.GradeLevel(req.GradeLevel + 1)
	isGrad    := req.GradeLevel == 12

	var newEnrollments []interface{}
	now := time.Now()

	for _, e := range source {
		// Skip if already has an enrollment for the target year
		count, _ := h.Enrollments.CountDocuments(ctx, bson.M{
			"student_id":  e.StudentID,
			"school_year": req.ToSchoolYear,
			"status":      bson.M{"$in": bson.A{"pending", "approved"}},
		})
		if count > 0 {
			continue
		}

		if isGrad {
			// Mark student as graduated instead
			h.Students.UpdateOne(ctx,
				bson.M{"_id": e.StudentID},
				bson.M{"$set": bson.M{
					"status":     models.StatusGraduated,
					"updated_at": now,
				}},
			)
			continue
		}

		strand := e.Strand
		track  := e.Track
		if req.GradeLevel == 10 {
			strand = req.Strand
			track  = req.Track
		}

		newEnrollments = append(newEnrollments, models.Enrollment{
			ID:         primitive.NewObjectID(),
			StudentID:  e.StudentID,
			SchoolYear: req.ToSchoolYear,
			GradeLevel: nextGrade,
			Strand:     strand,
			Track:      track,
			Type:       models.EnrollmentTypePromotion,
			Status:     models.EnrollmentPending,
			CreatedAt:  now,
			UpdatedAt:  now,
		})
	}

	promoted := len(newEnrollments)
	if promoted > 0 {
		h.Enrollments.InsertMany(ctx, newEnrollments)
	}

	msg := "students promoted to Grade " + strconv.Itoa(req.GradeLevel+1)
	if isGrad {
		msg = "students marked as graduated"
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"promoted": promoted,
		"message":  msg,
	})
}
