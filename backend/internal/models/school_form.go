package models

// LearnerMonthlyAttendance represents one student's attendance row across all days of a month.
type LearnerMonthlyAttendance struct {
	Student       StudentSummary `json:"student"`
	DailyStatuses map[int]string `json:"dailyStatuses"` // day of month (1-31) -> "present" | "absent" | "late" | "excused" | ""
	TotalPresent  int            `json:"totalPresent"`
	TotalAbsent   int            `json:"totalAbsent"`
	TotalLate     int            `json:"totalLate"`
	Remarks       string         `json:"remarks,omitempty"`
}

// SF2MonthlySummary stores statistical totals required by DepEd Form 2.
type SF2MonthlySummary struct {
	TotalEnrolment         int     `json:"totalEnrolment"`
	MaleEnrolment          int     `json:"maleEnrolment"`
	FemaleEnrolment        int     `json:"femaleEnrolment"`
	TotalSchoolDays        int     `json:"totalSchoolDays"`
	MaleDaysPresent        int     `json:"maleDaysPresent"`
	FemaleDaysPresent      int     `json:"femaleDaysPresent"`
	TotalDaysPresent       int     `json:"totalDaysPresent"`
	AverageDailyAttendance float64 `json:"averageDailyAttendance"` // ADA = Total Present / Total School Days
	AttendancePercentage   float64 `json:"attendancePercentage"`   // (Total Present / (Enrolment * School Days)) * 100
	ConsecutiveAbsentCount int     `json:"consecutiveAbsentCount"` // learners with 5+ absences
}

// SchoolFormSF2 represents official DepEd School Form 2 (Daily Attendance Report of Learners).
type SchoolFormSF2 struct {
	Section         SectionWithAdviser         `json:"section"`
	Month           int                        `json:"month"`
	MonthName       string                     `json:"monthName"`
	Year            int                        `json:"year"`
	SchoolYear      string                     `json:"schoolYear"`
	DaysInMonth     int                        `json:"daysInMonth"`
	SchoolDays      []int                      `json:"schoolDays"` // weekdays in month
	MaleLearners    []LearnerMonthlyAttendance `json:"maleLearners"`
	FemaleLearners  []LearnerMonthlyAttendance `json:"femaleLearners"`
	Summary         SF2MonthlySummary          `json:"summary"`
}

// ScholasticYearRecord represents one school year block in an SF10 permanent record.
type ScholasticYearRecord struct {
	GradeLevel     int           `json:"gradeLevel"`
	SchoolYear     string        `json:"schoolYear"`
	SectionName    string        `json:"sectionName"`
	AdviserName    string        `json:"adviserName"`
	Grades         []GradeRecord `json:"grades"`
	GeneralAverage *float64      `json:"generalAverage,omitempty"`
	Descriptor     string        `json:"descriptor,omitempty"`
	Remarks        string        `json:"remarks,omitempty"` // Promoted to Grade X, Retained
}

// SchoolFormSF10 represents official DepEd Form 10 (Learner's Permanent Academic Record / Form 137).
type SchoolFormSF10 struct {
	Student            Student                `json:"student"`
	ScholasticHistory  []ScholasticYearRecord `json:"scholasticHistory"`
	CurrentGrade       int                    `json:"currentGrade"`
	GraduationEligible bool                   `json:"graduationEligible"`
}
