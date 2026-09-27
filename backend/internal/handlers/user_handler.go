package handlers

import (
	"context"
	"encoding/json"
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

// SetActiveStatus enables or disables a user account. super_admin only.
type setActiveRequest struct {
	IsActive bool `json:"isActive"`
}

func (h *UserHandler) SetActiveStatus(w http.ResponseWriter, r *http.Request) {
	targetID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var req setActiveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

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
