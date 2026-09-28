package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AnnouncementScope string

const (
	ScopeSchoolWide AnnouncementScope = "school_wide"
	ScopeJHS        AnnouncementScope = "jhs"
	ScopeSHS        AnnouncementScope = "shs"
	ScopeGradeLevel AnnouncementScope = "grade_level"
	ScopeSection    AnnouncementScope = "section"
)

type AnnouncementPriority string

const (
	PriorityNormal   AnnouncementPriority = "normal"
	PriorityUrgent   AnnouncementPriority = "urgent"
	PriorityAdvisory AnnouncementPriority = "advisory"
)

// Announcement represents a school bulletin, advisory, or section-specific announcement.
type Announcement struct {
	ID            primitive.ObjectID   `bson:"_id,omitempty"           json:"id"`
	Title         string               `bson:"title"                   json:"title"`
	Content       string               `bson:"content"                 json:"content"`
	AuthorID      primitive.ObjectID   `bson:"author_id"               json:"authorId"`
	AuthorName    string               `bson:"author_name"             json:"authorName"`
	AuthorRole    Role                 `bson:"author_role"             json:"authorRole"`
	Scope         AnnouncementScope    `bson:"scope"                   json:"scope"`
	TargetGrade   *int                 `bson:"target_grade,omitempty"  json:"targetGrade,omitempty"`
	TargetSection *primitive.ObjectID  `bson:"target_section,omitempty" json:"targetSection,omitempty"`
	SectionName   string               `bson:"section_name,omitempty"  json:"sectionName,omitempty"`
	Priority      AnnouncementPriority `bson:"priority"                json:"priority"`
	IsPinned      bool                 `bson:"is_pinned"               json:"isPinned"`
	CreatedAt     time.Time            `bson:"created_at"              json:"createdAt"`
	UpdatedAt     time.Time            `bson:"updated_at"              json:"updatedAt"`
}
