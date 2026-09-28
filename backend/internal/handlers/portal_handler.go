package handlers

import (
	"context"
	"math"
	"net/http"
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

// PortalHandler handles student and parent/guardian dedicated portal access.
type PortalHandler struct {
	Students      *mongo.Collection
	Grades        *mongo.Collection
	Attendance    *mongo.Collection
	Schedules     *mongo.Collection
	Sections      *mongo.Collection
	Users         *mongo.Collection
	Announcements *mongo.Collection
}

func NewPortalHandler(db *mongo.Database) *PortalHandler {
	return &PortalHandler{
		Students:      db.Collection("students"),
		Grades:        db.Collection("grades"),
		Attendance:    db.Collection("attendance"),
		Schedules:     db.Collection("schedules"),
		Sections:      db.Collection("sections"),
		Users:         db.Collection("users"),
		Announcements: db.Collection("announcements"),
	}
}

// Routes returns the subrouter mounted at /portal.
func (h *PortalHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/me",                            h.GetMyPortal)
	r.Get("/student/{studentId}/overview",  h.GetStudentOverview)
	r.Get("/student/{studentId}/grades",    h.GetStudentGrades)
	r.Get("/student/{studentId}/attendance",h.GetStudentAttendance)
	r.Get("/student/{studentId}/schedule",  h.GetStudentSchedule)
	return r
}

type PortalStudentSummary struct {
	Student    models.Student            `json:"student"`
	Section    *models.SectionWithAdviser `json:"section,omitempty"`
	Attendance models.AttendanceSummary  `json:"attendance"`
	Grades     []models.GradeRecord      `json:"grades"`
	GeneralAvg *float64                  `json:"generalAverage,omitempty"`
	Descriptor string                    `json:"descriptor,omitempty"`
}

type PortalMyResponse struct {
	User     models.User             `json:"user"`
	Role     models.Role             `json:"role"`
	Learner  *PortalStudentSummary   `json:"learner,omitempty"`  // If user is a student
	Children []PortalStudentSummary  `json:"children,omitempty"` // If user is a guardian
}

// resolveCallerAndStudents finds the caller and their accessible student records.
func (h *PortalHandler) resolveCallerAndStudents(ctx context.Context, r *http.Request) (models.User, []models.Student, error) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	if !ok {
		return models.User{}, nil, mongo.ErrNoDocuments
	}

	callerID, _ := primitive.ObjectIDFromHex(claims["sub"].(string))
	var user models.User
	if err := h.Users.FindOne(ctx, bson.M{"_id": callerID}).Decode(&user); err != nil {
		return models.User{}, nil, err
	}

	var students []models.Student

	if user.Role == models.RoleStudent {
		if user.StudentID != nil {
			var s models.Student
			if err := h.Students.FindOne(ctx, bson.M{"_id": *user.StudentID}).Decode(&s); err == nil {
				students = append(students, s)
			}
		}
		if len(students) == 0 {
			// Fallback: match by email or lrn
			cur, _ := h.Students.Find(ctx, bson.M{
				"$or": bson.A{
					bson.M{"email": user.Email},
					bson.M{"lrn": user.Email},
				},
			})
			if cur != nil {
				_ = cur.All(ctx, &students)
				cur.Close(ctx)
			}
		}
	} else if user.Role == models.RoleGuardian {
		if len(user.StudentIDs) > 0 {
			cur, _ := h.Students.Find(ctx, bson.M{"_id": bson.M{"$in": user.StudentIDs}})
			if cur != nil {
				_ = cur.All(ctx, &students)
				cur.Close(ctx)
			}
		}
		if len(students) == 0 {
			// Fallback: match by guardian email
			cur, _ := h.Students.Find(ctx, bson.M{"guardian.email": user.Email})
			if cur != nil {
				_ = cur.All(ctx, &students)
				cur.Close(ctx)
			}
		}
	}

	return user, students, nil
}

// buildStudentSummary aggregates section, attendance, and quarterly grades for a student.
func (h *PortalHandler) buildStudentSummary(ctx context.Context, student models.Student) PortalStudentSummary {
	var summary PortalStudentSummary
	summary.Student = student

	// Section details
	if !student.SectionID.IsZero() {
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"_id": student.SectionID}}},
			{{Key: "$lookup", Value: bson.M{
				"from":         "users",
				"localField":   "adviser_id",
				"foreignField": "_id",
				"as":           "adviser",
			}}},
			{{Key: "$unwind", Value: bson.M{"path": "$adviser", "preserveNullAndEmptyArrays": true}}},
		}
		if cur, err := h.Sections.Aggregate(ctx, pipeline); err == nil {
			var secs []models.SectionWithAdviser
			if err := cur.All(ctx, &secs); err == nil && len(secs) > 0 {
				summary.Section = &secs[0]
			}
			cur.Close(ctx)
		}
	}

	// Attendance summary
	attPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"student_id": student.ID}}},
		{{Key: "$group", Value: bson.M{
			"_id":     "$student_id",
			"present": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "present"}}, 1, 0}}},
			"absent":  bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "absent"}}, 1, 0}}},
			"late":    bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "late"}}, 1, 0}}},
			"excused": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "excused"}}, 1, 0}}},
			"total":   bson.M{"$sum": 1},
		}}},
	}
	if cur, err := h.Attendance.Aggregate(ctx, attPipeline); err == nil {
		type attAgg struct {
			Present int `bson:"present"`
			Absent  int `bson:"absent"`
			Late    int `bson:"late"`
			Excused int `bson:"excused"`
			Total   int `bson:"total"`
		}
		var aResults []attAgg
		if err := cur.All(ctx, &aResults); err == nil && len(aResults) > 0 {
			a := aResults[0]
			rate := 0.0
			if a.Total > 0 {
				rate = math.Round((float64(a.Absent)/float64(a.Total))*1000) / 10
			}
			summary.Attendance = models.AttendanceSummary{
				StudentID:   student.ID,
				Present:     a.Present,
				Absent:      a.Absent,
				Late:        a.Late,
				Excused:     a.Excused,
				Total:       a.Total,
				AbsenceRate: rate,
			}
		}
		cur.Close(ctx)
	}

	// Grades
	cur, err := h.Grades.Find(ctx, bson.M{"student_id": student.ID}, options.Find().SetSort(bson.D{{Key: "subject_code", Value: 1}}))
	if err == nil {
		var grades []models.GradeRecord
		_ = cur.All(ctx, &grades)
		cur.Close(ctx)
		summary.Grades = grades

		sumFinal := 0.0
		countFinal := 0
		for _, g := range grades {
			if g.FinalGrade != nil {
				sumFinal += *g.FinalGrade
				countFinal++
			}
		}
		if countFinal > 0 {
			avg := math.Round((sumFinal/float64(countFinal))*100) / 100
			summary.GeneralAvg = &avg
			summary.Descriptor = models.GradeDescriptor(avg)
		}
	}

	return summary
}

// GetMyPortal returns the logged-in student's or guardian's portal landing payload.
func (h *PortalHandler) GetMyPortal(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	user, students, err := h.resolveCallerAndStudents(ctx, r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unable to resolve user session")
		return
	}

	var resp PortalMyResponse
	resp.User = user
	resp.Role = user.Role

	if user.Role == models.RoleStudent {
		if len(students) > 0 {
			s := h.buildStudentSummary(ctx, students[0])
			resp.Learner = &s
		}
	} else if user.Role == models.RoleGuardian {
		for _, st := range students {
			resp.Children = append(resp.Children, h.buildStudentSummary(ctx, st))
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

// GetStudentOverview returns learner profile, grades, attendance, and weekly schedule.
func (h *PortalHandler) GetStudentOverview(w http.ResponseWriter, r *http.Request) {
	stID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "studentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var student models.Student
	if err := h.Students.FindOne(ctx, bson.M{"_id": stID}).Decode(&student); err != nil {
		writeError(w, http.StatusNotFound, "student record not found")
		return
	}

	summary := h.buildStudentSummary(ctx, student)

	// Fetch class schedule
	var slots []models.ScheduleSlot
	if !student.SectionID.IsZero() {
		sCur, err := h.Schedules.Find(ctx, bson.M{"section_id": student.SectionID}, options.Find().SetSort(bson.D{
			{Key: "day_of_week", Value: 1},
			{Key: "start_time", Value: 1},
		}))
		if err == nil {
			_ = sCur.All(ctx, &slots)
			sCur.Close(ctx)
		}
	}
	if slots == nil {
		slots = []models.ScheduleSlot{}
	}

	// Fetch targeted announcements
	annFilter := bson.M{
		"$or": bson.A{
			bson.M{"scope": models.ScopeSchoolWide},
			bson.M{"target_grade": int(student.GradeLevel)},
			bson.M{"target_section": student.SectionID},
		},
	}
	if student.GradeLevel <= 10 {
		annFilter["$or"] = append(annFilter["$or"].(bson.A), bson.M{"scope": models.ScopeJHS})
	} else {
		annFilter["$or"] = append(annFilter["$or"].(bson.A), bson.M{"scope": models.ScopeSHS})
	}

	var announcements []models.Announcement
	aCur, err := h.Announcements.Find(ctx, annFilter, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(5))
	if err == nil {
		_ = aCur.All(ctx, &announcements)
		aCur.Close(ctx)
	}
	if announcements == nil {
		announcements = []models.Announcement{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"summary":       summary,
		"schedule":      slots,
		"announcements": announcements,
	})
}

// GetStudentGrades returns learner quarterly ratings.
func (h *PortalHandler) GetStudentGrades(w http.ResponseWriter, r *http.Request) {
	stID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "studentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	cur, err := h.Grades.Find(ctx, bson.M{"student_id": stID}, options.Find().SetSort(bson.D{{Key: "subject_code", Value: 1}}))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch grades")
		return
	}
	defer cur.Close(ctx)

	var grades []models.GradeRecord
	_ = cur.All(ctx, &grades)
	if grades == nil {
		grades = []models.GradeRecord{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"studentId": stID.Hex(),
		"grades":    grades,
	})
}

// GetStudentAttendance returns attendance entries.
func (h *PortalHandler) GetStudentAttendance(w http.ResponseWriter, r *http.Request) {
	stID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "studentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	cur, err := h.Attendance.Find(ctx, bson.M{"student_id": stID}, options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(60))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch attendance")
		return
	}
	defer cur.Close(ctx)

	var records []models.AttendanceRecord
	_ = cur.All(ctx, &records)
	if records == nil {
		records = []models.AttendanceRecord{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"studentId": stID.Hex(),
		"records":   records,
		"total":     len(records),
	})
}

// GetStudentSchedule returns weekly class schedule slots for the student's section.
func (h *PortalHandler) GetStudentSchedule(w http.ResponseWriter, r *http.Request) {
	stID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "studentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var student models.Student
	if err := h.Students.FindOne(ctx, bson.M{"_id": stID}).Decode(&student); err != nil {
		writeError(w, http.StatusNotFound, "student not found")
		return
	}

	if student.SectionID.IsZero() {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"studentId": stID.Hex(),
			"slots":     []models.ScheduleSlot{},
			"message":   "Student is not assigned to a class section yet",
		})
		return
	}

	cur, err := h.Schedules.Find(ctx, bson.M{"section_id": student.SectionID}, options.Find().SetSort(bson.D{
		{Key: "day_of_week", Value: 1},
		{Key: "start_time", Value: 1},
	}))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch schedule")
		return
	}
	defer cur.Close(ctx)

	var slots []models.ScheduleSlot
	_ = cur.All(ctx, &slots)
	if slots == nil {
		slots = []models.ScheduleSlot{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"studentId": stID.Hex(),
		"sectionId": student.SectionID.Hex(),
		"slots":     slots,
		"total":     len(slots),
	})
}
