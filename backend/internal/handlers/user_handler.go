package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"

	"github.com/deped-sms/backend/internal/middleware"
	"github.com/deped-sms/backend/internal/models"
)

type UserHandler struct {
	Users *mongo.Collection
}

func NewUserHandler(db *mongo.Database) *UserHandler {
	return &UserHandler{Users: db.Collection("users")}
}

// ListUsers returns all users. Restricted to super_admin and registrar.
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetProjection(bson.M{"password_hash": 0}).SetSort(bson.D{{Key: "last_name", Value: 1}})
	cursor, err := h.Users.Find(ctx, bson.M{}, opts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch users")
		return
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode users")
		return
	}
	writeJSON(w, http.StatusOK, users)
}

// GetUser returns a single user by ID.
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var user models.User
	if err := h.Users.FindOne(ctx, bson.M{"_id": id}).Decode(&user); err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// UpdateUser allows updating firstName, lastName, and role. Admins can update
// anyone; other users can only update their own profile.
type updateUserRequest struct {
	FirstName string      `json:"firstName"`
	LastName  string      `json:"lastName"`
	Role      models.Role `json:"role"`
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	targetID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	callerID, _ := primitive.ObjectIDFromHex(claims["sub"].(string))
	callerRole := models.Role(claims["role"].(string))

	isAdmin := callerRole == models.RoleSuperAdmin || callerRole == models.RoleRegistrar
	if !isAdmin && callerID != targetID {
		writeError(w, http.StatusForbidden, "you can only update your own profile")
		return
	}

	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	set := bson.M{"updated_at": time.Now()}
	if req.FirstName != "" {
		set["first_name"] = req.FirstName
	}
	if req.LastName != "" {
		set["last_name"] = req.LastName
	}
	// Only super_admin can change roles
	if req.Role != "" && callerRole == models.RoleSuperAdmin {
		set["role"] = req.Role
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	after := options.After
	var updated models.User
	err = h.Users.FindOneAndUpdate(ctx,
		bson.M{"_id": targetID},
		bson.M{"$set": set},
		options.FindOneAndUpdate().SetReturnDocument(after),
	).Decode(&updated)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// SetActiveStatus enables or disables a user account.
// Accessible by super_admin and registrar (registrars cannot disable super admins).
type setActiveRequest struct {
	IsActive bool `json:"isActive"`
}

func (h *UserHandler) SetActiveStatus(w http.ResponseWriter, r *http.Request) {
	targetID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	callerRole := models.Role(claims["role"].(string))

	var req setActiveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// If caller is registrar, ensure target is not a super_admin
	if callerRole != models.RoleSuperAdmin {
		var target models.User
		if err := h.Users.FindOne(ctx, bson.M{"_id": targetID}).Decode(&target); err != nil {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		if target.Role == models.RoleSuperAdmin {
			writeError(w, http.StatusForbidden, "registrars cannot change the status of super admin accounts")
			return
		}
	}

	_, err = h.Users.UpdateOne(ctx,
		bson.M{"_id": targetID},
		bson.M{"$set": bson.M{"is_active": req.IsActive, "updated_at": time.Now()}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update status")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"id": targetID.Hex(), "isActive": req.IsActive})
}

// ── ResetPassword ──────────────────────────────────────────────────────────────
// Allows super_admin and registrar to reset a user's password.
type resetPasswordRequest struct {
	NewPassword string `json:"newPassword"`
}

func (h *UserHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	targetID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	callerRole := models.Role(claims["role"].(string))

	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.NewPassword) < 8 {
		writeError(w, http.StatusBadRequest, "new password must be at least 8 characters")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var target models.User
	if err := h.Users.FindOne(ctx, bson.M{"_id": targetID}).Decode(&target); err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	// Registrars cannot reset passwords of super admins
	if callerRole != models.RoleSuperAdmin && target.Role == models.RoleSuperAdmin {
		writeError(w, http.StatusForbidden, "registrars cannot reset passwords for super admin accounts")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	_, err = h.Users.UpdateOne(ctx,
		bson.M{"_id": targetID},
		bson.M{"$set": bson.M{"password_hash": string(hash), "updated_at": time.Now()}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reset password in database")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Password successfully reset",
		"userId":  targetID.Hex(),
		"email":   target.Email,
	})
}

// ── CreateUser ─────────────────────────────────────────────────────────────────
// Allows super_admin and registrar to create an individual user.
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	callerRole := models.Role(claims["role"].(string))

	var req struct {
		Email     string      `json:"email"`
		Password  string      `json:"password"`
		FirstName string      `json:"firstName"`
		LastName  string      `json:"lastName"`
		Role      models.Role `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)

	if req.Email == "" || req.FirstName == "" || req.LastName == "" {
		writeError(w, http.StatusBadRequest, "email, firstName, and lastName are required")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	validRoles := map[models.Role]bool{
		models.RoleSuperAdmin: true,
		models.RoleRegistrar:  true,
		models.RoleTeacher:    true,
		models.RoleStudent:    true,
		models.RoleGuardian:   true,
	}
	if !validRoles[req.Role] {
		req.Role = models.RoleTeacher
	}

	// Registrars cannot create super_admin accounts
	if callerRole != models.RoleSuperAdmin && req.Role == models.RoleSuperAdmin {
		writeError(w, http.StatusForbidden, "only super admins can create super admin accounts")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	count, err := h.Users.CountDocuments(ctx, bson.M{"email": req.Email})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if count > 0 {
		writeError(w, http.StatusConflict, "email already in use")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	now := time.Now()
	user := models.User{
		ID:           primitive.NewObjectID(),
		Email:        req.Email,
		PasswordHash: string(hash),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         req.Role,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if _, err := h.Users.InsertOne(ctx, user); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	writeJSON(w, http.StatusCreated, user)
}

// ── BulkImport ─────────────────────────────────────────────────────────────────

type BulkImportItem struct {
	FirstName string      `json:"firstName"`
	LastName  string      `json:"lastName"`
	Email     string      `json:"email"`
	Password  string      `json:"password"`
	Role      models.Role `json:"role"`
}

type BulkImportRequest struct {
	Users        []BulkImportItem `json:"users"`
	SkipExisting bool             `json:"skipExisting"`
}

type BulkImportErrorItem struct {
	Row    int    `json:"row"`
	Email  string `json:"email"`
	Reason string `json:"reason"`
}

type BulkImportResponse struct {
	Total        int                   `json:"total"`
	CreatedCount int                   `json:"createdCount"`
	SkippedCount int                   `json:"skippedCount"`
	FailedCount  int                   `json:"failedCount"`
	Errors       []BulkImportErrorItem `json:"errors"`
	Users        []models.User         `json:"users"`
}

func (h *UserHandler) BulkImport(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	callerRole := models.Role(claims["role"].(string))

	var req BulkImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.Users) == 0 {
		writeError(w, http.StatusBadRequest, "no users provided in payload")
		return
	}

	if len(req.Users) > 500 {
		writeError(w, http.StatusBadRequest, "maximum 500 users can be imported at once")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// 1. Gather all emails to check existence in database in one single query
	var emailsToCheck []string
	for _, u := range req.Users {
		cleanEmail := strings.TrimSpace(strings.ToLower(u.Email))
		if cleanEmail != "" {
			emailsToCheck = append(emailsToCheck, cleanEmail)
		}
	}

	existingEmailMap := make(map[string]bool)
	if len(emailsToCheck) > 0 {
		cursor, err := h.Users.Find(ctx, bson.M{"email": bson.M{"$in": emailsToCheck}}, options.Find().SetProjection(bson.M{"email": 1}))
		if err == nil {
			var existingUsers []struct {
				Email string `bson:"email"`
			}
			if err := cursor.All(ctx, &existingUsers); err == nil {
				for _, eu := range existingUsers {
					existingEmailMap[strings.ToLower(eu.Email)] = true
				}
			}
			cursor.Close(ctx)
		}
	}

	validRoles := map[models.Role]bool{
		models.RoleSuperAdmin: true,
		models.RoleRegistrar:  true,
		models.RoleTeacher:    true,
		models.RoleStudent:    true,
		models.RoleGuardian:   true,
	}

	var documents []interface{}
	createdUsers := []models.User{}
	importErrors := []BulkImportErrorItem{}
	batchEmailSeen := make(map[string]bool)
	skippedCount := 0

	now := time.Now()

	for idx, item := range req.Users {
		rowNum := idx + 1
		email := strings.TrimSpace(strings.ToLower(item.Email))
		firstName := strings.TrimSpace(item.FirstName)
		lastName := strings.TrimSpace(item.LastName)
		password := strings.TrimSpace(item.Password)
		role := item.Role

		// Basic validation
		if email == "" {
			importErrors = append(importErrors, BulkImportErrorItem{
				Row:    rowNum,
				Email:  "",
				Reason: "Email address is required",
			})
			continue
		}
		if !strings.Contains(email, "@") || !strings.Contains(email, ".") {
			importErrors = append(importErrors, BulkImportErrorItem{
				Row:    rowNum,
				Email:  email,
				Reason: "Invalid email address format",
			})
			continue
		}
		if firstName == "" || lastName == "" {
			importErrors = append(importErrors, BulkImportErrorItem{
				Row:    rowNum,
				Email:  email,
				Reason: "First name and last name are required",
			})
			continue
		}

		// Role validation & authorization
		if role == "" || !validRoles[role] {
			role = models.RoleTeacher
		}
		if callerRole != models.RoleSuperAdmin && role == models.RoleSuperAdmin {
			importErrors = append(importErrors, BulkImportErrorItem{
				Row:    rowNum,
				Email:  email,
				Reason: "Registrars cannot import super_admin accounts",
			})
			continue
		}

		// Password handling
		if len(password) < 8 {
			importErrors = append(importErrors, BulkImportErrorItem{
				Row:    rowNum,
				Email:  email,
				Reason: "Password must be at least 8 characters",
			})
			continue
		}

		// Duplicate within same batch
		if batchEmailSeen[email] {
			importErrors = append(importErrors, BulkImportErrorItem{
				Row:    rowNum,
				Email:  email,
				Reason: "Duplicate email within the same import file",
			})
			continue
		}
		batchEmailSeen[email] = true

		// Existing email in DB
		if existingEmailMap[email] {
			if req.SkipExisting {
				skippedCount++
				continue
			}
			importErrors = append(importErrors, BulkImportErrorItem{
				Row:    rowNum,
				Email:  email,
				Reason: "Email is already registered in the system",
			})
			continue
		}

		// Hash password
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			importErrors = append(importErrors, BulkImportErrorItem{
				Row:    rowNum,
				Email:  email,
				Reason: "Failed to encrypt password",
			})
			continue
		}

		u := models.User{
			ID:           primitive.NewObjectID(),
			Email:        email,
			PasswordHash: string(hash),
			FirstName:    firstName,
			LastName:     lastName,
			Role:         role,
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		documents = append(documents, u)
		createdUsers = append(createdUsers, u)
	}

	// Insert in bulk if any valid documents exist
	if len(documents) > 0 {
		_, err := h.Users.InsertMany(ctx, documents)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to insert users into database")
			return
		}
	}

	resp := BulkImportResponse{
		Total:        len(req.Users),
		CreatedCount: len(createdUsers),
		SkippedCount: skippedCount,
		FailedCount:  len(importErrors),
		Errors:       importErrors,
		Users:        createdUsers,
	}

	writeJSON(w, http.StatusOK, resp)
}

