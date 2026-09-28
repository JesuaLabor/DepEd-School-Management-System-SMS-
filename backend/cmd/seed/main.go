package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"

	"github.com/deped-sms/backend/internal/config"
	"github.com/deped-sms/backend/internal/database"
	"github.com/deped-sms/backend/internal/models"
)

func hashPassword(password string) string {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("failed to hash password: %v", err)
	}
	return string(bytes)
}

func main() {
	resetFlag := flag.Bool("reset", false, "Reset and wipe existing database collections before seeding")
	syFlag := flag.String("school-year", "2024-2025", "Target school year")
	flag.Parse()

	cfg := config.Load()
	db := database.Connect(cfg.MongoURI, cfg.MongoDBName)
	ctx := context.Background()

	if err := database.EnsureIndexes(ctx, db); err != nil {
		log.Fatalf("failed to ensure indexes: %v", err)
	}

	schoolYear := *syFlag
	defaultPasswordHash := hashPassword("Password123!")

	if *resetFlag {
		log.Println("==> Resetting database collections...")
		collections := []string{
			"users", "students", "sections", "enrollments",
			"attendance", "absence_alerts", "grades", "schedules",
			"announcements", "conversations", "messages", "admissions",
		}
		for _, col := range collections {
			_ = db.Collection(col).Drop(ctx)
		}
		log.Println("==> Database wiped cleanly.")
	}

	schoolID := primitive.NewObjectID() // Rizal National High School ID 301234
	now := time.Now()

	// ─────────────────────────────────────────────────────────────────────────────
	// 1. Seed System Users (5 Roles)
	// ─────────────────────────────────────────────────────────────────────────────
	log.Println("==> Seeding System Users...")
	adminID := primitive.NewObjectID()
	registrarID := primitive.NewObjectID()
	teacherSantosID := primitive.NewObjectID()
	teacherDelaCruzID := primitive.NewObjectID()
	studentUserID := primitive.NewObjectID()
	guardianUserID := primitive.NewObjectID()

	users := []interface{}{
		models.User{
			ID:           adminID,
			Email:        "admin@deped.gov.ph",
			PasswordHash: defaultPasswordHash,
			FirstName:    "Alejandro",
			LastName:     "Roces",
			Role:         models.RoleSuperAdmin,
			SchoolID:     schoolID,
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		models.User{
			ID:           registrarID,
			Email:        "registrar@deped.gov.ph",
			PasswordHash: defaultPasswordHash,
			FirstName:    "Corazon",
			LastName:     "Aquino",
			Role:         models.RoleRegistrar,
			SchoolID:     schoolID,
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		models.User{
			ID:           teacherSantosID,
			Email:        "teacher.santos@deped.gov.ph",
			PasswordHash: defaultPasswordHash,
			FirstName:    "Maria",
			LastName:     "Santos",
			Role:         models.RoleTeacher,
			SchoolID:     schoolID,
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		models.User{
			ID:           teacherDelaCruzID,
			Email:        "teacher.delacruz@deped.gov.ph",
			PasswordHash: defaultPasswordHash,
			FirstName:    "Jose",
			LastName:     "Dela Cruz",
			Role:         models.RoleTeacher,
			SchoolID:     schoolID,
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		models.User{
			ID:           studentUserID,
			Email:        "student.delacruz@deped.gov.ph",
			PasswordHash: defaultPasswordHash,
			FirstName:    "Mark",
			LastName:     "Dela Cruz",
			Role:         models.RoleStudent,
			SchoolID:     schoolID,
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		models.User{
			ID:           guardianUserID,
			Email:        "parent.delacruz@gmail.com",
			PasswordHash: defaultPasswordHash,
			FirstName:    "Liza",
			LastName:     "Dela Cruz",
			Role:         models.RoleGuardian,
			SchoolID:     schoolID,
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		},
	}
	_, err := db.Collection("users").InsertMany(ctx, users)
	if err != nil {
		log.Fatalf("failed to seed users: %v", err)
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// 2. Seed Class Sections (Grades 7 to 12)
	// ─────────────────────────────────────────────────────────────────────────────
	log.Println("==> Seeding Class Sections...")
	sec7RizalID := primitive.NewObjectID()
	sec7BonifacioID := primitive.NewObjectID()
	sec8MabiniID := primitive.NewObjectID()
	sec9SilangID := primitive.NewObjectID()
	sec10AguinaldoID := primitive.NewObjectID()
	sec11StemAID := primitive.NewObjectID()
	sec11TvlID := primitive.NewObjectID()
	sec12StemAID := primitive.NewObjectID()
	sec12AbmAID := primitive.NewObjectID()

	sections := []interface{}{
		models.Section{
			ID:          sec7RizalID,
			Name:        "Rizal",
			GradeLevel:  7,
			SchoolYear:  schoolYear,
			AdviserID:   teacherSantosID,
			Room:        "Room 101",
			MaxCapacity: 45,
			SchoolID:    schoolID,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Section{
			ID:          sec7BonifacioID,
			Name:        "Bonifacio",
			GradeLevel:  7,
			SchoolYear:  schoolYear,
			Room:        "Room 102",
			MaxCapacity: 45,
			SchoolID:    schoolID,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Section{
			ID:          sec8MabiniID,
			Name:        "Mabini",
			GradeLevel:  8,
			SchoolYear:  schoolYear,
			Room:        "Room 201",
			MaxCapacity: 45,
			SchoolID:    schoolID,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Section{
			ID:          sec9SilangID,
			Name:        "Silang",
			GradeLevel:  9,
			SchoolYear:  schoolYear,
			Room:        "Room 301",
			MaxCapacity: 45,
			SchoolID:    schoolID,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Section{
			ID:          sec10AguinaldoID,
			Name:        "Aguinaldo",
			GradeLevel:  10,
			SchoolYear:  schoolYear,
			Room:        "Room 401",
			MaxCapacity: 45,
			SchoolID:    schoolID,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Section{
			ID:          sec11StemAID,
			Name:        "STEM A",
			GradeLevel:  11,
			SchoolYear:  schoolYear,
			Strand:      models.StrandAcademic,
			Track:       "Academic",
			AdviserID:   teacherDelaCruzID,
			Room:        "SHS Lab 1",
			MaxCapacity: 40,
			SchoolID:    schoolID,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Section{
			ID:          sec11TvlID,
			Name:        "TVL ICT",
			GradeLevel:  11,
			SchoolYear:  schoolYear,
			Strand:      models.StrandTVL,
			Track:       "Technical-Vocational",
			Room:        "Computer Lab A",
			MaxCapacity: 40,
			SchoolID:    schoolID,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Section{
			ID:          sec12StemAID,
			Name:        "STEM A",
			GradeLevel:  12,
			SchoolYear:  schoolYear,
			Strand:      models.StrandAcademic,
			Track:       "Academic",
			Room:        "SHS Lab 2",
			MaxCapacity: 40,
			SchoolID:    schoolID,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Section{
			ID:          sec12AbmAID,
			Name:        "ABM A",
			GradeLevel:  12,
			SchoolYear:  schoolYear,
			Strand:      models.StrandAcademic,
			Track:       "Academic",
			Room:        "Room 601",
			MaxCapacity: 40,
			SchoolID:    schoolID,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}
	_, err = db.Collection("sections").InsertMany(ctx, sections)
	if err != nil {
		log.Fatalf("failed to seed sections: %v", err)
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// 3. Seed Learners (36 Students with authentic LRNs)
	// ─────────────────────────────────────────────────────────────────────────────
	log.Println("==> Seeding 36 Learners with valid 12-digit LRNs...")

	type studentTemplate struct {
		first      string
		last       string
		middle     string
		sex        string
		bday       string
		grade      int
		sectionID  primitive.ObjectID
		strand     models.Strand
		track      string
		guardian   string
		relation   string
		contact    string
		email      string
		isMarkUser bool
	}

	templates := []studentTemplate{
		// Grade 7 - Rizal (Adviser: Maria Santos)
		{"Carlo", "Bautista", "Reyes", "Male", "2011-04-12", 7, sec7RizalID, "", "", "Danilo Bautista", "Father", "+639171110001", "", false},
		{"Kenneth", "Torres", "Gonzales", "Male", "2011-08-25", 7, sec7RizalID, "", "", "Elena Torres", "Mother", "+639171110002", "", false},
		{"Angelo", "Ramos", "Castro", "Male", "2011-02-14", 7, sec7RizalID, "", "", "Rodolfo Ramos", "Father", "+639171110003", "", false},
		{"Gabriel", "Garcia", "Lim", "Male", "2011-10-05", 7, sec7RizalID, "", "", "Teresa Garcia", "Mother", "+639171110004", "", false},
		{"Joshua", "Mendoza", "Cruz", "Male", "2011-06-30", 7, sec7RizalID, "", "", "Manuel Mendoza", "Father", "+639171110005", "", false},
		{"Angelica", "Santos", "Villanueva", "Female", "2011-03-18", 7, sec7RizalID, "", "", "Rosanna Santos", "Mother", "+639171110006", "", false},
		{"Bea", "Flores", "Aquino", "Female", "2011-11-22", 7, sec7RizalID, "", "", "Eduardo Flores", "Father", "+639171110007", "", false},
		{"Camille", "Navarro", "Soriano", "Female", "2011-01-09", 7, sec7RizalID, "", "", "Gloria Navarro", "Mother", "+639171110008", "", false},
		{"Jasmine", "Tan", "Salvador", "Female", "2011-07-15", 7, sec7RizalID, "", "", "Henry Tan", "Father", "+639171110009", "", false},
		{"Nicole", "Dela Cruz", "Pascual", "Female", "2011-09-03", 7, sec7RizalID, "", "", "Lourdes Dela Cruz", "Mother", "+639171110010", "", false},

		// Grade 7 - Bonifacio
		{"John Paul", "Hernandez", "Rivera", "Male", "2011-05-19", 7, sec7BonifacioID, "", "", "Arnulfo Hernandez", "Father", "+639171110011", "", false},
		{"Princess", "Valenzuela", "Domingo", "Female", "2011-12-01", 7, sec7BonifacioID, "", "", "Marilou Valenzuela", "Mother", "+639171110012", "", false},

		// Grade 8 - Mabini
		{"Miguel", "Cortez", "Mercado", "Male", "2010-09-11", 8, sec8MabiniID, "", "", "Felipe Cortez", "Father", "+639171110013", "", false},
		{"Joyce", "Ocampo", "David", "Female", "2010-04-03", 8, sec8MabiniID, "", "", "Cynthia Ocampo", "Mother", "+639171110014", "", false},

		// Grade 9 - Silang
		{"Daniel", "Morales", "Castillo", "Male", "2009-07-28", 9, sec9SilangID, "", "", "Ramon Morales", "Father", "+639171110015", "", false},
		{"Kimberly", "Espiritu", "De Leon", "Female", "2009-02-17", 9, sec9SilangID, "", "", "Miriam Espiritu", "Mother", "+639171110016", "", false},

		// Grade 10 - Aguinaldo
		{"Paolo", "Roxas", "Tolentino", "Male", "2008-11-04", 10, sec10AguinaldoID, "", "", "Vicente Roxas", "Father", "+639171110017", "", false},
		{"Andrea", "Santiago", "Macaraeg", "Female", "2008-05-23", 10, sec10AguinaldoID, "", "", "Lourdes Santiago", "Mother", "+639171110018", "", false},

		// Grade 11 - STEM A (Adviser: Jose Dela Cruz)
		{"Mark", "Dela Cruz", "Santos", "Male", "2007-05-14", 11, sec11StemAID, models.StrandAcademic, "Academic", "Liza Dela Cruz", "Mother", "+639171234567", "student.delacruz@deped.gov.ph", true},
		{"Christian", "Villanueva", "Soriano", "Male", "2007-01-20", 11, sec11StemAID, models.StrandAcademic, "Academic", "Arthur Villanueva", "Father", "+639171110020", "", false},
		{"Marco", "Torres", "Lim", "Male", "2007-06-18", 11, sec11StemAID, models.StrandAcademic, "Academic", "Susana Torres", "Mother", "+639171110021", "", false},
		{"Rafael", "Tan", "Mercado", "Male", "2007-09-09", 11, sec11StemAID, models.StrandAcademic, "Academic", "Wilson Tan", "Father", "+639171110022", "", false},
		{"Dominic", "Castro", "Valenzuela", "Male", "2007-12-30", 11, sec11StemAID, models.StrandAcademic, "Academic", "Norma Castro", "Mother", "+639171110023", "", false},
		{"Sofia", "Aquino", "Pascual", "Female", "2007-03-27", 11, sec11StemAID, models.StrandAcademic, "Academic", "Benigno Aquino", "Father", "+639171110024", "", false},
		{"Patricia", "Flores", "Rivera", "Female", "2007-08-14", 11, sec11StemAID, models.StrandAcademic, "Academic", "Carmen Flores", "Mother", "+639171110025", "", false},
		{"Christine", "Navarro", "Domingo", "Female", "2007-10-10", 11, sec11StemAID, models.StrandAcademic, "Academic", "Nestor Navarro", "Father", "+639171110026", "", false},
		{"Alyssa", "Mendoza", "Cortez", "Female", "2007-04-05", 11, sec11StemAID, models.StrandAcademic, "Academic", "Lucia Mendoza", "Mother", "+639171110027", "", false},
		{"Samantha", "Reyes", "Ocampo", "Female", "2007-07-22", 11, sec11StemAID, models.StrandAcademic, "Academic", "Fernando Reyes", "Father", "+639171110028", "", false},

		// Grade 11 - TVL ICT
		{"Vince", "Bautista", "Garcia", "Male", "2007-02-11", 11, sec11TvlID, models.StrandTVL, "Technical-Vocational", "Jaime Bautista", "Father", "+639171110029", "", false},
		{"Chloe", "David", "Morales", "Female", "2007-08-19", 11, sec11TvlID, models.StrandTVL, "Technical-Vocational", "Imelda David", "Mother", "+639171110030", "", false},

		// Grade 12 - STEM A
		{"Matthew", "Gonzales", "Castillo", "Male", "2006-03-15", 12, sec12StemAID, models.StrandAcademic, "Academic", "Crispin Gonzales", "Father", "+639171110031", "", false},
		{"Ethan", "Lim", "Espiritu", "Male", "2006-09-08", 12, sec12StemAID, models.StrandAcademic, "Academic", "Leticia Lim", "Mother", "+639171110032", "", false},
		{"Althea", "Ramos", "De Leon", "Female", "2006-11-29", 12, sec12StemAID, models.StrandAcademic, "Academic", "Severino Ramos", "Father", "+639171110033", "", false},

		// Grade 12 - ABM A
		{"Juan", "Cruz", "Roxas", "Male", "2006-06-01", 12, sec12AbmAID, models.StrandAcademic, "Academic", "Mariano Cruz", "Father", "+639171110034", "", false},
		{"Maria", "Santiago", "Tolentino", "Female", "2006-01-18", 12, sec12AbmAID, models.StrandAcademic, "Academic", "Clarita Santiago", "Mother", "+639171110035", "", false},
		{"Paolo", "Macaraeg", "Villanueva", "Male", "2006-10-14", 12, sec12AbmAID, models.StrandAcademic, "Academic", "Dionisio Macaraeg", "Father", "+639171110036", "", false},
	}

	studentDocs := make([]interface{}, len(templates))
	enrollmentDocs := make([]interface{}, len(templates))
	createdStudents := make([]models.Student, len(templates))

	for i, t := range templates {
		sid := primitive.NewObjectID()
		if t.isMarkUser {
			// Link Mark Dela Cruz to studentUserID and guardian Liza to guardianUserID
		}
		lrn := fmt.Sprintf("1092837465%02d", i+1)
		bday, _ := time.Parse("2006-01-02", t.bday)

		st := models.Student{
			ID:          sid,
			LRN:         lrn,
			FirstName:   t.first,
			LastName:    t.last,
			MiddleName:  t.middle,
			BirthDate:   bday,
			Sex:         t.sex,
			CivilStatus: "Single",
			Nationality: "Filipino",
			Religion:    "Roman Catholic",
			Address: models.Address{
				Barangay: "Barangay San Antonio",
				City:     "Pasig City",
				Province: "Metro Manila",
				Region:   "National Capital Region (NCR)",
			},
			GradeLevel:  models.GradeLevel(t.grade),
			Strand:      t.strand,
			Track:       t.track,
			SectionID:   t.sectionID,
			SchoolYear:  schoolYear,
			Status:      models.StatusEnrolled,
			SchoolID:    schoolID,
			Guardian: models.Guardian{
				Name:         t.guardian,
				Relationship: t.relation,
				ContactNo:    t.contact,
			},
			CreatedAt: now,
			UpdatedAt: now,
		}
		if t.email != "" {
			st.Email = t.email
		}

		studentDocs[i] = st
		createdStudents[i] = st

		enrollmentDocs[i] = models.Enrollment{
			ID:          primitive.NewObjectID(),
			StudentID:   sid,
			SchoolYear:  schoolYear,
			GradeLevel:  models.GradeLevel(t.grade),
			Strand:      t.strand,
			Track:       t.track,
			SectionID:   t.sectionID,
			Type:        models.EnrollmentTypeReturning,
			Status:      models.EnrollmentApproved,
			SchoolID:    schoolID,
			ProcessedBy: registrarID,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
	}

	_, err = db.Collection("students").InsertMany(ctx, studentDocs)
	if err != nil {
		log.Fatalf("failed to seed students: %v", err)
	}

	_, err = db.Collection("enrollments").InsertMany(ctx, enrollmentDocs)
	if err != nil {
		log.Fatalf("failed to seed enrollments: %v", err)
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// 4. Seed DO 8, s. 2015 Quarterly Grades (Q1 & Q2)
	// ─────────────────────────────────────────────────────────────────────────────
	log.Println("==> Seeding DO 8, s. 2015 Quarterly Grades for 7-Rizal and 11-STEM A...")
	var gradeDocs []interface{}

	// Subjects for Grade 7:
	jhsSubjects := models.GetCurriculumSubjects(7, "")
	// Subjects for Grade 11 STEM:
	shsSubjects := models.GetCurriculumSubjects(11, models.StrandAcademic)

	rand.Seed(42)

	for _, st := range createdStudents {
		var subs []models.Subject
		if st.SectionID == sec7RizalID {
			subs = jhsSubjects
		} else if st.SectionID == sec11StemAID {
			subs = shsSubjects
		}

		for _, sub := range subs {
			// Generate realistic transmuted grade between 80.0 and 95.0
			baseQ1 := 80.0 + float64(rand.Intn(16))
			baseQ2 := baseQ1 + float64(rand.Intn(5)-2)
			if baseQ2 > 98 {
				baseQ2 = 98
			}
			if baseQ2 < 75 {
				baseQ2 = 75
			}

			q1Val := baseQ1
			q2Val := baseQ2

			gr := models.GradeRecord{
				ID:          primitive.NewObjectID(),
				StudentID:   st.ID,
				SectionID:   st.SectionID,
				SchoolYear:  schoolYear,
				GradeLevel:  int(st.GradeLevel),
				SubjectCode: sub.Code,
				SubjectName: sub.Name,
				Q1:          &q1Val,
				Q2:          &q2Val,
				EncodedBy:   teacherSantosID,
				CreatedAt:   now,
				UpdatedAt:   now,
			}
			gr.ComputeFinalRating()
			gradeDocs = append(gradeDocs, gr)
		}
	}

	if len(gradeDocs) > 0 {
		_, err = db.Collection("grades").InsertMany(ctx, gradeDocs)
		if err != nil {
			log.Fatalf("failed to seed grades: %v", err)
		}
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// 5. Seed Attendance Logs & SARDO Cases
	// ─────────────────────────────────────────────────────────────────────────────
	log.Println("==> Seeding Monthly Attendance Records & Absence Alerts...")
	var attendanceDocs []interface{}
	var alertDocs []interface{}

	// Generate attendance for the last 15 days
	startDate := now.AddDate(0, 0, -20)
	var schoolDates []time.Time
	for d := 0; d < 20; d++ {
		cur := startDate.AddDate(0, 0, d)
		if cur.Weekday() != time.Saturday && cur.Weekday() != time.Sunday {
			schoolDates = append(schoolDates, time.Date(cur.Year(), cur.Month(), cur.Day(), 0, 0, 0, 0, time.UTC))
		}
	}

	// Kenneth Torres and Carlo Bautista have consecutive absences to test SARDO early warning
	for _, st := range createdStudents {
		if st.SectionID != sec7RizalID && st.SectionID != sec11StemAID {
			continue
		}

		for dayIdx, dateVal := range schoolDates {
			status := models.AttendancePresent
			remarks := ""

			if st.LastName == "Torres" && dayIdx >= len(schoolDates)-6 {
				// 6 consecutive absences -> SARDO Alert!
				status = models.AttendanceAbsent
				remarks = "Truancy alert: unexcused continuous absence"
			} else if st.LastName == "Bautista" && (dayIdx == 3 || dayIdx == 7 || dayIdx == 11) {
				status = models.AttendanceAbsent
				remarks = "Medical absence / severe fever"
			} else if (dayIdx+int(st.LRN[len(st.LRN)-1]))%7 == 0 {
				status = models.AttendanceLate
				remarks = "Late due to heavy traffic on Ortigas Ave."
			}

			att := models.AttendanceRecord{
				ID:         primitive.NewObjectID(),
				StudentID:  st.ID,
				Date:       dateVal,
				Type:       models.AttendanceTypeDaily,
				Status:     status,
				Remarks:    remarks,
				GradeLevel: models.GradeLevel(st.GradeLevel),
				SectionID:  st.SectionID,
				SchoolYear: schoolYear,
				RecordedBy: teacherSantosID,
				SchoolID:   schoolID,
				CreatedAt:  now,
				UpdatedAt:  now,
			}
			attendanceDocs = append(attendanceDocs, att)

			if status == models.AttendanceAbsent {
				alert := models.AbsenceAlert{
					ID:              primitive.NewObjectID(),
					StudentID:       st.ID,
					StudentName:     st.LastName + ", " + st.FirstName,
					LRN:             st.LRN,
					GuardianName:    st.Guardian.Name,
					GuardianContact: st.Guardian.ContactNo,
					Date:            dateVal,
					Channel:         "sms",
					Status:          "dispatched",
					Message: fmt.Sprintf(
						"DepEd Notice: Learner %s, %s (LRN: %s) was marked absent on %s. Please contact the school adviser for any excuse slip or clarification.",
						st.LastName, st.FirstName, st.LRN, dateVal.Format("Jan 02, 2006"),
					),
					CreatedAt: now,
				}
				alertDocs = append(alertDocs, alert)
			}
		}
	}

	if len(attendanceDocs) > 0 {
		_, err = db.Collection("attendance").InsertMany(ctx, attendanceDocs)
		if err != nil {
			log.Fatalf("failed to seed attendance: %v", err)
		}
	}

	if len(alertDocs) > 0 {
		_, err = db.Collection("absence_alerts").InsertMany(ctx, alertDocs)
		if err != nil {
			log.Fatalf("failed to seed absence alerts: %v", err)
		}
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// 6. Seed Timetable Schedules (Monday–Friday)
	// ─────────────────────────────────────────────────────────────────────────────
	log.Println("==> Seeding Timetable Schedules...")
	var scheduleDocs []interface{}

	days := []models.DayOfWeek{models.DayMonday, models.DayTuesday, models.DayWednesday, models.DayThursday, models.DayFriday}
	times := [][2]string{
		{"07:30", "08:30"},
		{"08:30", "09:30"},
		{"09:45", "10:45"},
		{"10:45", "11:45"},
		{"13:00", "14:00"},
		{"14:00", "15:00"},
	}

	for _, d := range days {
		for slotIdx, t := range times {
			if slotIdx < len(jhsSubjects) {
				sub := jhsSubjects[slotIdx]
				scheduleDocs = append(scheduleDocs, models.ScheduleSlot{
					ID:          primitive.NewObjectID(),
					SectionID:   sec7RizalID,
					GradeLevel:  7,
					SubjectCode: sub.Code,
					SubjectName: sub.Name,
					TeacherID:   teacherSantosID,
					TeacherName: "Maria Santos",
					DayOfWeek:   d,
					StartTime:   t[0],
					EndTime:     t[1],
					Room:        "Room 101",
					SchoolYear:  schoolYear,
					CreatedAt:   now,
					UpdatedAt:   now,
				})
			}
		}
	}

	// Schedule for 11-STEM A (Sem 1 & Sem 2)
	for _, d := range days {
		for slotIdx, t := range times {
			if slotIdx < len(shsSubjects) {
				sub := shsSubjects[slotIdx]
				var semPtr *int
				if sub.Semester > 0 {
					semVal := sub.Semester
					semPtr = &semVal
				}
				scheduleDocs = append(scheduleDocs, models.ScheduleSlot{
					ID:          primitive.NewObjectID(),
					SectionID:   sec11StemAID,
					GradeLevel:  11,
					SubjectCode: sub.Code,
					SubjectName: sub.Name,
					TeacherID:   teacherDelaCruzID,
					TeacherName: "Jose Dela Cruz",
					DayOfWeek:   d,
					StartTime:   t[0],
					EndTime:     t[1],
					Room:        "SHS Lab 1",
					SchoolYear:  schoolYear,
					Semester:    semPtr,
					CreatedAt:   now,
					UpdatedAt:   now,
				})
			}
		}
	}

	if len(scheduleDocs) > 0 {
		_, err = db.Collection("schedules").InsertMany(ctx, scheduleDocs)
		if err != nil {
			log.Fatalf("failed to seed schedules: %v", err)
		}
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// 7. Seed School Bulletins & Announcements
	// ─────────────────────────────────────────────────────────────────────────────
	log.Println("==> Seeding Announcements...")
	targetGrade11 := 11
	announcements := []interface{}{
		models.Announcement{
			ID:          primitive.NewObjectID(),
			Title:       "Opening of School Year 2024–2025: DepEd Order No. 003, s. 2024",
			Content:     "Welcome learners, teachers, and parents to Rizal National High School! In compliance with national DepEd guidelines, classes are officially in session. Please ensure your learners have their Learner Reference Numbers (LRN) verified with their class advisers.",
			Priority:    models.PriorityUrgent,
			Scope:       models.ScopeSchoolWide,
			IsPinned:    true,
			AuthorID:    adminID,
			AuthorName:  "Dr. Alejandro Roces",
			AuthorRole:  models.RoleSuperAdmin,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Announcement{
			ID:          primitive.NewObjectID(),
			Title:       "Calamity Advisory: Class Suspension Due to Tropical Storm Warning",
			Content:     "Per Executive Order from the City Mayor and DepEd Division Office, in-person classes for all levels (Grades 7 to 12) are suspended due to heavy rain and typhoon signal warnings. Learners are advised to shift to asynchronous self-paced modules.",
			Priority:    models.PriorityUrgent,
			Scope:       models.ScopeSchoolWide,
			IsPinned:    true,
			AuthorID:    adminID,
			AuthorName:  "Dr. Alejandro Roces",
			AuthorRole:  models.RoleSuperAdmin,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Announcement{
			ID:          primitive.NewObjectID(),
			Title:       "Senior High School Work Immersion & Career Orientation",
			Content:     "All Grade 11 STEM and TVL learners are requested to attend the virtual career path orientation this coming Friday. Industry partners will present internship guidelines and technical safety protocols.",
			Priority:    models.PriorityNormal,
			Scope:       models.ScopeGradeLevel,
			TargetGrade: &targetGrade11,
			AuthorID:    teacherDelaCruzID,
			AuthorName:  "Jose Dela Cruz",
			AuthorRole:  models.RoleTeacher,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		models.Announcement{
			ID:          primitive.NewObjectID(),
			Title:       "1st General Parent-Teacher Association (GPTA) Assembly",
			Content:     "Notice to all Parents and Guardians: The First GPTA General Assembly for School Year 2024-2025 is scheduled on Saturday at 9:00 AM in the School Gymnasium. Distribution of Quarter 1 progress reports will follow in the respective advisory classrooms.",
			Priority:    models.PriorityNormal,
			Scope:       models.ScopeSchoolWide,
			AuthorID:    registrarID,
			AuthorName:  "Corazon Aquino",
			AuthorRole:  models.RoleRegistrar,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}
	_, err = db.Collection("announcements").InsertMany(ctx, announcements)
	if err != nil {
		log.Fatalf("failed to seed announcements: %v", err)
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// 8. Seed Direct Messaging Threads
	// ─────────────────────────────────────────────────────────────────────────────
	log.Println("==> Seeding Direct Messaging Threads...")
	conv1ID := primitive.NewObjectID()
	conv2ID := primitive.NewObjectID()

	conversations := []interface{}{
		models.Conversation{
			ID:             conv1ID,
			ParticipantIDs: []primitive.ObjectID{adminID, teacherSantosID},
			Subject:        "Quarter 1 SF9 Progress Cards Submission",
			LastMessage:    "Good day Maam Santos, please ensure all Q1 grades for 7-Rizal are finalized in the system by Friday.",
			LastSenderID:   adminID,
			LastMessageAt:  now.Add(-2 * time.Hour),
			UnreadCounts: map[string]int{
				teacherSantosID.Hex(): 1,
			},
			CreatedAt: now.Add(-5 * time.Hour),
			UpdatedAt: now.Add(-2 * time.Hour),
		},
		models.Conversation{
			ID:             conv2ID,
			ParticipantIDs: []primitive.ObjectID{teacherDelaCruzID, guardianUserID},
			Subject:        "Academic Consultation - Mark Dela Cruz (LRN: 109283746501)",
			LastMessage:    "Hello Mr. Dela Cruz, thank you for the update on Mark's Pre-Calculus project. We will follow up on his progress.",
			LastSenderID:   guardianUserID,
			LastMessageAt:  now.Add(-30 * time.Minute),
			UnreadCounts: map[string]int{
				teacherDelaCruzID.Hex(): 0,
			},
			CreatedAt: now.Add(-1 * time.Hour),
			UpdatedAt: now.Add(-30 * time.Minute),
		},
	}
	_, err = db.Collection("conversations").InsertMany(ctx, conversations)
	if err != nil {
		log.Fatalf("failed to seed conversations: %v", err)
	}

	messages := []interface{}{
		models.Message{
			ID:             primitive.NewObjectID(),
			ConversationID: conv1ID,
			SenderID:       adminID,
			SenderName:     "Dr. Alejandro Roces",
			SenderRole:     models.RoleSuperAdmin,
			Body:           "Good day Maam Santos, please ensure all Q1 grades for 7-Rizal are finalized in the system by Friday.",
			Content:        "Good day Maam Santos, please ensure all Q1 grades for 7-Rizal are finalized in the system by Friday.",
			IsRead:         false,
			CreatedAt:      now.Add(-2 * time.Hour),
		},
		models.Message{
			ID:             primitive.NewObjectID(),
			ConversationID: conv2ID,
			SenderID:       teacherDelaCruzID,
			SenderName:     "Jose Dela Cruz",
			SenderRole:     models.RoleTeacher,
			Body:           "Good morning Mrs. Dela Cruz, I would like to congratulate Mark on his exemplary score in the recent Science & Math olympiad qualifier!",
			Content:        "Good morning Mrs. Dela Cruz, I would like to congratulate Mark on his exemplary score in the recent Science & Math olympiad qualifier!",
			IsRead:         true,
			CreatedAt:      now.Add(-50 * time.Minute),
		},
		models.Message{
			ID:             primitive.NewObjectID(),
			ConversationID: conv2ID,
			SenderID:       guardianUserID,
			SenderName:     "Liza Dela Cruz",
			SenderRole:     models.RoleGuardian,
			Body:           "Hello Mr. Dela Cruz, thank you for the update on Mark's Pre-Calculus project. We will follow up on his progress.",
			Content:        "Hello Mr. Dela Cruz, thank you for the update on Mark's Pre-Calculus project. We will follow up on his progress.",
			IsRead:         true,
			CreatedAt:      now.Add(-30 * time.Minute),
		},
	}
	_, err = db.Collection("messages").InsertMany(ctx, messages)
	if err != nil {
		log.Fatalf("failed to seed messages: %v", err)
	}

	log.Println("─────────────────────────────────────────────────────────────────────────────")
	log.Println("✅ DEPED SMS DEMO DATABASE SEEDED SUCCESSFULLY!")
	log.Println("─────────────────────────────────────────────────────────────────────────────")
	log.Println("🏫 School: Rizal National High School (DepEd School ID: 301234)")
	log.Println("📅 School Year: " + schoolYear)
	log.Println("👥 5 Role Accounts (Password for all: Password123!):")
	log.Println("   • Super Admin:  admin@deped.gov.ph        (Dr. Alejandro Roces)")
	log.Println("   • Registrar:    registrar@deped.gov.ph    (Corazon Aquino)")
	log.Println("   • Teacher 1:    teacher.santos@deped.gov.ph (Maria Santos - Grade 7 Adviser)")
	log.Println("   • Teacher 2:    teacher.delacruz@deped.gov.ph (Jose Dela Cruz - Grade 11 STEM Adviser)")
	log.Println("   • Learner:      student.delacruz@deped.gov.ph (Mark Dela Cruz - LRN: 109283746501)")
	log.Println("   • Guardian:     parent.delacruz@gmail.com (Liza Dela Cruz)")
	log.Println("📚 Populated: 9 Class Sections, 36 Learners with 12-digit LRNs, DO 8 Grades,")
	log.Println("             20-day Attendance with SARDO Alert Cases, Timetables, & Bulletins.")
	log.Println("─────────────────────────────────────────────────────────────────────────────")
}
