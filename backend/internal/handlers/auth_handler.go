package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"

	"github.com/deped-sms/backend/internal/config"
	"github.com/deped-sms/backend/internal/middleware"
	"github.com/deped-sms/backend/internal/models"
)

type AuthHandler struct {
	Users              *mongo.Collection
	JWTSecret          string
	JWTExpiryHours     int
	GoogleClientID     string
	GoogleClientSecret string
	Env                string
}

func NewAuthHandler(db *mongo.Database, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		Users:              db.Collection("users"),
		JWTSecret:          cfg.JWTSecret,
		JWTExpiryHours:     cfg.JWTExpiryHours,
		GoogleClientID:     cfg.GoogleClientID,
		GoogleClientSecret: cfg.GoogleClientSecret,
		Env:                cfg.Env,
	}
}

// ── Login ──────────────────────────────────────────────────────────────────────

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var user models.User
	err := h.Users.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if !user.IsActive {
		writeError(w, http.StatusForbidden, "account is disabled")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := h.generateToken(user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, loginResponse{Token: token, User: user})
}

// ── Register ───────────────────────────────────────────────────────────────────

type registerRequest struct {
	Email     string     `json:"email"`
	Password  string     `json:"password"`
	FirstName string     `json:"firstName"`
	LastName  string     `json:"lastName"`
	Role      models.Role `json:"role"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
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
		writeError(w, http.StatusBadRequest, "invalid role")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Check email uniqueness
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

// ── Me (current user profile) ──────────────────────────────────────────────────

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing claims")
		return
	}
	userID, err := primitive.ObjectIDFromHex(claims["sub"].(string))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id in token")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var user models.User
	if err := h.Users.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// ── ChangePassword ─────────────────────────────────────────────────────────────

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing claims")
		return
	}
	userID, err := primitive.ObjectIDFromHex(claims["sub"].(string))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var req changePasswordRequest
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

	var user models.User
	if err := h.Users.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		writeError(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	_, err = h.Users.UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{"password_hash": string(newHash), "updated_at": time.Now()}},
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "password updated"})
}

// ── generateToken ──────────────────────────────────────────────────────────────

func (h *AuthHandler) generateToken(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":  user.ID.Hex(),
		"role": user.Role,
		"exp":  time.Now().Add(time.Duration(h.JWTExpiryHours) * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.JWTSecret))
}

// ── DepEd Single Sign-On (SSO) ────────────────────────────────────────────────

type depedSSORequest struct {
	IDToken   string `json:"idToken"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Provider  string `json:"provider"`
}

type depedSSOResponse struct {
	Token     string      `json:"token"`
	User      models.User `json:"user"`
	IsNewUser bool        `json:"isNewUser"`
	Provider  string      `json:"provider"`
}

type ssoConfigResponse struct {
	GoogleClientID string `json:"googleClientId"`
	AllowedDomain  string `json:"allowedDomain"`
	DevMode        bool   `json:"devMode"`
}

func (h *AuthHandler) isDepEdEmail(email string) bool {
	clean := strings.ToLower(strings.TrimSpace(email))
	if strings.HasSuffix(clean, "@deped.gov.ph") || strings.Contains(clean, ".deped.gov.ph") {
		return true
	}
	// In development environment, also allow local test accounts
	if h.Env == "development" && (clean == "admin@deped.gov.ph" || strings.HasSuffix(clean, "@school.edu.ph")) {
		return true
	}
	return false
}

func capitalize(s string) string {
	if s == "" {
		return ""
	}
	return strings.ToUpper(s[:1]) + strings.ToLower(s[1:])
}

// GetSSOConfig returns configuration options for SSO (client ID and allowed domain).
func (h *AuthHandler) GetSSOConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, ssoConfigResponse{
		GoogleClientID: h.GoogleClientID,
		AllowedDomain:  "deped.gov.ph",
		DevMode:        h.Env == "development",
	})
}

// DepEdSSO handles authentication and auto-provisioning via official DepEd Google Workspace.
func (h *AuthHandler) DepEdSSO(w http.ResponseWriter, r *http.Request) {
	var req depedSSORequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)

	// If Google OAuth ID token is provided, verify it with Google's tokeninfo API
	if req.IDToken != "" {
		googleURL := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(req.IDToken)
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Get(googleURL)
		if err != nil || resp.StatusCode != http.StatusOK {
			writeError(w, http.StatusUnauthorized, "invalid Google authentication token")
			return
		}
		defer resp.Body.Close()

		var gToken struct {
			Email         string `json:"email"`
			EmailVerified string `json:"email_verified"`
			GivenName     string `json:"given_name"`
			FamilyName    string `json:"family_name"`
			HostedDomain  string `json:"hd"`
			Audience      string `json:"aud"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&gToken); err != nil {
			writeError(w, http.StatusUnauthorized, "failed to decode token claims")
			return
		}

		if gToken.EmailVerified != "true" && gToken.EmailVerified != "1" {
			writeError(w, http.StatusUnauthorized, "Google email address is not verified")
			return
		}

		email = strings.TrimSpace(strings.ToLower(gToken.Email))
		if gToken.GivenName != "" {
			firstName = gToken.GivenName
		}
		if gToken.FamilyName != "" {
			lastName = gToken.FamilyName
		}
	}

	if email == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}

	// Strictly verify official DepEd domain (@deped.gov.ph)
	if !h.isDepEdEmail(email) {
		writeError(w, http.StatusForbidden, "Access restricted: Only official DepEd accounts (*@deped.gov.ph) can authenticate through DepEd Single Sign-On.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// 1. Check if user already exists
	var user models.User
	err := h.Users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == nil {
		if !user.IsActive {
			writeError(w, http.StatusForbidden, "your account has been disabled; please contact school administrator")
			return
		}

		token, err := h.generateToken(user)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to generate authentication token")
			return
		}

		writeJSON(w, http.StatusOK, depedSSOResponse{
			Token:     token,
			User:      user,
			IsNewUser: false,
			Provider:  "deped_google",
		})
		return
	}

	// 2. User does not exist -> Auto-provision new DepEd Teacher account!
	if firstName == "" || lastName == "" {
		prefix := strings.Split(email, "@")[0]
		parts := strings.Split(prefix, ".")
		if len(parts) >= 2 {
			firstName = capitalize(parts[0])
			lastName = capitalize(parts[1])
		} else {
			firstName = capitalize(prefix)
			lastName = "Faculty"
		}
	}

	// Generate a secure random password hash for the auto-provisioned account
	randomBytes := make([]byte, 16)
	_, _ = rand.Read(randomBytes)
	hash, _ := bcrypt.GenerateFromPassword([]byte(hex.EncodeToString(randomBytes)), bcrypt.DefaultCost)

	now := time.Now()
	newUser := models.User{
		ID:           primitive.NewObjectID(),
		Email:        email,
		PasswordHash: string(hash),
		FirstName:    firstName,
		LastName:     lastName,
		Role:         models.RoleTeacher, // Default role for auto-provisioned DepEd faculty
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if _, err := h.Users.InsertOne(ctx, newUser); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to provision new user account")
		return
	}

	token, err := h.generateToken(newUser)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate authentication token")
		return
	}

	writeJSON(w, http.StatusCreated, depedSSOResponse{
		Token:     token,
		User:      newUser,
		IsNewUser: true,
		Provider:  "deped_google",
	})
}
