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
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/deped-sms/backend/internal/middleware"
	"github.com/deped-sms/backend/internal/models"
)

// AttendanceHandler handles all attendance-related HTTP requests.
type AttendanceHandler struct {
	Attendance *mongo.Collection
	Students   *mongo.Collection
}

func NewAttendanceHandler(db *mongo.Database) *AttendanceHandler {
	return &AttendanceHandler{
		Attendance: db.Collection("attendance"),
		Students:   db.Collection("students"),
	}
}

// Routes returns the subrouter mounted at /attendance.
func (h *AttendanceHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/",                                 h.List)
	r.Post("/batch",                           h.BatchRecord)
	r.Get("/daily-report",                     h.DailyReport)
	r.Get("/absence-report",                   h.AbsenceReport)
	r.Get("/student/{studentId}/summary",      h.StudentSummary)
	r.Get("/student/{studentId}",              h.StudentHistory)
	r.Put("/{id}",                             h.Update)
	r.Delete("/{id}",                          h.Delete)
	return r
}

// ── helpers ────────────────────────────────────────────────────────────────────

// parseDate parses a YYYY-MM-DD string to UTC midnight time.Time.
func parseDate(s string) (time.Time, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
}

// callerID extracts the JWT subject as ObjectID.
func callerID(r *http.Request) primitive.ObjectID {
	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	if sub, ok := claims["sub"].(string); ok {
		id, _ := primitive.ObjectIDFromHex(sub)
		return id
	}
	return primitive.NilObjectID
}

// ── List ───────────────────────────────────────────────────────────────────────
// Query: studentId, date, dateFrom, dateTo, gradeLevel, status, type, schoolYear, limit, skip
func (h *AttendanceHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := bson.M{}

	if sid := q.Get("studentId"); sid != "" {
		if id, err := primitive.ObjectIDFromHex(sid); err == nil {
			filter["student_id"] = id
		}
	}
	if d := q.Get("date"); d != "" {
		if t, err := parseDate(d); err == nil {
			filter["date"] = t
		}
	} else {
		dateRange := bson.M{}
		if from := q.Get("dateFrom"); from != "" {
			if t, err := parseDate(from); err == nil {
				dateRange["$gte"] = t
			}
		}
		if to := q.Get("dateTo"); to != "" {
			if t, err := parseDate(to); err == nil {
				dateRange["$lte"] = t.Add(24*time.Hour - time.Second)
			}
		}
		if len(dateRange) > 0 {
			filter["date"] = dateRange
		}
	}
	if gl := q.Get("gradeLevel"); gl != "" {
		if n, err := strconv.Atoi(gl); err == nil {
			filter["grade_level"] = n
		}
	}
	if st := q.Get("status"); st != "" {
		filter["status"] = st
	}
	if t := q.Get("type"); t != "" {
		filter["type"] = t
	}
	if sy := q.Get("schoolYear"); sy != "" {
		filter["school_year"] = sy
	}

	limit := int64(200)
	skip  := int64(0)
	if l := q.Get("limit"); l != "" {
		if n, _ := strconv.ParseInt(l, 10, 64); n > 0 { limit = n }
	}
	if s := q.Get("skip"); s != "" {
		if n, _ := strconv.ParseInt(s, 10, 64); n >= 0 { skip = n }
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	total, _ := h.Attendance.CountDocuments(ctx, filter)

	pipeline := mongo.Pipeline{
		{{Key: "$match",  Value: filter}},
		{{Key: "$sort",   Value: bson.D{{Key: "date", Value: -1}, {Key: "created_at", Value: -1}}}},
		{{Key: "$skip",   Value: skip}},
		{{Key: "$limit",  Value: limit}},
		{{Key: "$lookup", Value: bson.M{
			"from": "students", "localField": "student_id",
			"foreignField": "_id", "as": "student",
			"pipeline": bson.A{bson.M{"$project": bson.M{
				"lrn": 1, "first_name": 1, "last_name": 1, "middle_name": 1, "sex": 1, "birth_date": 1,
			}}},
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$student", "preserveNullAndEmptyArrays": true}}},
	}

	cursor, err := h.Attendance.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch attendance")
		return
	}
	defer cursor.Close(ctx)

	var results []models.AttendanceWithStudent
	cursor.All(ctx, &results)
	if results == nil {
		results = []models.AttendanceWithStudent{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": results, "total": total})
}

// ── BatchRecord ────────────────────────────────────────────────────────────────
// Upserts attendance for multiple students on the same date.
type batchEntry struct {
	StudentID   string                 `json:"studentId"`
	Status      models.AttendanceStatus `json:"status"`
	Remarks     string                 `json:"remarks"`
}

type batchRecordRequest struct {
	Date        string               `json:"date"`       // YYYY-MM-DD
	GradeLevel  int                  `json:"gradeLevel"`
	SchoolYear  string               `json:"schoolYear"`
	Type        models.AttendanceType `json:"type"`
	SubjectName string               `json:"subjectName"`
	Records     []batchEntry         `json:"records"`
}

func (h *AttendanceHandler) BatchRecord(w http.ResponseWriter, r *http.Request) {
	var req batchRecordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Date == "" || len(req.Records) == 0 || req.GradeLevel == 0 || req.SchoolYear == "" {
		writeError(w, http.StatusBadRequest, "date, gradeLevel, schoolYear, and records are required")
		return
	}

	date, err := parseDate(req.Date)
	if err != nil {
		writeError(w, http.StatusBadRequest, "date must be YYYY-MM-DD")
		return
	}

	if req.Type == "" {
		req.Type = models.AttendanceTypeDaily
	}

	recorder := callerID(r)
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	validStatuses := map[models.AttendanceStatus]bool{
		models.AttendancePresent: true, models.AttendanceAbsent: true,
		models.AttendanceLate: true, models.AttendanceExcused: true,
	}

	var ops []mongo.WriteModel
	now := time.Now()

	for _, entry := range req.Records {
		sid, err := primitive.ObjectIDFromHex(entry.StudentID)
		if err != nil {
			continue
		}
		status := entry.Status
		if !validStatuses[status] {
			status = models.AttendancePresent
		}

		filter := bson.M{
			"student_id":  sid,
			"date":        date,
			"type":        req.Type,
		}
		if req.SubjectName != "" {
			filter["subject_name"] = req.SubjectName
		}

		update := bson.M{
			"$set": bson.M{
				"status":       status,
				"remarks":      entry.Remarks,
				"grade_level":  req.GradeLevel,
				"school_year":  req.SchoolYear,
				"type":         req.Type,
				"subject_name": req.SubjectName,
				"recorded_by":  recorder,
				"updated_at":   now,
			},
			"$setOnInsert": bson.M{
				"student_id": sid,
				"date":       date,
				"created_at": now,
			},
		}

		op := mongo.NewUpdateOneModel().
			SetFilter(filter).
			SetUpdate(update).
			SetUpsert(true)
		ops = append(ops, op)
	}

	if len(ops) == 0 {
		writeError(w, http.StatusBadRequest, "no valid records to process")
		return
	}

	result, err := h.Attendance.BulkWrite(ctx, ops, options.BulkWrite().SetOrdered(false))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save attendance")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"upserted": result.UpsertedCount,
		"modified": result.ModifiedCount,
		"total":    len(ops),
	})
}

// ── DailyReport ────────────────────────────────────────────────────────────────
// Returns attendance for all students at a given grade level on a specific date.
// Query: date (required), gradeLevel (required), schoolYear, type
func (h *AttendanceHandler) DailyReport(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	date, err := parseDate(q.Get("date"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "date (YYYY-MM-DD) is required")
		return
	}
	gl, err := strconv.Atoi(q.Get("gradeLevel"))
	if err != nil || gl < 7 || gl > 12 {
		writeError(w, http.StatusBadRequest, "gradeLevel (7-12) is required")
		return
	}

	filter := bson.M{
		"date":        date,
		"grade_level": gl,
	}
	if sy := q.Get("schoolYear"); sy != "" {
		filter["school_year"] = sy
	}
	if t := q.Get("type"); t != "" {
		filter["type"] = t
	} else {
		filter["type"] = models.AttendanceTypeDaily
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	// All students in this grade to detect who has no record yet
	studentCursor, err := h.Students.Find(ctx,
		bson.M{"grade_level": gl},
		options.Find().SetProjection(bson.M{
			"lrn": 1, "first_name": 1, "last_name": 1,
			"middle_name": 1, "sex": 1, "birth_date": 1,
		}).SetSort(bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch students")
		return
	}
	defer studentCursor.Close(ctx)

	var students []models.StudentSummary
	studentCursor.All(ctx, &students)

	// Existing records for this date
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$lookup", Value: bson.M{
			"from": "students", "localField": "student_id",
			"foreignField": "_id", "as": "student",
			"pipeline": bson.A{bson.M{"$project": bson.M{
				"lrn": 1, "first_name": 1, "last_name": 1, "middle_name": 1, "sex": 1, "birth_date": 1,
			}}},
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$student", "preserveNullAndEmptyArrays": true}}},
	}
	cursor, _ := h.Attendance.Aggregate(ctx, pipeline)
	var records []models.AttendanceWithStudent
	if cursor != nil {
		cursor.All(ctx, &records)
	}

	// Build a map of studentId → record
	recordMap := make(map[string]models.AttendanceWithStudent)
	for _, rec := range records {
		recordMap[rec.StudentID.Hex()] = rec
	}

	// Summary counts
	summary := map[string]int{"present": 0, "absent": 0, "late": 0, "excused": 0, "unrecorded": 0}
	for _, s := range students {
		rec, ok := recordMap[s.ID.Hex()]
		if !ok {
			summary["unrecorded"]++
		} else {
			summary[string(rec.Status)]++
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"date":       q.Get("date"),
		"gradeLevel": gl,
		"students":   students,
		"records":    recordMap,
		"summary":    summary,
	})
}

// ── StudentHistory ─────────────────────────────────────────────────────────────
// Returns all attendance records for a single student.
// Query: dateFrom, dateTo, type, schoolYear
func (h *AttendanceHandler) StudentHistory(w http.ResponseWriter, r *http.Request) {
	studentID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "studentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid studentId")
		return
	}

	filter := bson.M{"student_id": studentID}
	q := r.URL.Query()

	if sy := q.Get("schoolYear"); sy != "" {
		filter["school_year"] = sy
	}
	if t := q.Get("type"); t != "" {
		filter["type"] = t
	}
	dateRange := bson.M{}
	if from := q.Get("dateFrom"); from != "" {
		if t, err := parseDate(from); err == nil { dateRange["$gte"] = t }
	}
	if to := q.Get("dateTo"); to != "" {
		if t, err := parseDate(to); err == nil { dateRange["$lte"] = t.Add(24*time.Hour - time.Second) }
	}
	if len(dateRange) > 0 {
		filter["date"] = dateRange
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	cursor, err := h.Attendance.Find(ctx, filter,
		options.Find().SetSort(bson.D{{Key: "date", Value: 1}}))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer cursor.Close(ctx)

	var records []models.AttendanceRecord
	cursor.All(ctx, &records)
	if records == nil { records = []models.AttendanceRecord{} }

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": records, "total": len(records)})
}

// ── StudentSummary ─────────────────────────────────────────────────────────────
// Returns aggregated counts (present/absent/late/excused) for a student.
// Query: schoolYear, type, dateFrom, dateTo
func (h *AttendanceHandler) StudentSummary(w http.ResponseWriter, r *http.Request) {
	studentID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "studentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid studentId")
		return
	}

	filter := bson.M{"student_id": studentID}
	q := r.URL.Query()
	if sy := q.Get("schoolYear"); sy != "" { filter["school_year"] = sy }
	if t := q.Get("type"); t != ""         { filter["type"] = t }

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.M{
			"_id":     "$student_id",
			"present": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "present"}}, 1, 0}}},
			"absent":  bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "absent"}}, 1, 0}}},
			"late":    bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "late"}}, 1, 0}}},
			"excused": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "excused"}}, 1, 0}}},
			"total":   bson.M{"$sum": 1},
		}}},
	}

	cursor, err := h.Attendance.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer cursor.Close(ctx)

	type summaryRow struct {
		Present int `bson:"present" json:"present"`
		Absent  int `bson:"absent"  json:"absent"`
		Late    int `bson:"late"    json:"late"`
		Excused int `bson:"excused" json:"excused"`
		Total   int `bson:"total"   json:"total"`
	}
	var rows []summaryRow
	cursor.All(ctx, &rows)

	var sum summaryRow
	if len(rows) > 0 {
		sum = rows[0]
	}

	absenceRate := 0.0
	if sum.Total > 0 {
		absenceRate = float64(sum.Absent+sum.Late) / float64(sum.Total) * 100
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"studentId":   studentID.Hex(),
		"present":     sum.Present,
		"absent":      sum.Absent,
		"late":        sum.Late,
		"excused":     sum.Excused,
		"total":       sum.Total,
		"absenceRate": absenceRate,
	})
}

// ── AbsenceReport ─────────────────────────────────────────────────────────────
// Returns students sorted by absence count (highest first) for a school year.
// Query: schoolYear (required), gradeLevel, threshold (min absences, default 4)
func (h *AttendanceHandler) AbsenceReport(w http.ResponseWriter, r *http.Request) {
	q    := r.URL.Query()
	sy   := q.Get("schoolYear")
	if sy == "" {
		writeError(w, http.StatusBadRequest, "schoolYear is required")
		return
	}

	threshold := int64(4)
	if t := q.Get("threshold"); t != "" {
		if n, err := strconv.ParseInt(t, 10, 64); err == nil { threshold = n }
	}

	match := bson.M{"school_year": sy, "status": "absent"}
	if gl := q.Get("gradeLevel"); gl != "" {
		if n, err := strconv.Atoi(gl); err == nil {
			match["grade_level"] = n
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{
			"_id":         "$student_id",
			"absences":    bson.M{"$sum": 1},
			"grade_level": bson.M{"$first": "$grade_level"},
			"last_absent": bson.M{"$max": "$date"},
		}}},
		{{Key: "$match", Value: bson.M{"absences": bson.M{"$gte": threshold}}}},
		{{Key: "$sort",  Value: bson.D{{Key: "absences", Value: -1}}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "students", "localField": "_id",
			"foreignField": "_id", "as": "student",
			"pipeline": bson.A{bson.M{"$project": bson.M{
				"lrn": 1, "first_name": 1, "last_name": 1, "sex": 1,
			}}},
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$student", "preserveNullAndEmptyArrays": true}}},
	}

	cursor, err := h.Attendance.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate report")
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	cursor.All(ctx, &results)
	if results == nil { results = []bson.M{} }

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":      results,
		"threshold": threshold,
		"schoolYear": sy,
	})
}

// ── Update ─────────────────────────────────────────────────────────────────────
type updateAttendanceRequest struct {
	Status  models.AttendanceStatus `json:"status"`
	Remarks string                  `json:"remarks"`
}

func (h *AttendanceHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var req updateAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	valid := map[models.AttendanceStatus]bool{
		models.AttendancePresent: true, models.AttendanceAbsent: true,
		models.AttendanceLate: true, models.AttendanceExcused: true,
	}
	if !valid[req.Status] {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	after := options.After
	var updated models.AttendanceRecord
	err = h.Attendance.FindOneAndUpdate(ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{
			"status":      req.Status,
			"remarks":     req.Remarks,
			"recorded_by": callerID(r),
			"updated_at":  time.Now(),
		}},
		options.FindOneAndUpdate().SetReturnDocument(after),
	).Decode(&updated)
	if err != nil {
		if strings.Contains(err.Error(), "no documents") {
			writeError(w, http.StatusNotFound, "record not found")
		} else {
			writeError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// ── Delete ─────────────────────────────────────────────────────────────────────
func (h *AttendanceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.Attendance.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if res.DeletedCount == 0 {
		writeError(w, http.StatusNotFound, "record not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
