package handlers

import (
	"context"
	"encoding/json"
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

// StudentHandler groups student-related HTTP handlers.
type StudentHandler struct {
	Collection *mongo.Collection
}

func NewStudentHandler(db *mongo.Database) *StudentHandler {
	return &StudentHandler{Collection: db.Collection("students")}
}

// Routes returns a subrouter mounted at /students.
func (h *StudentHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/",            h.List)
	r.Post("/",           h.Create)
	r.Get("/{id}",        h.Get)
	r.Put("/{id}",        h.Update)
	r.Patch("/{id}/status", h.SetStatus)
	r.Delete("/{id}",     h.Delete)
	return r
}

// ── List ───────────────────────────────────────────────────────────────────────
// Query params: gradeLevel, strand, status, search, limit, skip
func (h *StudentHandler) List(w http.ResponseWriter, r *http.Request) {
	filter := bson.M{}

	if gl := r.URL.Query().Get("gradeLevel"); gl != "" {
		if n, err := strconv.Atoi(gl); err == nil {
			filter["grade_level"] = n
		}
	}
	if strand := r.URL.Query().Get("strand"); strand != "" {
		filter["strand"] = strand
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = status
	}
	if sy := r.URL.Query().Get("schoolYear"); sy != "" {
		filter["school_year"] = sy
	}
	if q := strings.TrimSpace(r.URL.Query().Get("search")); q != "" {
		// Case-insensitive partial match on name or LRN
		filter["$or"] = bson.A{
			bson.M{"lrn":        primitive.Regex{Pattern: q, Options: "i"}},
			bson.M{"first_name": primitive.Regex{Pattern: q, Options: "i"}},
			bson.M{"last_name":  primitive.Regex{Pattern: q, Options: "i"}},
		}
	}

	limit := int64(100)
	skip  := int64(0)
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.ParseInt(l, 10, 64); err == nil && n > 0 {
			limit = n
		}
	}
	if s := r.URL.Query().Get("skip"); s != "" {
		if n, err := strconv.ParseInt(s, 10, 64); err == nil && n >= 0 {
			skip = n
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	total, _ := h.Collection.CountDocuments(ctx, filter)

	opts := options.Find().
		SetSort(bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}}).
		SetLimit(limit).
		SetSkip(skip)

	cursor, err := h.Collection.Find(ctx, filter, opts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch students")
		return
	}
	defer cursor.Close(ctx)

	var students []models.Student
	if err := cursor.All(ctx, &students); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode students")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":  students,
		"total": total,
	})
}

// ── Create ─────────────────────────────────────────────────────────────────────
type createStudentRequest struct {
	LRN          string               `json:"lrn"`
	FirstName    string               `json:"firstName"`
	LastName     string               `json:"lastName"`
	MiddleName   string               `json:"middleName"`
	ExtName      string               `json:"extName"`
	BirthDate    string               `json:"birthDate"` // ISO 8601 date string
	BirthPlace   string               `json:"birthPlace"`
	Sex          string               `json:"sex"`
	CivilStatus  string               `json:"civilStatus"`
	Religion     string               `json:"religion"`
	MotherTongue string               `json:"motherTongue"`
	Nationality  string               `json:"nationality"`
	ContactNo    string               `json:"contactNo"`
	Email        string               `json:"email"`
	Address      models.Address       `json:"address"`
	GradeLevel   int                  `json:"gradeLevel"`
	Strand       models.Strand        `json:"strand"`
	Track        string               `json:"track"`
	SchoolYear   string               `json:"schoolYear"`
	Remarks      string               `json:"remarks"`
	Guardian     models.Guardian      `json:"guardian"`
}

func (h *StudentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createStudentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Required field validation
	req.LRN = strings.TrimSpace(req.LRN)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName  = strings.TrimSpace(req.LastName)
	if req.LRN == "" || req.FirstName == "" || req.LastName == "" || req.BirthDate == "" || req.Sex == "" {
		writeError(w, http.StatusBadRequest, "lrn, firstName, lastName, birthDate, and sex are required")
		return
	}
	if !models.ValidateLRN(req.LRN) {
		writeError(w, http.StatusBadRequest, "LRN must be exactly 12 numeric digits")
		return
	}
	if req.GradeLevel < 7 || req.GradeLevel > 12 {
		writeError(w, http.StatusBadRequest, "gradeLevel must be 7–12")
		return
	}
	if req.Guardian.Name == "" || req.Guardian.ContactNo == "" {
		writeError(w, http.StatusBadRequest, "guardian name and contactNo are required")
		return
	}

	birthDate, err := time.Parse("2006-01-02", req.BirthDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "birthDate must be YYYY-MM-DD")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// LRN uniqueness check
	count, _ := h.Collection.CountDocuments(ctx, bson.M{"lrn": req.LRN})
	if count > 0 {
		writeError(w, http.StatusConflict, "a student with this LRN already exists")
		return
	}

	if req.SchoolYear == "" {
		year := time.Now().Year()
		req.SchoolYear = strconv.Itoa(year) + "-" + strconv.Itoa(year+1)
	}

	now := time.Now()
	student := models.Student{
		ID:           primitive.NewObjectID(),
		LRN:          req.LRN,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		MiddleName:   req.MiddleName,
		ExtName:      req.ExtName,
		BirthDate:    birthDate,
		BirthPlace:   req.BirthPlace,
		Sex:          req.Sex,
		CivilStatus:  req.CivilStatus,
		Religion:     req.Religion,
		MotherTongue: req.MotherTongue,
		Nationality:  req.Nationality,
		ContactNo:    req.ContactNo,
		Email:        req.Email,
		Address:      req.Address,
		GradeLevel:   models.GradeLevel(req.GradeLevel),
		Strand:       req.Strand,
		Track:        req.Track,
		SchoolYear:   req.SchoolYear,
		Status:       models.StatusEnrolled,
		Remarks:      req.Remarks,
		Guardian:     req.Guardian,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if _, err := h.Collection.InsertOne(ctx, student); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create student")
		return
	}
	writeJSON(w, http.StatusCreated, student)
}

// ── Get ────────────────────────────────────────────────────────────────────────
func (h *StudentHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var s models.Student
	if err := h.Collection.FindOne(ctx, bson.M{"_id": id}).Decode(&s); err != nil {
		if err == mongo.ErrNoDocuments {
			writeError(w, http.StatusNotFound, "student not found")
		} else {
			writeError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	writeJSON(w, http.StatusOK, s)
}

// ── Update ─────────────────────────────────────────────────────────────────────
func (h *StudentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Sanitize: never allow direct _id, status, or created_at overwrite
	for _, k := range []string{"_id", "status", "created_at", "lrn"} {
		delete(body, k)
	}

	// Handle birthDate string → time.Time
	if bd, ok := body["birthDate"].(string); ok {
		t, err := time.Parse("2006-01-02", bd)
		if err == nil {
			body["birth_date"] = t
		}
		delete(body, "birthDate")
	}

	// Map camelCase JSON keys to BSON snake_case
	fieldMap := map[string]string{
		"firstName": "first_name", "lastName": "last_name", "middleName": "middle_name",
		"extName": "ext_name", "birthPlace": "birth_place", "civilStatus": "civil_status",
		"motherTongue": "mother_tongue", "contactNo": "contact_no", "gradeLevel": "grade_level",
		"schoolYear": "school_year", "guardian": "guardian", "address": "address",
	}
	set := bson.M{"updated_at": time.Now()}
	for jsKey, bsonKey := range fieldMap {
		if v, ok := body[jsKey]; ok {
			set[bsonKey] = v
			delete(body, jsKey)
		}
	}
	for k, v := range body {
		set[k] = v
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	after := options.After
	var updated models.Student
	err = h.Collection.FindOneAndUpdate(ctx,
		bson.M{"_id": id},
		bson.M{"$set": set},
		options.FindOneAndUpdate().SetReturnDocument(after),
	).Decode(&updated)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			writeError(w, http.StatusNotFound, "student not found")
		} else {
			writeError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// ── SetStatus ──────────────────────────────────────────────────────────────────
type setStatusRequest struct {
	Status  models.EnrollmentStatus `json:"status"`
	Remarks string                  `json:"remarks"`
}

func (h *StudentHandler) SetStatus(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var req setStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	valid := map[models.EnrollmentStatus]bool{
		models.StatusEnrolled: true, models.StatusDropped: true,
		models.StatusTransferred: true, models.StatusGraduated: true,
	}
	if !valid[req.Status] {
		writeError(w, http.StatusBadRequest, "invalid status value")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	set := bson.M{"status": req.Status, "updated_at": time.Now()}
	if req.Remarks != "" {
		set["remarks"] = req.Remarks
	}

	_, err = h.Collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": string(req.Status)})
}

// ── Delete ─────────────────────────────────────────────────────────────────────
func (h *StudentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.Collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if res.DeletedCount == 0 {
		writeError(w, http.StatusNotFound, "student not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
