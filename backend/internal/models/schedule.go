package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DayOfWeek string

const (
	DayMonday    DayOfWeek = "Monday"
	DayTuesday   DayOfWeek = "Tuesday"
	DayWednesday DayOfWeek = "Wednesday"
	DayThursday  DayOfWeek = "Thursday"
	DayFriday    DayOfWeek = "Friday"
)

// ScheduleSlot represents one scheduled subject period in a section's weekly timetable.
type ScheduleSlot struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	SectionID   primitive.ObjectID `bson:"section_id"             json:"sectionId"`
	SectionName string             `bson:"section_name,omitempty" json:"sectionName,omitempty"`
	GradeLevel  int                `bson:"grade_level"            json:"gradeLevel"`
	SubjectCode string             `bson:"subject_code"           json:"subjectCode"`
	SubjectName string             `bson:"subject_name"           json:"subjectName"`
	TeacherID   primitive.ObjectID `bson:"teacher_id"             json:"teacherId"`
	TeacherName string             `bson:"teacher_name"           json:"teacherName"`
	DayOfWeek   DayOfWeek          `bson:"day_of_week"            json:"dayOfWeek"`
	StartTime   string             `bson:"start_time"             json:"startTime"` // "HH:MM" e.g. "07:30"
	EndTime     string             `bson:"end_time"               json:"endTime"`   // "HH:MM" e.g. "08:30"
	Room        string             `bson:"room,omitempty"         json:"room,omitempty"`
	SchoolYear  string             `bson:"school_year"            json:"schoolYear"`
	Semester    *int               `bson:"semester,omitempty"     json:"semester,omitempty"`
	CreatedAt   time.Time          `bson:"created_at"             json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at"             json:"updatedAt"`
}

// TeacherLoadSummary aggregates a teacher's schedule and weekly hours.
type TeacherLoadSummary struct {
	TeacherID   primitive.ObjectID `json:"teacherId"`
	TeacherName string             `json:"teacherName"`
	Email       string             `json:"email"`
	TotalSlots  int                `json:"totalSlots"`
	TotalHours  float64            `json:"totalHours"`
	Slots       []ScheduleSlot     `json:"slots"`
}
