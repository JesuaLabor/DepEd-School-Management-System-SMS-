package handlers

import (
	"context"
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// AnalyticsHandler handles school intelligence aggregation and reporting.
type AnalyticsHandler struct {
	Students   *mongo.Collection
	Attendance *mongo.Collection
	Grades     *mongo.Collection
	Sections   *mongo.Collection
	Users      *mongo.Collection
}

func NewAnalyticsHandler(db *mongo.Database) *AnalyticsHandler {
	return &AnalyticsHandler{
		Students:   db.Collection("students"),
		Attendance: db.Collection("attendance"),
		Grades:     db.Collection("grades"),
		Sections:   db.Collection("sections"),
		Users:      db.Collection("users"),
	}
}

// Routes returns the subrouter mounted at /analytics.
func (h *AnalyticsHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/overview", h.GetOverview)
	return r
}

type GradeLevelMetric struct {
	GradeLevel int    `json:"gradeLevel"`
	Label      string `json:"label"`
	Total      int    `json:"total"`
	Male       int    `json:"male"`
	Female     int    `json:"female"`
}

type TrackStrandMetric struct {
	Strand     string  `json:"strand"`
	Track      string  `json:"track"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

type DailyAttendanceMetric struct {
	Date           string  `json:"date"`
	Present        int     `json:"present"`
	Absent         int     `json:"absent"`
	Late           int     `json:"late"`
	Excused        int     `json:"excused"`
	Total          int     `json:"total"`
	AttendanceRate float64 `json:"attendanceRate"`
}

type GradePerformanceMetric struct {
	Outstanding        int     `json:"outstanding"`        // 90-100
	VerySatisfactory   int     `json:"verySatisfactory"`   // 85-89
	Satisfactory       int     `json:"satisfactory"`       // 80-84
	FairlySatisfactory int     `json:"fairlySatisfactory"` // 75-79
	DidNotMeet         int     `json:"didNotMeet"`         // < 75
	TotalGrades        int     `json:"totalGrades"`
	PassingRate        float64 `json:"passingRate"`
}

type SARDORiskLearner struct {
	StudentID  string `json:"studentId"`
	LRN        string `json:"lrn"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	GradeLevel int    `json:"gradeLevel"`
	Sex        string `json:"sex"`
	Absences   int    `json:"absences"`
	RiskLevel  string `json:"riskLevel"` // "Critical (SARDO)" or "Moderate Risk"
}

type AnalyticsOverviewResponse struct {
	Summary struct {
		TotalStudents      int64   `json:"totalStudents"`
		EnrolledStudents   int64   `json:"enrolledStudents"`
		JHSCount           int64   `json:"jhsCount"`
		SHSCount           int64   `json:"shsCount"`
		TotalMale          int64   `json:"totalMale"`
		TotalFemale        int64   `json:"totalFemale"`
		FacultyCount       int64   `json:"facultyCount"`
		SectionsCount      int64   `json:"sectionsCount"`
		AttendanceRate     float64 `json:"attendanceRate"`
		CriticalSARDOCount int     `json:"criticalSardoCount"`
		ModerateRiskCount  int     `json:"moderateRiskCount"`
	} `json:"summary"`
	GradeLevelDistribution  []GradeLevelMetric       `json:"gradeLevelDistribution"`
	TrackStrandDistribution []TrackStrandMetric      `json:"trackStrandDistribution"`
	RecentAttendanceTrend   []DailyAttendanceMetric  `json:"recentAttendanceTrend"`
	GradePerformance        GradePerformanceMetric   `json:"gradePerformance"`
	RecentSARDORisks        []SARDORiskLearner       `json:"recentSardoRisks"`
}

// GetOverview computes comprehensive school-wide metrics across all collections.
func (h *AnalyticsHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	var resp AnalyticsOverviewResponse

	// 1. Basic Counts
	totalStudents, _ := h.Students.CountDocuments(ctx, bson.M{})
	enrolledStudents, _ := h.Students.CountDocuments(ctx, bson.M{"status": "enrolled"})
	resp.Summary.TotalStudents = totalStudents
	resp.Summary.EnrolledStudents = enrolledStudents

	totalMale, _ := h.Students.CountDocuments(ctx, bson.M{"sex": bson.M{"$regex": primitive.Regex{Pattern: "^male$", Options: "i"}}})
	totalFemale, _ := h.Students.CountDocuments(ctx, bson.M{"sex": bson.M{"$regex": primitive.Regex{Pattern: "^female$", Options: "i"}}})
	resp.Summary.TotalMale = totalMale
	resp.Summary.TotalFemale = totalFemale

	facultyCount, _ := h.Users.CountDocuments(ctx, bson.M{
		"role":      bson.M{"$in": bson.A{"teacher", "registrar"}},
		"is_active": true,
	})
	resp.Summary.FacultyCount = facultyCount

	sectionsCount, _ := h.Sections.CountDocuments(ctx, bson.M{})
	resp.Summary.SectionsCount = sectionsCount

	// 2. Grade Level Distribution (Grades 7 to 12)
	gradeMap := make(map[int]*GradeLevelMetric)
	for g := 7; g <= 12; g++ {
		label := ""
		if g <= 10 {
			label = "Grade " + string(rune('0'+g))
			if g == 10 {
				label = "Grade 10"
			}
		} else {
			label = "Grade " + string(rune('0'+g-10+10)) // 11, 12
			if g == 11 {
				label = "Grade 11"
			} else {
				label = "Grade 12"
			}
		}
		gradeMap[g] = &GradeLevelMetric{
			GradeLevel: g,
			Label:      label,
			Total:      0,
			Male:       0,
			Female:     0,
		}
	}

	gradePipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"grade_level": "$grade_level",
				"sex":         bson.M{"$toLower": "$sex"},
			},
			"count": bson.M{"$sum": 1},
		}}},
	}

	if cur, err := h.Students.Aggregate(ctx, gradePipeline); err == nil {
		defer cur.Close(ctx)
		type gradeSexResult struct {
			ID struct {
				GradeLevel int    `bson:"grade_level"`
				Sex        string `bson:"sex"`
			} `bson:"_id"`
			Count int `bson:"count"`
		}
		var results []gradeSexResult
		if err := cur.All(ctx, &results); err == nil {
			for _, res := range results {
				gl := res.ID.GradeLevel
				if m, ok := gradeMap[gl]; ok {
					m.Total += res.Count
					if res.ID.Sex == "male" {
						m.Male += res.Count
					} else if res.ID.Sex == "female" {
						m.Female += res.Count
					}
				}
				if gl <= 10 {
					resp.Summary.JHSCount += int64(res.Count)
				} else {
					resp.Summary.SHSCount += int64(res.Count)
				}
			}
		}
	}

	for g := 7; g <= 12; g++ {
		resp.GradeLevelDistribution = append(resp.GradeLevelDistribution, *gradeMap[g])
	}

	// 3. SHS Strand Distribution
	strandPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"grade_level": bson.M{"$gte": 11}}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$strand",
			"track": bson.M{"$first": "$track"},
			"count": bson.M{"$sum": 1},
		}}},
	}

	if cur, err := h.Students.Aggregate(ctx, strandPipeline); err == nil {
		defer cur.Close(ctx)
		type strandResult struct {
			Strand string `bson:"_id"`
			Track  string `bson:"track"`
			Count  int    `bson:"count"`
		}
		var sResults []strandResult
		if err := cur.All(ctx, &sResults); err == nil {
			shsTotal := float64(resp.Summary.SHSCount)
			if shsTotal == 0 {
				shsTotal = 1
			}
			for _, sr := range sResults {
				strandName := sr.Strand
				if strandName == "" {
					strandName = "Unassigned"
				}
				trackName := sr.Track
				if trackName == "" {
					trackName = "General / Pending"
				}
				pct := math.Round((float64(sr.Count)/shsTotal)*1000) / 10
				resp.TrackStrandDistribution = append(resp.TrackStrandDistribution, TrackStrandMetric{
					Strand:     strandName,
					Track:      trackName,
					Count:      sr.Count,
					Percentage: pct,
				})
			}
		}
	}

	// 4. Attendance Metrics & SARDO
	attPipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id":   "$status",
			"count": bson.M{"$sum": 1},
		}}},
	}

	var totalPresent, totalAbsent, totalLate, totalExcused, totalAttRecords int
	if cur, err := h.Attendance.Aggregate(ctx, attPipeline); err == nil {
		defer cur.Close(ctx)
		type attResult struct {
			Status string `bson:"_id"`
			Count  int    `bson:"count"`
		}
		var aResults []attResult
		if err := cur.All(ctx, &aResults); err == nil {
			for _, ar := range aResults {
				totalAttRecords += ar.Count
				switch ar.Status {
				case "present":
					totalPresent += ar.Count
				case "absent":
					totalAbsent += ar.Count
				case "late":
					totalLate += ar.Count
				case "excused":
					totalExcused += ar.Count
				}
			}
		}
	}

	if totalAttRecords > 0 {
		rate := (float64(totalPresent+totalLate) / float64(totalAttRecords)) * 100
		resp.Summary.AttendanceRate = math.Round(rate*10) / 10
	} else {
		resp.Summary.AttendanceRate = 100.0
	}

	// Recent daily attendance trend (last 7 recorded dates)
	trendPipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$date"},
			},
			"present": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "present"}}, 1, 0}}},
			"absent":  bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "absent"}}, 1, 0}}},
			"late":    bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "late"}}, 1, 0}}},
			"excused": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "excused"}}, 1, 0}}},
			"total":   bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: -1}}}},
		{{Key: "$limit", Value: 7}},
	}

	if cur, err := h.Attendance.Aggregate(ctx, trendPipeline); err == nil {
		defer cur.Close(ctx)
		type dayResult struct {
			Date    string `bson:"_id"`
			Present int    `bson:"present"`
			Absent  int    `bson:"absent"`
			Late    int    `bson:"late"`
			Excused int    `bson:"excused"`
			Total   int    `bson:"total"`
		}
		var days []dayResult
		if err := cur.All(ctx, &days); err == nil {
			// Reverse so it displays chronologically
			for i := len(days) - 1; i >= 0; i-- {
				d := days[i]
				rate := 0.0
				if d.Total > 0 {
					rate = math.Round((float64(d.Present+d.Late)/float64(d.Total))*1000) / 10
				}
				resp.RecentAttendanceTrend = append(resp.RecentAttendanceTrend, DailyAttendanceMetric{
					Date:           d.Date,
					Present:        d.Present,
					Absent:         d.Absent,
					Late:           d.Late,
					Excused:        d.Excused,
					Total:          d.Total,
					AttendanceRate: rate,
				})
			}
		}
	}

	// SARDO aggregation (learners with >= 5 absences)
	sardoPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "absent"}}},
		{{Key: "$group", Value: bson.M{
			"_id":      "$student_id",
			"absences": bson.M{"$sum": 1},
		}}},
		{{Key: "$match", Value: bson.M{"absences": bson.M{"$gte": 5}}}},
		{{Key: "$sort", Value: bson.D{{Key: "absences", Value: -1}}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "students",
			"localField":   "_id",
			"foreignField": "_id",
			"as":           "student",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$student", "preserveNullAndEmptyArrays": true}}},
	}

	if cur, err := h.Attendance.Aggregate(ctx, sardoPipeline); err == nil {
		defer cur.Close(ctx)
		type sardoResult struct {
			ID       primitive.ObjectID `bson:"_id"`
			Absences int                `bson:"absences"`
			Student  struct {
				LRN        string `bson:"lrn"`
				FirstName  string `bson:"first_name"`
				LastName   string `bson:"last_name"`
				GradeLevel int    `bson:"grade_level"`
				Sex        string `bson:"sex"`
			} `bson:"student"`
		}
		var sardoList []sardoResult
		if err := cur.All(ctx, &sardoList); err == nil {
			for idx, s := range sardoList {
				risk := "Moderate Risk"
				if s.Absences >= 10 {
					risk = "Critical (SARDO)"
					resp.Summary.CriticalSARDOCount++
				} else {
					resp.Summary.ModerateRiskCount++
				}

				if idx < 6 { // keep top 6 for dashboard highlight
					resp.RecentSARDORisks = append(resp.RecentSARDORisks, SARDORiskLearner{
						StudentID:  s.ID.Hex(),
						LRN:        s.Student.LRN,
						FirstName:  s.Student.FirstName,
						LastName:   s.Student.LastName,
						GradeLevel: s.Student.GradeLevel,
						Sex:        s.Student.Sex,
						Absences:   s.Absences,
						RiskLevel:  risk,
					})
				}
			}
		}
	}

	// 5. Grade Performance Snapshot
	gradePerfPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"final_grade": bson.M{"$ne": nil}}}},
		{{Key: "$group", Value: bson.M{
			"_id": nil,
			"outstanding": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$gte": bson.A{"$final_grade", 90}}, 1, 0,
			}}},
			"verySatisfactory": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$and": bson.A{
					bson.M{"$gte": bson.A{"$final_grade", 85}},
					bson.M{"$lt": bson.A{"$final_grade", 90}},
				}}, 1, 0,
			}}},
			"satisfactory": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$and": bson.A{
					bson.M{"$gte": bson.A{"$final_grade", 80}},
					bson.M{"$lt": bson.A{"$final_grade", 85}},
				}}, 1, 0,
			}}},
			"fairlySatisfactory": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$and": bson.A{
					bson.M{"$gte": bson.A{"$final_grade", 75}},
					bson.M{"$lt": bson.A{"$final_grade", 80}},
				}}, 1, 0,
			}}},
			"didNotMeet": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$lt": bson.A{"$final_grade", 75}}, 1, 0,
			}}},
			"total": bson.M{"$sum": 1},
		}}},
	}

	if cur, err := h.Grades.Aggregate(ctx, gradePerfPipeline); err == nil {
		defer cur.Close(ctx)
		type perfResult struct {
			Outstanding        int `bson:"outstanding"`
			VerySatisfactory   int `bson:"verySatisfactory"`
			Satisfactory       int `bson:"satisfactory"`
			FairlySatisfactory int `bson:"fairlySatisfactory"`
			DidNotMeet         int `bson:"didNotMeet"`
			Total              int `bson:"total"`
		}
		var pResults []perfResult
		if err := cur.All(ctx, &pResults); err == nil && len(pResults) > 0 {
			p := pResults[0]
			resp.GradePerformance.Outstanding = p.Outstanding
			resp.GradePerformance.VerySatisfactory = p.VerySatisfactory
			resp.GradePerformance.Satisfactory = p.Satisfactory
			resp.GradePerformance.FairlySatisfactory = p.FairlySatisfactory
			resp.GradePerformance.DidNotMeet = p.DidNotMeet
			resp.GradePerformance.TotalGrades = p.Total

			passed := p.Outstanding + p.VerySatisfactory + p.Satisfactory + p.FairlySatisfactory
			if p.Total > 0 {
				resp.GradePerformance.PassingRate = math.Round((float64(passed)/float64(p.Total))*1000) / 10
			}
		}
	}

	writeJSON(w, http.StatusOK, resp)
}
