package handlers

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"regexp"
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

var lrnRegex = regexp.MustCompile(`^[0-9]{12}$`)

// AdmissionHandler handles public learner applications and registrar approvals.
type AdmissionHandler struct {
	Admissions  *mongo.Collection
	Students    *mongo.Collection
	Enrollments *mongo.Collection
	Sections    *mongo.Collection
}

func NewAdmissionHandler(db *mongo.Database) *AdmissionHandler {
	return &AdmissionHandler{
		Admissions:  db.Collection("admissions"),
		Students:    db.Collection("students"),
		Enrollments: db.Collection("enrollments"),
		Sections:    db.Collection("sections"),
	}
}

// Routes returns the subrouter mounted at /admissions.
func (h *AdmissionHandler) Routes() chi.Router {
	r := chi.NewRouter()
	// Public
	r.Post("/apply", h.Apply)

	// Protected routes mounted in routes.go for registrars/admins
	return r
}

// AdminRoutes returns protected routes for registrar / admin review.
func (h *AdmissionHandler) AdminRoutes() chi.Router {
	r := chi.NewRouter()
	r.Get("/",              h.List)
	r.Get("/{id}",          h.Get)
	r.Patch("/{id}/status", h.UpdateStatus)
	r.Post("/{id}/approve", h.Approve)
	return r
}

type ApplyRequest struct {
	LRN              string                `json:"lrn"`
	HasLRN           bool                  `json:"hasLrn"`
	FirstName        string                `json:"firstName"`
	LastName         string                `json:"lastName"`
	MiddleName       string                `json:"middleName"`
	ExtName          string                `json:"extName"`
	BirthDate        string                `json:"birthDate"` // YYYY-MM-DD
	BirthPlace       string                `json:"birthPlace"`
	Sex              string                `json:"sex"`
	CivilStatus      string                `json:"civilStatus"`
	Religion         string                `json:"religion"`
	MotherTongue     string                `json:"motherTongue"`
	Nationality      string                `json:"nationality"`
	ContactNo        string                `json:"contactNo"`
	Email            string                `json:"email"`
	PSABirthCertNo   string                `json:"psaBirthCertNo"`
	Address          models.Address        `json:"address"`
	EnrollmentType   models.EnrollmentType `json:"enrollmentType"`
	TargetGradeLevel int                   `json:"targetGradeLevel"`
	Strand           models.Strand         `json:"strand"`
	Track            string                `json:"track"`
	PreviousSchool   string                `json:"previousSchool"`
	PreviousSchoolID string                `json:"previousSchoolId"`
	SchoolYear       string                `json:"schoolYear"`
	Guardian         models.Guardian       `json:"guardian"`
}

func generateAppNumber() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(90000))
	num := n.Int64() + 10000
	return fmt.Sprintf("APP-%d-%d", time.Now().Year(), num)
}

// Apply handles public learner registration submissions (No auth required).
func (h *AdmissionHandler) Apply(w http.ResponseWriter, r *http.Request) {
	var req ApplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.Sex = strings.TrimSpace(req.Sex)
	if req.FirstName == "" || req.LastName == "" || req.Sex == "" {
		writeError(w, http.StatusBadRequest, "first name, last name, and sex are required")
		return
	}

	if req.HasLRN {
		req.LRN = strings.TrimSpace(req.LRN)
		if !lrnRegex.MatchString(req.LRN) {
			writeError(w, http.StatusBadRequest, "LRN must be exactly 12 digits")
			return
		}
	} else {
		req.LRN = ""
	}

	bDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.BirthDate))
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid birthDate (YYYY-MM-DD) is required")
		return
	}

	if req.TargetGradeLevel < 7 || req.TargetGradeLevel > 12 {
		writeError(w, http.StatusBadRequest, "targetGradeLevel must be between 7 and 12")
		return
	}

	if req.TargetGradeLevel >= 11 && req.Strand == "" {
		writeError(w, http.StatusBadRequest, "SHS strand selection is required for Grade 11 and 12")
		return
	}

	if strings.TrimSpace(req.Guardian.Name) == "" || strings.TrimSpace(req.Guardian.ContactNo) == "" {
		writeError(w, http.StatusBadRequest, "guardian name and emergency contact number are required")
		return
	}

	sy := strings.TrimSpace(req.SchoolYear)
	if sy == "" {
		sy = "2025-2026"
	}

	eType := req.EnrollmentType
	if eType == "" {
		if req.TargetGradeLevel == 7 {
			eType = models.EnrollmentTypeNew
		} else {
			eType = models.EnrollmentTypeTransferee
		}
	}

	now := time.Now()
	app := models.AdmissionApplication{
		ID:               primitive.NewObjectID(),
		ApplicationNo:    generateAppNumber(),
		LRN:              req.LRN,
		HasLRN:           req.HasLRN,
		FirstName:        req.FirstName,
		LastName:         req.LastName,
		MiddleName:       strings.TrimSpace(req.MiddleName),
		ExtName:          strings.TrimSpace(req.ExtName),
		BirthDate:        bDate,
		BirthPlace:       strings.TrimSpace(req.BirthPlace),
		Sex:              req.Sex,
		CivilStatus:      strings.TrimSpace(req.CivilStatus),
		Religion:         strings.TrimSpace(req.Religion),
		MotherTongue:     strings.TrimSpace(req.MotherTongue),
		Nationality:      strings.TrimSpace(req.Nationality),
		ContactNo:        strings.TrimSpace(req.ContactNo),
		Email:            strings.TrimSpace(req.Email),
		PSABirthCertNo:   strings.TrimSpace(req.PSABirthCertNo),
		Address:          req.Address,
		EnrollmentType:   eType,
		TargetGradeLevel: models.GradeLevel(req.TargetGradeLevel),
		Strand:           req.Strand,
		Track:            strings.TrimSpace(req.Track),
		PreviousSchool:   strings.TrimSpace(req.PreviousSchool),
		PreviousSchoolID: strings.TrimSpace(req.PreviousSchoolID),
		SchoolYear:       sy,
		Guardian:         req.Guardian,
		Status:           models.ApplicationSubmitted,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if _, err := h.Admissions.InsertOne(ctx, app); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to submit enrollment application")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"status":        "submitted",
		"applicationNo": app.ApplicationNo,
		"applicationId": app.ID.Hex(),
		"message":       "Your enrollment application has been successfully submitted to the registrar.",
		"application":   app,
	})
}

// List returns admissions applications for registrar/admin review.
func (h *AdmissionHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := bson.M{}

	if st := q.Get("status"); st != "" {
		filter["status"] = st
	}
	if gl := q.Get("gradeLevel"); gl != "" {
		if n, err := strconv.Atoi(gl); err == nil {
			filter["target_grade_level"] = n
		}
	}
	if sy := q.Get("schoolYear"); sy != "" {
		filter["school_year"] = sy
	}
	if s := strings.TrimSpace(q.Get("search")); s != "" {
		filter["$or"] = bson.A{
			bson.M{"application_no": primitive.Regex{Pattern: s, Options: "i"}},
			bson.M{"first_name": primitive.Regex{Pattern: s, Options: "i"}},
			bson.M{"last_name": primitive.Regex{Pattern: s, Options: "i"}},
			bson.M{"lrn": primitive.Regex{Pattern: s, Options: "i"}},
		}
	}

	limit := int64(30)
	if l := q.Get("limit"); l != "" {
		if n, err := strconv.ParseInt(l, 10, 64); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	skip := int64(0)
	if sk := q.Get("skip"); sk != "" {
		if n, err := strconv.ParseInt(sk, 10, 64); err == nil && n >= 0 {
			skip = n
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	findOpts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit).
		SetSkip(skip)

	cur, err := h.Admissions.Find(ctx, filter, findOpts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query applications")
		return
	}
	defer cur.Close(ctx)

	var list []models.AdmissionApplication
	_ = cur.All(ctx, &list)
	if list == nil {
		list = []models.AdmissionApplication{}
	}

	total, _ := h.Admissions.CountDocuments(ctx, filter)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":  list,
		"total": total,
		"limit": limit,
		"skip":  skip,
	})
}

// Get returns single admission application details.
func (h *AdmissionHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var app models.AdmissionApplication
	if err := h.Admissions.FindOne(ctx, bson.M{"_id": id}).Decode(&app); err != nil {
		writeError(w, http.StatusNotFound, "application not found")
		return
	}

	writeJSON(w, http.StatusOK, app)
}

// UpdateStatus changes status to under_review or rejected with remarks.
func (h *AdmissionHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}

	var req struct {
		Status  models.ApplicationStatus `json:"status"`
		Remarks string                   `json:"remarks"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	reviewerID, _ := primitive.ObjectIDFromHex(claims["sub"].(string))
	now := time.Now()

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"status":         req.Status,
		"review_remarks": req.Remarks,
		"reviewed_by":    reviewerID,
		"reviewed_at":    now,
		"updated_at":     now,
	}

	res, err := h.Admissions.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	if err != nil || res.MatchedCount == 0 {
		writeError(w, http.StatusInternalServerError, "failed to update application")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": string(req.Status)})
}

type ApproveAdmissionRequest struct {
	AssignedLRN string  `json:"assignedLrn,omitempty"`
	SectionID   *string `json:"sectionId,omitempty"`
	Remarks     string  `json:"remarks,omitempty"`
}

// Approve accepts the application and provisions the official Student and Enrollment records.
func (h *AdmissionHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}

	var req ApproveAdmissionRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	reviewerID, _ := primitive.ObjectIDFromHex(claims["sub"].(string))

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	var app models.AdmissionApplication
	if err := h.Admissions.FindOne(ctx, bson.M{"_id": id}).Decode(&app); err != nil {
		writeError(w, http.StatusNotFound, "application not found")
		return
	}

	if app.Status == models.ApplicationApproved {
		writeError(w, http.StatusBadRequest, "application is already approved")
		return
	}

	// Determine final LRN
	finalLRN := app.LRN
	if strings.TrimSpace(req.AssignedLRN) != "" {
		finalLRN = strings.TrimSpace(req.AssignedLRN)
	}
	if finalLRN == "" {
		// Generate 12-digit provisional LRN
		n, _ := rand.Int(rand.Reader, big.NewInt(900000000000))
		finalLRN = fmt.Sprintf("%012d", n.Int64()+100000000000)
	}

	if !lrnRegex.MatchString(finalLRN) {
		writeError(w, http.StatusBadRequest, "invalid LRN: must be 12 digits")
		return
	}

	var sectionOID *primitive.ObjectID
	if req.SectionID != nil && *req.SectionID != "" {
		if oid, err := primitive.ObjectIDFromHex(*req.SectionID); err == nil {
			sectionOID = &oid
		}
	}

	now := time.Now()

	// 1. Create or link Student record
	var existingStudent models.Student
	err = h.Students.FindOne(ctx, bson.M{"lrn": finalLRN}).Decode(&existingStudent)

	studentID := primitive.NewObjectID()
	if err == nil {
		// Student with LRN exists, update their record
		studentID = existingStudent.ID
		studentUpdate := bson.M{
			"grade_level": app.TargetGradeLevel,
			"school_year": app.SchoolYear,
			"status":      models.StatusEnrolled,
			"updated_at":  now,
		}
		if app.Strand != "" {
			studentUpdate["strand"] = app.Strand
		}
		if sectionOID != nil {
			studentUpdate["section_id"] = *sectionOID
		}
		_, _ = h.Students.UpdateOne(ctx, bson.M{"_id": studentID}, bson.M{"$set": studentUpdate})
	} else {
		// Create new student record
		newStudent := models.Student{
			ID:           studentID,
			LRN:          finalLRN,
			FirstName:    app.FirstName,
			LastName:     app.LastName,
			MiddleName:   app.MiddleName,
			ExtName:      app.ExtName,
			BirthDate:    app.BirthDate,
			BirthPlace:   app.BirthPlace,
			Sex:          app.Sex,
			CivilStatus:  app.CivilStatus,
			Religion:     app.Religion,
			MotherTongue: app.MotherTongue,
			Nationality:  app.Nationality,
			ContactNo:    app.ContactNo,
			Email:        app.Email,
			Address:      app.Address,
			GradeLevel:   app.TargetGradeLevel,
			Strand:       app.Strand,
			Track:        app.Track,
			SchoolYear:   app.SchoolYear,
			Status:       models.StatusEnrolled,
			Guardian:     app.Guardian,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		if sectionOID != nil {
			newStudent.SectionID = *sectionOID
		}
		if _, err := h.Students.InsertOne(ctx, newStudent); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create student record")
			return
		}
	}

	// 2. Create official Enrollment record
	enrollment := models.Enrollment{
		ID:          primitive.NewObjectID(),
		StudentID:   studentID,
		SchoolYear:  app.SchoolYear,
		GradeLevel:  app.TargetGradeLevel,
		Strand:      app.Strand,
		Track:       app.Track,
		Type:        app.EnrollmentType,
		Status:      models.EnrollmentApproved,
		Remarks:     req.Remarks,
		ProcessedBy: reviewerID,
		ProcessedAt: &now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if sectionOID != nil {
		enrollment.SectionID = *sectionOID
	}
	_, _ = h.Enrollments.InsertOne(ctx, enrollment)

	// 3. Mark Admission Application as Approved
	_, _ = h.Admissions.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{
		"status":             models.ApplicationApproved,
		"lrn":                finalLRN,
		"created_student_id": studentID,
		"reviewed_by":        reviewerID,
		"reviewed_at":        now,
		"review_remarks":     req.Remarks,
		"updated_at":         now,
	}})

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":       "approved",
		"studentId":    studentID.Hex(),
		"lrn":          finalLRN,
		"enrollmentId": enrollment.ID.Hex(),
		"message":      "Applicant successfully admitted and enrolled.",
	})
}
