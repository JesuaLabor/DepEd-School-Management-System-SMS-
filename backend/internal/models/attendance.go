package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AttendanceStatus represents a student's attendance for a given period.
type AttendanceStatus string

const (
	AttendancePresent AttendanceStatus = "present"
	AttendanceAbsent  AttendanceStatus = "absent"
	AttendanceLate    AttendanceStatus = "late"
	AttendanceExcused AttendanceStatus = "excused"
)

// AttendanceType distinguishes daily roll-call from per-subject attendance.
type AttendanceType string

const (
	AttendanceTypeDaily   AttendanceType = "daily"
	AttendanceTypeSubject AttendanceType = "subject"
)

// AttendanceRecord is one attendance entry for one student on one date.
type AttendanceRecord struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"       json:"id"`
	StudentID   primitive.ObjectID `bson:"student_id"          json:"studentId"`
	Date        time.Time          `bson:"date"                json:"date"`        // truncated to date only (UTC midnight)
	Type        AttendanceType     `bson:"type"                json:"type"`
	SubjectID   primitive.ObjectID `bson:"subject_id,omitempty" json:"subjectId,omitempty"` // for subject-type
	SubjectName string             `bson:"subject_name,omitempty" json:"subjectName,omitempty"`
	Status      AttendanceStatus   `bson:"status"              json:"status"`
	Remarks     string             `bson:"remarks,omitempty"   json:"remarks,omitempty"`
	GradeLevel  GradeLevel         `bson:"grade_level"         json:"gradeLevel"`
	SectionID   primitive.ObjectID `bson:"section_id,omitempty" json:"sectionId,omitempty"`
	SchoolYear  string             `bson:"school_year"         json:"schoolYear"`
	RecordedBy  primitive.ObjectID `bson:"recorded_by,omitempty" json:"recordedBy,omitempty"`
	SchoolID    primitive.ObjectID `bson:"school_id,omitempty" json:"schoolId,omitempty"`
	CreatedAt   time.Time          `bson:"created_at"          json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at"          json:"updatedAt"`
}

// AttendanceWithStudent is the enriched record returned to the frontend.
type AttendanceWithStudent struct {
	AttendanceRecord `bson:",inline"`
	Student          *StudentSummary `bson:"student,omitempty" json:"student,omitempty"`
}

// AttendanceSummary aggregates counts for a single student.
type AttendanceSummary struct {
	StudentID  primitive.ObjectID `bson:"student_id" json:"studentId"`
	Present    int                `bson:"present"    json:"present"`
	Absent     int                `bson:"absent"     json:"absent"`
	Late       int                `bson:"late"       json:"late"`
	Excused    int                `bson:"excused"    json:"excused"`
	Total      int                `bson:"total"      json:"total"`
	AbsenceRate float64           `bson:"absence_rate" json:"absenceRate"` // % absent
}
