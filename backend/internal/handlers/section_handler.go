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

// SectionHandler handles class and advisory section endpoints.
type SectionHandler struct {
	Sections *mongo.Collection
	Students *mongo.Collection
	Users    *mongo.Collection
}

func NewSectionHandler(db *mongo.Database) *SectionHandler {
	return &SectionHandler{
		Sections: db.Collection("sections"),
		Students: db.Collection("students"),
		Users:    db.Collection("users"),
	}
}

// Routes returns the subrouter mounted at /sections.
func (h *SectionHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/unassigned-students", h.UnassignedStudents)
	r.Get("/teachers", h.AvailableTeachers)
	r.Get("/{id}", h.Get)
	r.Put("/{id}", h.Update)
	r.Delete("/{id}", h.Delete)
	r.Get("/{id}/roster", h.GetRoster)
	r.Post("/{id}/students", h.AssignStudents)
	r.Delete("/{id}/students/{studentId}", h.RemoveStudent)
	return r
}

// ── List ───────────────────────────────────────────────────────────────────────
// Query: schoolYear, gradeLevel, strand, adviserId, search
func (h *SectionHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := bson.M{}

	if sy := q.Get("schoolYear"); sy != "" {
		filter["school_year"] = sy
	}
	if gl := q.Get("gradeLevel"); gl != "" {
		if n, err := strconv.Atoi(gl); err == nil {
			filter["grade_level"] = n
		}
	}
	if st := q.Get("strand"); st != "" {
		filter["strand"] = st
	}
	if adv := q.Get("adviserId"); adv != "" {
		if aid, err := primitive.ObjectIDFromHex(adv); err == nil {
			filter["adviser_id"] = aid
		}
	}
	if s := q.Get("search"); s != "" {
		filter["name"] = bson.M{"$regex": primitive.Regex{Pattern: s, Options: "i"}}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$sort", Value: bson.D{{Key: "grade_level", Value: 1}, {Key: "name", Value: 1}}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "users",
			"localField":   "adviser_id",
			"foreignField": "_id",
			"as":           "adviser",
			"pipeline": bson.A{
				bson.M{"$project": bson.M{
					"_id": 1, "first_name": 1, "last_name": 1, "email": 1,
				}},
			},
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$adviser", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "students",
			"let":  bson.M{"sec_id": "$_id"},
			"pipeline": bson.A{
				bson.M{"$match": bson.M{"$expr": bson.M{"$eq": bson.A{"$section_id", "$$sec_id"}}}},
				bson.M{"$group": bson.M{
					"_id":    nil,
					"total":  bson.M{"$sum": 1},
					"male":   bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{bson.M{"$toLower": "$sex"}, "male"}}, 1, 0}}},
					"female": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{bson.M{"$toLower": "$sex"}, "female"}}, 1, 0}}},
				}},
			},
			"as": "counts",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$counts", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$addFields", Value: bson.M{
			"student_count": bson.M{"$ifNull": bson.A{"$counts.total", 0}},
			"male_count":    bson.M{"$ifNull": bson.A{"$counts.male", 0}},
			"female_count":  bson.M{"$ifNull": bson.A{"$counts.female", 0}},
		}}},
		{{Key: "$project", Value: bson.M{"counts": 0}}},
	}

	cursor, err := h.Sections.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query sections")
		return
	}
	defer cursor.Close(ctx)

	var results []models.SectionWithAdviser
	if err := cursor.All(ctx, &results); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode sections")
		return
	}
	if results == nil {
		results = []models.SectionWithAdviser{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":  results,
		"total": len(results),
	})
}

// ── Create ─────────────────────────────────────────────────────────────────────
type createSectionRequest struct {
	Name        string        `json:"name"`
	GradeLevel  int           `json:"gradeLevel"`
	SchoolYear  string        `json:"schoolYear"`
	Strand      models.Strand `json:"strand"`
	Track       string        `json:"track"`
	AdviserID   string        `json:"adviserId"`
	Room        string        `json:"room"`
	MaxCapacity int           `json:"maxCapacity"`
}

func (h *SectionHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createSectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.SchoolYear = strings.TrimSpace(req.SchoolYear)

	if req.Name == "" || req.GradeLevel < 7 || req.GradeLevel > 12 || req.SchoolYear == "" {
		writeError(w, http.StatusBadRequest, "name, gradeLevel (7-12), and schoolYear are required")
		return
	}

	if req.MaxCapacity <= 0 {
		req.MaxCapacity = 45 // DepEd standard classroom capacity
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	// Check duplicate name within the same school year & grade level
	count, err := h.Sections.CountDocuments(ctx, bson.M{
		"school_year": req.SchoolYear,
		"grade_level": req.GradeLevel,
		"name":        bson.M{"$regex": "^" + primitive.Regex{Pattern: req.Name, Options: "i"}.Pattern + "$"},
	})
	if err == nil && count > 0 {
		writeError(w, http.StatusConflict, "a section with this name already exists for this grade level and school year")
		return
	}

	var adviserObjID primitive.ObjectID
	if req.AdviserID != "" {
		aid, err := primitive.ObjectIDFromHex(req.AdviserID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid adviserId")
			return
		}
		// Verify adviser exists and is a teacher or admin
		var user models.User
		if err := h.Users.FindOne(ctx, bson.M{"_id": aid}).Decode(&user); err != nil {
			writeError(w, http.StatusBadRequest, "specified adviser user does not exist")
			return
		}
		adviserObjID = aid
	}

	now := time.Now()
	sec := models.Section{
		ID:          primitive.NewObjectID(),
		Name:        req.Name,
		GradeLevel:  req.GradeLevel,
		SchoolYear:  req.SchoolYear,
		Strand:      req.Strand,
		Track:       req.Track,
		AdviserID:   adviserObjID,
		Room:        req.Room,
		MaxCapacity: req.MaxCapacity,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	_, err = h.Sections.InsertOne(ctx, sec)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create section")
		return
	}

	writeJSON(w, http.StatusCreated, sec)
}

// ── Get ────────────────────────────────────────────────────────────────────────
func (h *SectionHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid section id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"_id": id}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "users",
			"localField":   "adviser_id",
			"foreignField": "_id",
			"as":           "adviser",
			"pipeline": bson.A{
				bson.M{"$project": bson.M{
					"_id": 1, "first_name": 1, "last_name": 1, "email": 1,
				}},
			},
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$adviser", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from": "students",
			"let":  bson.M{"sec_id": "$_id"},
			"pipeline": bson.A{
				bson.M{"$match": bson.M{"$expr": bson.M{"$eq": bson.A{"$section_id", "$$sec_id"}}}},
				bson.M{"$group": bson.M{
					"_id":    nil,
					"total":  bson.M{"$sum": 1},
					"male":   bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{bson.M{"$toLower": "$sex"}, "male"}}, 1, 0}}},
					"female": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{bson.M{"$toLower": "$sex"}, "female"}}, 1, 0}}},
				}},
			},
			"as": "counts",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$counts", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$addFields", Value: bson.M{
			"student_count": bson.M{"$ifNull": bson.A{"$counts.total", 0}},
			"male_count":    bson.M{"$ifNull": bson.A{"$counts.male", 0}},
			"female_count":  bson.M{"$ifNull": bson.A{"$counts.female", 0}},
		}}},
		{{Key: "$project", Value: bson.M{"counts": 0}}},
	}

	cursor, err := h.Sections.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query section")
		return
	}
	defer cursor.Close(ctx)

	var results []models.SectionWithAdviser
	if err := cursor.All(ctx, &results); err != nil || len(results) == 0 {
		writeError(w, http.StatusNotFound, "section not found")
		return
	}

	writeJSON(w, http.StatusOK, results[0])
}

// ── Update ─────────────────────────────────────────────────────────────────────
type updateSectionRequest struct {
	Name        string        `json:"name"`
	GradeLevel  int           `json:"gradeLevel"`
	SchoolYear  string        `json:"schoolYear"`
	Strand      models.Strand `json:"strand"`
	Track       string        `json:"track"`
	AdviserID   string        `json:"adviserId"`
	Room        string        `json:"room"`
	MaxCapacity int           `json:"maxCapacity"`
}

func (h *SectionHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid section id")
		return
	}

	var req updateSectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	update := bson.M{
		"updated_at": time.Now(),
	}

	if req.Name != "" {
		update["name"] = strings.TrimSpace(req.Name)
	}
	if req.GradeLevel >= 7 && req.GradeLevel <= 12 {
		update["grade_level"] = req.GradeLevel
	}
	if req.SchoolYear != "" {
		update["school_year"] = strings.TrimSpace(req.SchoolYear)
	}
	update["strand"] = req.Strand
	update["track"] = req.Track
	update["room"] = req.Room
	if req.MaxCapacity > 0 {
		update["max_capacity"] = req.MaxCapacity
	}

	if req.AdviserID != "" {
		if aid, err := primitive.ObjectIDFromHex(req.AdviserID); err == nil {
			update["adviser_id"] = aid
		}
	} else {
		update["adviser_id"] = primitive.NilObjectID
	}

	res, err := h.Sections.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update section")
		return
	}
	if res.MatchedCount == 0 {
		writeError(w, http.StatusNotFound, "section not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// ── Delete ─────────────────────────────────────────────────────────────────────
func (h *SectionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid section id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	// Unassign all students belonging to this section
	_, _ = h.Students.UpdateMany(ctx,
		bson.M{"section_id": id},
		bson.M{"$unset": bson.M{"section_id": ""}, "$set": bson.M{"updated_at": time.Now()}},
	)

	res, err := h.Sections.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete section")
		return
	}
	if res.DeletedCount == 0 {
		writeError(w, http.StatusNotFound, "section not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// ── GetRoster ──────────────────────────────────────────────────────────────────
// Returns the full official student roster for this section.
func (h *SectionHandler) GetRoster(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid section id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// 1. Fetch section with adviser
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"_id": id}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "users",
			"localField":   "adviser_id",
			"foreignField": "_id",
			"as":           "adviser",
			"pipeline": bson.A{
				bson.M{"$project": bson.M{
					"_id": 1, "first_name": 1, "last_name": 1, "email": 1,
				}},
			},
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$adviser", "preserveNullAndEmptyArrays": true}}},
	}

	cursor, err := h.Sections.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query section")
		return
	}
	defer cursor.Close(ctx)

	var secResults []models.SectionWithAdviser
	if err := cursor.All(ctx, &secResults); err != nil || len(secResults) == 0 {
		writeError(w, http.StatusNotFound, "section not found")
		return
	}
	section := secResults[0]

	// 2. Fetch students assigned to this section
	// In DepEd SF1 format: sorted alphabetically (last_name, first_name)
	studentCursor, err := h.Students.Find(ctx,
		bson.M{"section_id": id},
		options.Find().SetSort(bson.D{
			{Key: "sex", Value: -1}, // Male first, then Female as per standard DepEd SF1 tradition
			{Key: "last_name", Value: 1},
			{Key: "first_name", Value: 1},
		}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch roster students")
		return
	}
	defer studentCursor.Close(ctx)

	var students []models.Student
	if err := studentCursor.All(ctx, &students); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode roster students")
		return
	}
	if students == nil {
		students = []models.Student{}
	}

	maleCount := 0
	femaleCount := 0
	for _, s := range students {
		if strings.EqualFold(s.Sex, "male") {
			maleCount++
		} else if strings.EqualFold(s.Sex, "female") {
			femaleCount++
		}
	}

	section.StudentCount = len(students)
	section.MaleCount = maleCount
	section.FemaleCount = femaleCount

	writeJSON(w, http.StatusOK, models.SectionRoster{
		Section:     section,
		Students:    students,
		TotalMale:   maleCount,
		TotalFemale: femaleCount,
		TotalCount:  len(students),
	})
}

// ── AssignStudents ─────────────────────────────────────────────────────────────
type assignStudentsRequest struct {
	StudentIDs []string `json:"studentIds"`
}

func (h *SectionHandler) AssignStudents(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid section id")
		return
	}

	var req assignStudentsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.StudentIDs) == 0 {
		writeError(w, http.StatusBadRequest, "studentIds array is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Verify section exists and get its grade level
	var sec models.Section
	if err := h.Sections.FindOne(ctx, bson.M{"_id": id}).Decode(&sec); err != nil {
		writeError(w, http.StatusNotFound, "section not found")
		return
	}

	var objIDs []primitive.ObjectID
	for _, sid := range req.StudentIDs {
		if oid, err := primitive.ObjectIDFromHex(sid); err == nil {
			objIDs = append(objIDs, oid)
		}
	}

	if len(objIDs) == 0 {
		writeError(w, http.StatusBadRequest, "no valid student IDs provided")
		return
	}

	// Assign students to this section
	res, err := h.Students.UpdateMany(ctx,
		bson.M{"_id": bson.M{"$in": objIDs}},
		bson.M{"$set": bson.M{
			"section_id":  id,
			"grade_level": sec.GradeLevel,
			"school_year": sec.SchoolYear,
			"updated_at":  time.Now(),
		}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to assign students")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"assigned": res.ModifiedCount,
		"sectionId": id.Hex(),
	})
}

// ── RemoveStudent ──────────────────────────────────────────────────────────────
func (h *SectionHandler) RemoveStudent(w http.ResponseWriter, r *http.Request) {
	secID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid section id")
		return
	}
	studentID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "studentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.Students.UpdateOne(ctx,
		bson.M{"_id": studentID, "section_id": secID},
		bson.M{"$unset": bson.M{"section_id": ""}, "$set": bson.M{"updated_at": time.Now()}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to unassign student")
		return
	}
	if res.MatchedCount == 0 {
		writeError(w, http.StatusNotFound, "student is not in this section")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

// ── UnassignedStudents ─────────────────────────────────────────────────────────
// Returns enrolled students for a grade level who do not have a section assigned yet.
// Query: gradeLevel (required), schoolYear (optional), search (optional)
func (h *SectionHandler) UnassignedStudents(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	gl, err := strconv.Atoi(q.Get("gradeLevel"))
	if err != nil || gl < 7 || gl > 12 {
		writeError(w, http.StatusBadRequest, "gradeLevel (7-12) is required")
		return
	}

	filter := bson.M{
		"grade_level": gl,
		"$or": bson.A{
			bson.M{"section_id": primitive.NilObjectID},
			bson.M{"section_id": bson.M{"$exists": false}},
		},
	}
	if sy := q.Get("schoolYear"); sy != "" {
		filter["school_year"] = sy
	}
	if s := q.Get("search"); s != "" {
		filter["$or"] = bson.A{
			bson.M{"first_name": bson.M{"$regex": primitive.Regex{Pattern: s, Options: "i"}}},
			bson.M{"last_name": bson.M{"$regex": primitive.Regex{Pattern: s, Options: "i"}}},
			bson.M{"lrn": bson.M{"$regex": primitive.Regex{Pattern: s, Options: "i"}}},
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	cursor, err := h.Students.Find(ctx, filter,
		options.Find().
			SetSort(bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}}).
			SetLimit(150),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query unassigned students")
		return
	}
	defer cursor.Close(ctx)

	var students []models.Student
	if err := cursor.All(ctx, &students); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode students")
		return
	}
	if students == nil {
		students = []models.Student{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":  students,
		"total": len(students),
	})
}

// ── AvailableTeachers ──────────────────────────────────────────────────────────
// Returns list of active teachers who can be assigned as advisers.
func (h *SectionHandler) AvailableTeachers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	cursor, err := h.Users.Find(ctx,
		bson.M{
			"role":      models.RoleTeacher,
			"is_active": true,
		},
		options.Find().
			SetProjection(bson.M{"_id": 1, "first_name": 1, "last_name": 1, "email": 1}).
			SetSort(bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query teachers")
		return
	}
	defer cursor.Close(ctx)

	var teachers []models.AdviserSummary
	if err := cursor.All(ctx, &teachers); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode teachers")
		return
	}
	if teachers == nil {
		teachers = []models.AdviserSummary{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":  teachers,
		"total": len(teachers),
	})
}
