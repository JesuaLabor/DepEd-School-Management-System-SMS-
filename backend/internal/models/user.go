package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Role represents the access level of a user account.
type Role string

const (
	RoleSuperAdmin Role = "super_admin"
	RoleRegistrar  Role = "registrar"
	RoleTeacher    Role = "teacher"
	RoleStudent    Role = "student"
	RoleGuardian   Role = "guardian"
)

// User is a system account (admin, registrar, teacher, student, or guardian).
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"password_hash" json:"-"`
	FirstName    string             `bson:"first_name" json:"firstName"`
	LastName     string             `bson:"last_name" json:"lastName"`
	Role         Role               `bson:"role" json:"role"`
	SchoolID     primitive.ObjectID `bson:"school_id,omitempty" json:"schoolId,omitempty"`
	CreatedAt    time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updatedAt"`
}
