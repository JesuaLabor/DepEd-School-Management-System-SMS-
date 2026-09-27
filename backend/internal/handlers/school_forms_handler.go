package handlers

import (
	"context"
	"math"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/deped-sms/backend/internal/models"
)

// SchoolFormsHandler generates official DepEd school forms (SF2, SF10, etc.).
type SchoolFormsHandler struct {
	Sections   *mongo.Collection
	Students   *mongo.Collection
	Attendance *mongo.Collection
	Grades     *mongo.Collection
	Users      *mongo.Collection
}

func NewSchoolFormsHandler(db *mongo.Database) *SchoolFormsHandler {
	return &SchoolFormsHandler{
		Sections:   db.Collection("sections"),
		Students:   db.Collection("students"),
		Attendance: db.Collection("attendance"),
		Grades:     db.Collection("grades"),
		Users:      db.Collection("users"),
	}
}

// Routes returns the subrouter mounted at /school-forms.
func (h *SchoolFormsHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/sf2", h.GetSF2)
	r.Get("/sf10", h.GetSF10)
	return r
}

// ── GetSF2 ─────────────────────────────────────────────────────────────────────
// Query: sectionId (required), month (1-12, required), year (required)
func (h *SchoolFormsHandler) GetSF2(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	sectionID, err := primitive.ObjectIDFromHex(q.Get("sectionId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid sectionId is required")
		return
	}

	month, err := strconv.Atoi(q.Get("month"))
	if err != nil || month < 1 || month > 12 {
		writeError(w, http.StatusBadRequest, "month must be 1 to 12")
		return
	}

	year, err := strconv.Atoi(q.Get("year"))
	if err != nil || year < 2000 || year > 2100 {
		writeError(w, http.StatusBadRequest, "valid year is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 12*time.Second)
	defer cancel()

	// 1. Fetch Section with Adviser
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"_id": sectionID}}},
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

	secCursor, err := h.Sections.Aggregate(ctx, pipeline)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query section")
		return
	}
	defer secCursor.Close(ctx)

	var secList []models.SectionWithAdviser
	if err := secCursor.All(ctx, &secList); err != nil || len(secList) == 0 {
		writeError(w, http.StatusNotFound, "section not found")
		return
	}
	section := secList[0]

	// 2. Compute Days in Month & School Weekdays (Mon-Fri)
	firstDay := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	lastDay := firstDay.AddDate(0, 1, -1)
	daysInMonth := lastDay.Day()

	var schoolDays []int
	for d := 1; d <= daysInMonth; d++ {
		curDate := time.Date(year, time.Month(month), d, 0, 0, 0, 0, time.UTC)
		weekday := curDate.Weekday()
		// Monday (1) through Friday (5)
		if weekday >= time.Monday && weekday <= time.Friday {
			schoolDays = append(schoolDays, d)
		}
	}

	// 3. Fetch Students in Section
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
		writeError(w, http.StatusInternalServerError, "failed to query students")
		return
	}
	defer studentCursor.Close(ctx)

	var students []models.StudentSummary
	if err := studentCursor.All(ctx, &students); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode students")
		return
	}

	// 4. Fetch Attendance for Month
	monthStart := firstDay
	monthEnd := lastDay.Add(24*time.Hour - time.Second)

	attCursor, err := h.Attendance.Find(ctx, bson.M{
		"section_id": sectionID,
		"date": bson.M{
			"$gte": monthStart,
			"$lte": monthEnd,
		},
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query attendance")
		return
	}
	defer attCursor.Close(ctx)

	var attRecords []models.AttendanceRecord
	_ = attCursor.All(ctx, &attRecords)

	// Build map: studentId -> day -> status
	attMap := make(map[string]map[int]string)
	for _, rec := range attRecords {
		sid := rec.StudentID.Hex()
		day := rec.Date.Day()
		if attMap[sid] == nil {
			attMap[sid] = make(map[int]string)
		}
		attMap[sid][day] = string(rec.Status)
	}

	// 5. Build Learner Rows & Compute Totals
	var maleLearners []models.LearnerMonthlyAttendance
	var femaleLearners []models.LearnerMonthlyAttendance

	maleDaysPresent := 0
	femaleDaysPresent := 0
	consecutiveAbsentCount := 0

	for _, st := range students {
		sid := st.ID.Hex()
		dailyMap := attMap[sid]
		if dailyMap == nil {
			dailyMap = make(map[int]string)
		}

		presentCount := 0
		absentCount := 0
		lateCount := 0

		for _, day := range schoolDays {
			status := dailyMap[day]
			if status == "present" {
				presentCount++
			} else if status == "late" {
				lateCount++
				presentCount++ // DepEd counts late learners as present in daily total
			} else if status == "absent" {
				absentCount++
			} else if status == "excused" {
				// Excused counts toward excused absence
			}
		}

		if absentCount >= 5 {
			consecutiveAbsentCount++
		}

		isMale := st.Sex == "male" || st.Sex == "Male"

		row := models.LearnerMonthlyAttendance{
			Student:       st,
			DailyStatuses: dailyMap,
			TotalPresent:  presentCount,
			TotalAbsent:   absentCount,
			TotalLate:     lateCount,
		}

		if isMale {
			maleDaysPresent += presentCount
			maleLearners = append(maleLearners, row)
		} else {
			femaleDaysPresent += presentCount
			femaleLearners = append(femaleLearners, row)
		}
	}

	totalDaysPresent := maleDaysPresent + femaleDaysPresent
	totalEnrolment := len(students)
	totalSchoolDays := len(schoolDays)

	ada := 0.0
	if totalSchoolDays > 0 {
		ada = math.Round((float64(totalDaysPresent)/float64(totalSchoolDays))*100) / 100
	}

	pctAttendance := 0.0
	totalPossible := totalEnrolment * totalSchoolDays
	if totalPossible > 0 {
		pctAttendance = math.Round((float64(totalDaysPresent)/float64(totalPossible))*10000) / 100
	}

	sf2 := models.SchoolFormSF2{
		Section:     section,
		Month:       month,
		MonthName:   firstDay.Month().String(),
		Year:        year,
		SchoolYear:  section.SchoolYear,
		DaysInMonth: daysInMonth,
		SchoolDays:  schoolDays,
		MaleLearners: maleLearners,
		FemaleLearners: femaleLearners,
		Summary: models.SF2MonthlySummary{
			TotalEnrolment:         totalEnrolment,
			MaleEnrolment:          len(maleLearners),
			FemaleEnrolment:        len(femaleLearners),
			TotalSchoolDays:        totalSchoolDays,
			MaleDaysPresent:        maleDaysPresent,
			FemaleDaysPresent:      femaleDaysPresent,
			TotalDaysPresent:       totalDaysPresent,
			AverageDailyAttendance: ada,
			AttendancePercentage:   pctAttendance,
			ConsecutiveAbsentCount: consecutiveAbsentCount,
		},
	}

	writeJSON(w, http.StatusOK, sf2)
}

// ── GetSF10 ────────────────────────────────────────────────────────────────────
// Query: studentId (required)
func (h *SchoolFormsHandler) GetSF10(w http.ResponseWriter, r *http.Request) {
	studentID, err := primitive.ObjectIDFromHex(r.URL.Query().Get("studentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid studentId is required")
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

	// 2. Fetch all grades across all school years
	gradeCursor, err := h.Grades.Find(ctx,
		bson.M{"student_id": studentID},
		options.Find().SetSort(bson.D{{Key: "school_year", Value: 1}, {Key: "subject_code", Value: 1}}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query scholastic records")
		return
	}
	defer gradeCursor.Close(ctx)

	var allGrades []models.GradeRecord
	_ = gradeCursor.All(ctx, &allGrades)

	// Group grades by (SchoolYear, GradeLevel)
	type yearKey struct {
		SchoolYear string
		GradeLevel int
	}

	grouped := make(map[yearKey][]models.GradeRecord)
	sectionIDs := make(map[yearKey]primitive.ObjectID)

	for _, g := range allGrades {
		yk := yearKey{SchoolYear: g.SchoolYear, GradeLevel: g.GradeLevel}
		grouped[yk] = append(grouped[yk], g)
		if !g.SectionID.IsZero() {
			sectionIDs[yk] = g.SectionID
		}
	}

	// Build Scholastic History array
	var history []models.ScholasticYearRecord

	for yk, grList := range grouped {
		var sumFinal float64
		var countFinal int

		for _, gr := range grList {
			if gr.FinalGrade != nil {
				sumFinal += *gr.FinalGrade
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
				remarks = "Promoted to Grade " + strconv.Itoa(yk.GradeLevel+1)
			} else {
				remarks = "Retained in Grade " + strconv.Itoa(yk.GradeLevel)
			}
		}

		// Resolve Section Name & Adviser
		secName := "Section " + strconv.Itoa(yk.GradeLevel)
		advName := "Class Adviser"
		if secID, ok := sectionIDs[yk]; ok && !secID.IsZero() {
			var sec models.Section
			if err := h.Sections.FindOne(ctx, bson.M{"_id": secID}).Decode(&sec); err == nil {
				secName = sec.Name
				if !sec.AdviserID.IsZero() {
					var adv models.User
					if err := h.Users.FindOne(ctx, bson.M{"_id": sec.AdviserID}).Decode(&adv); err == nil {
						advName = adv.FirstName + " " + adv.LastName
					}
				}
			}
		}

		history = append(history, models.ScholasticYearRecord{
			GradeLevel:     yk.GradeLevel,
			SchoolYear:     yk.SchoolYear,
			SectionName:    secName,
			AdviserName:    advName,
			Grades:         grList,
			GeneralAverage: genAvg,
			Descriptor:     descriptor,
			Remarks:        remarks,
		})
	}

	// Sort history by GradeLevel asc
	sort.Slice(history, func(i, j int) bool {
		return history[i].GradeLevel < history[j].GradeLevel
	})

	graduationEligible := int(student.GradeLevel) >= 12

	sf10 := models.SchoolFormSF10{
		Student:            student,
		ScholasticHistory:  history,
		CurrentGrade:       int(student.GradeLevel),
		GraduationEligible: graduationEligible,
	}

	writeJSON(w, http.StatusOK, sf10)
}
