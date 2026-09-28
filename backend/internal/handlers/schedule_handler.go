package handlers

import (
	"context"
	"encoding/json"
	"fmt"
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

// ScheduleHandler handles section timetable scheduling and teacher load management.
type ScheduleHandler struct {
	Schedules *mongo.Collection
	Sections  *mongo.Collection
	Users     *mongo.Collection
}

func NewScheduleHandler(db *mongo.Database) *ScheduleHandler {
	return &ScheduleHandler{
		Schedules: db.Collection("schedules"),
		Sections:  db.Collection("sections"),
		Users:     db.Collection("users"),
	}
}

// Routes returns the subrouter mounted at /schedules.
func (h *ScheduleHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/section/{sectionId}", h.GetSectionSchedule)
	r.Post("/",                   h.CreateSlot)
	r.Put("/{id}",                h.UpdateSlot)
	r.Delete("/{id}",             h.DeleteSlot)
	r.Get("/teacher/{teacherId}", h.GetTeacherSchedule)
	r.Get("/teachers-load",       h.GetTeachersLoadSummary)
	return r
}

type ScheduleSlotInput struct {
	SectionID   string           `json:"sectionId"`
	SubjectCode string           `json:"subjectCode"`
	SubjectName string           `json:"subjectName"`
	TeacherID   string           `json:"teacherId"`
	DayOfWeek   models.DayOfWeek `json:"dayOfWeek"`
	StartTime   string           `json:"startTime"` // "HH:MM" e.g. "07:30"
	EndTime     string           `json:"endTime"`   // "HH:MM" e.g. "08:30"
	Room        string           `json:"room"`
	Semester    *int             `json:"semester,omitempty"`
}

func parseTimeToMinutes(t string) (int, error) {
	parts := strings.Split(strings.TrimSpace(t), ":")
	if len(parts) != 2 {
		return 0, fmt.Errorf("invalid time format, expected HH:MM")
	}
	h, err1 := strconv.Atoi(parts[0])
	m, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil || h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, fmt.Errorf("invalid hours or minutes")
	}
	return h*60 + m, nil
}

func timesOverlap(s1, e1, s2, e2 string) bool {
	start1, err1 := parseTimeToMinutes(s1)
	end1, err2 := parseTimeToMinutes(e1)
	start2, err3 := parseTimeToMinutes(s2)
	end2, err4 := parseTimeToMinutes(e2)
	if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
		return false
	}
	return start1 < end2 && end1 > start2
}

// GetSectionSchedule returns all schedule slots for a given section.
func (h *ScheduleHandler) GetSectionSchedule(w http.ResponseWriter, r *http.Request) {
	secID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "sectionId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid section id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	findOpts := options.Find().SetSort(bson.D{
		{Key: "day_of_week", Value: 1},
		{Key: "start_time", Value: 1},
	})

	cursor, err := h.Schedules.Find(ctx, bson.M{"section_id": secID}, findOpts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch schedule")
		return
	}
	defer cursor.Close(ctx)

	var slots []models.ScheduleSlot
	if err := cursor.All(ctx, &slots); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode schedule")
		return
	}
	if slots == nil {
		slots = []models.ScheduleSlot{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"sectionId": secID.Hex(),
		"slots":     slots,
		"total":     len(slots),
	})
}

// CreateSlot validates conflicts and adds a new subject schedule slot.
func (h *ScheduleHandler) CreateSlot(w http.ResponseWriter, r *http.Request) {
	var req ScheduleSlotInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	secOID, err := primitive.ObjectIDFromHex(req.SectionID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid sectionId is required")
		return
	}

	teacherOID, err := primitive.ObjectIDFromHex(req.TeacherID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid teacherId is required")
		return
	}

	sMin, err1 := parseTimeToMinutes(req.StartTime)
	eMin, err2 := parseTimeToMinutes(req.EndTime)
	if err1 != nil || err2 != nil || sMin >= eMin {
		writeError(w, http.StatusBadRequest, "startTime must be earlier than endTime")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Verify Section
	var section models.Section
	if err := h.Sections.FindOne(ctx, bson.M{"_id": secOID}).Decode(&section); err != nil {
		writeError(w, http.StatusNotFound, "section not found")
		return
	}

	// Verify Teacher
	var teacher models.User
	if err := h.Users.FindOne(ctx, bson.M{"_id": teacherOID}).Decode(&teacher); err != nil {
		writeError(w, http.StatusNotFound, "teacher not found")
		return
	}

	schoolYear := section.SchoolYear
	if schoolYear == "" {
		schoolYear = "2025-2026"
	}

	// Conflict Checks
	// 1. Check Section Conflict (Section can't have 2 classes at same time)
	secCur, _ := h.Schedules.Find(ctx, bson.M{
		"section_id":  secOID,
		"day_of_week": req.DayOfWeek,
	})
	if secCur != nil {
		defer secCur.Close(ctx)
		var existingSecSlots []models.ScheduleSlot
		_ = secCur.All(ctx, &existingSecSlots)
		for _, s := range existingSecSlots {
			if timesOverlap(req.StartTime, req.EndTime, s.StartTime, s.EndTime) {
				writeError(w, http.StatusBadRequest, fmt.Sprintf("Section conflict: %s is already scheduled on %s from %s to %s", s.SubjectName, req.DayOfWeek, s.StartTime, s.EndTime))
				return
			}
		}
	}

	// 2. Check Teacher Conflict (Teacher can't be in 2 places at same time)
	tCur, _ := h.Schedules.Find(ctx, bson.M{
		"teacher_id":  teacherOID,
		"day_of_week": req.DayOfWeek,
		"school_year": schoolYear,
	})
	if tCur != nil {
		defer tCur.Close(ctx)
		var existingTeacherSlots []models.ScheduleSlot
		_ = tCur.All(ctx, &existingTeacherSlots)
		for _, s := range existingTeacherSlots {
			if timesOverlap(req.StartTime, req.EndTime, s.StartTime, s.EndTime) {
				writeError(w, http.StatusBadRequest, fmt.Sprintf("Teacher conflict: %s %s is already teaching %s in Section %s on %s from %s to %s", teacher.FirstName, teacher.LastName, s.SubjectName, s.SectionName, req.DayOfWeek, s.StartTime, s.EndTime))
				return
			}
		}
	}

	// 3. Check Room Conflict (Room can't hold 2 classes at same time)
	room := strings.TrimSpace(req.Room)
	if room == "" {
		room = section.Room
	}
	if room != "" {
		rCur, _ := h.Schedules.Find(ctx, bson.M{
			"room":        primitive.Regex{Pattern: "^" + room + "$", Options: "i"},
			"day_of_week": req.DayOfWeek,
			"school_year": schoolYear,
		})
		if rCur != nil {
			defer rCur.Close(ctx)
			var existingRoomSlots []models.ScheduleSlot
			_ = rCur.All(ctx, &existingRoomSlots)
			for _, s := range existingRoomSlots {
				if timesOverlap(req.StartTime, req.EndTime, s.StartTime, s.EndTime) {
					writeError(w, http.StatusBadRequest, fmt.Sprintf("Room conflict: Room '%s' is already occupied by Section %s (%s) on %s from %s to %s", room, s.SectionName, s.SubjectName, req.DayOfWeek, s.StartTime, s.EndTime))
					return
				}
			}
		}
	}

	now := time.Now()
	newSlot := models.ScheduleSlot{
		ID:          primitive.NewObjectID(),
		SectionID:   secOID,
		SectionName: section.Name,
		GradeLevel:  section.GradeLevel,
		SubjectCode: strings.TrimSpace(req.SubjectCode),
		SubjectName: strings.TrimSpace(req.SubjectName),
		TeacherID:   teacherOID,
		TeacherName: teacher.FirstName + " " + teacher.LastName,
		DayOfWeek:   req.DayOfWeek,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		Room:        room,
		SchoolYear:  schoolYear,
		Semester:    req.Semester,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if _, err := h.Schedules.InsertOne(ctx, newSlot); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save schedule slot")
		return
	}

	writeJSON(w, http.StatusCreated, newSlot)
}

// UpdateSlot updates an existing schedule slot with conflict validation.
func (h *ScheduleHandler) UpdateSlot(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid slot id")
		return
	}

	var req ScheduleSlotInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	sMin, err1 := parseTimeToMinutes(req.StartTime)
	eMin, err2 := parseTimeToMinutes(req.EndTime)
	if err1 != nil || err2 != nil || sMin >= eMin {
		writeError(w, http.StatusBadRequest, "startTime must be earlier than endTime")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var existing models.ScheduleSlot
	if err := h.Schedules.FindOne(ctx, bson.M{"_id": id}).Decode(&existing); err != nil {
		writeError(w, http.StatusNotFound, "schedule slot not found")
		return
	}

	teacherOID, err := primitive.ObjectIDFromHex(req.TeacherID)
	if err != nil {
		teacherOID = existing.TeacherID
	}

	var teacher models.User
	teacherName := existing.TeacherName
	if err := h.Users.FindOne(ctx, bson.M{"_id": teacherOID}).Decode(&teacher); err == nil {
		teacherName = teacher.FirstName + " " + teacher.LastName
	}

	// Run conflict checks excluding self (_id != id)
	secCur, _ := h.Schedules.Find(ctx, bson.M{
		"_id":         bson.M{"$ne": id},
		"section_id":  existing.SectionID,
		"day_of_week": req.DayOfWeek,
	})
	if secCur != nil {
		defer secCur.Close(ctx)
		var slots []models.ScheduleSlot
		_ = secCur.All(ctx, &slots)
		for _, s := range slots {
			if timesOverlap(req.StartTime, req.EndTime, s.StartTime, s.EndTime) {
				writeError(w, http.StatusBadRequest, fmt.Sprintf("Section conflict: %s is already scheduled on %s from %s to %s", s.SubjectName, req.DayOfWeek, s.StartTime, s.EndTime))
				return
			}
		}
	}

	tCur, _ := h.Schedules.Find(ctx, bson.M{
		"_id":         bson.M{"$ne": id},
		"teacher_id":  teacherOID,
		"day_of_week": req.DayOfWeek,
		"school_year": existing.SchoolYear,
	})
	if tCur != nil {
		defer tCur.Close(ctx)
		var slots []models.ScheduleSlot
		_ = tCur.All(ctx, &slots)
		for _, s := range slots {
			if timesOverlap(req.StartTime, req.EndTime, s.StartTime, s.EndTime) {
				writeError(w, http.StatusBadRequest, fmt.Sprintf("Teacher conflict: %s is already teaching in Section %s on %s from %s to %s", teacherName, s.SectionName, req.DayOfWeek, s.StartTime, s.EndTime))
				return
			}
		}
	}

	room := strings.TrimSpace(req.Room)
	if room != "" {
		rCur, _ := h.Schedules.Find(ctx, bson.M{
			"_id":         bson.M{"$ne": id},
			"room":        primitive.Regex{Pattern: "^" + room + "$", Options: "i"},
			"day_of_week": req.DayOfWeek,
			"school_year": existing.SchoolYear,
		})
		if rCur != nil {
			defer rCur.Close(ctx)
			var slots []models.ScheduleSlot
			_ = rCur.All(ctx, &slots)
			for _, s := range slots {
				if timesOverlap(req.StartTime, req.EndTime, s.StartTime, s.EndTime) {
					writeError(w, http.StatusBadRequest, fmt.Sprintf("Room conflict: Room '%s' is already occupied by Section %s on %s from %s to %s", room, s.SectionName, req.DayOfWeek, s.StartTime, s.EndTime))
					return
				}
			}
		}
	}

	update := bson.M{
		"subject_code": req.SubjectCode,
		"subject_name": req.SubjectName,
		"teacher_id":   teacherOID,
		"teacher_name": teacherName,
		"day_of_week":  req.DayOfWeek,
		"start_time":   req.StartTime,
		"end_time":     req.EndTime,
		"room":         room,
		"semester":     req.Semester,
		"updated_at":   time.Now(),
	}

	if _, err := h.Schedules.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update schedule slot")
		return
	}

	var updated models.ScheduleSlot
	_ = h.Schedules.FindOne(ctx, bson.M{"_id": id}).Decode(&updated)
	writeJSON(w, http.StatusOK, updated)
}

// DeleteSlot removes a schedule slot.
func (h *ScheduleHandler) DeleteSlot(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid slot id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := h.Schedules.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil || res.DeletedCount == 0 {
		writeError(w, http.StatusNotFound, "slot not found or failed to delete")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// GetTeacherSchedule returns all teaching assignments and calculated weekly hours for a specific teacher.
func (h *ScheduleHandler) GetTeacherSchedule(w http.ResponseWriter, r *http.Request) {
	teacherID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "teacherId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid teacher id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var teacher models.User
	if err := h.Users.FindOne(ctx, bson.M{"_id": teacherID}).Decode(&teacher); err != nil {
		writeError(w, http.StatusNotFound, "teacher not found")
		return
	}

	findOpts := options.Find().SetSort(bson.D{
		{Key: "day_of_week", Value: 1},
		{Key: "start_time", Value: 1},
	})
	cursor, err := h.Schedules.Find(ctx, bson.M{"teacher_id": teacherID}, findOpts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch teacher schedule")
		return
	}
	defer cursor.Close(ctx)

	var slots []models.ScheduleSlot
	_ = cursor.All(ctx, &slots)
	if slots == nil {
		slots = []models.ScheduleSlot{}
	}

	totalMinutes := 0
	for _, s := range slots {
		start, _ := parseTimeToMinutes(s.StartTime)
		end, _ := parseTimeToMinutes(s.EndTime)
		if end > start {
			totalMinutes += (end - start)
		}
	}

	summary := models.TeacherLoadSummary{
		TeacherID:   teacherID,
		TeacherName: teacher.FirstName + " " + teacher.LastName,
		Email:       teacher.Email,
		TotalSlots:  len(slots),
		TotalHours:  float64(totalMinutes) / 60.0,
		Slots:       slots,
	}

	writeJSON(w, http.StatusOK, summary)
}

// GetTeachersLoadSummary returns the load summary across all active teachers.
func (h *ScheduleHandler) GetTeachersLoadSummary(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	cur, err := h.Users.Find(ctx, bson.M{
		"role":      "teacher",
		"is_active": true,
	}, options.Find().SetSort(bson.D{{Key: "last_name", Value: 1}}))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch teachers")
		return
	}
	defer cur.Close(ctx)

	var teachers []models.User
	_ = cur.All(ctx, &teachers)

	var summaries []models.TeacherLoadSummary
	for _, t := range teachers {
		sCur, err := h.Schedules.Find(ctx, bson.M{"teacher_id": t.ID})
		var slots []models.ScheduleSlot
		if err == nil {
			_ = sCur.All(ctx, &slots)
			sCur.Close(ctx)
		}
		totalMinutes := 0
		for _, s := range slots {
			start, _ := parseTimeToMinutes(s.StartTime)
			end, _ := parseTimeToMinutes(s.EndTime)
			if end > start {
				totalMinutes += (end - start)
			}
		}
		summaries = append(summaries, models.TeacherLoadSummary{
			TeacherID:   t.ID,
			TeacherName: t.FirstName + " " + t.LastName,
			Email:       t.Email,
			TotalSlots:  len(slots),
			TotalHours:  float64(totalMinutes) / 60.0,
			Slots:       slots,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":  summaries,
		"total": len(summaries),
	})
}
