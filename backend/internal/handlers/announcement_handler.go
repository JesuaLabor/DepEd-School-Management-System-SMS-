package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
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

// AnnouncementHandler handles school announcements and bulletins.
type AnnouncementHandler struct {
	Announcements *mongo.Collection
	Sections      *mongo.Collection
	Users         *mongo.Collection
}

func NewAnnouncementHandler(db *mongo.Database) *AnnouncementHandler {
	return &AnnouncementHandler{
		Announcements: db.Collection("announcements"),
		Sections:      db.Collection("sections"),
		Users:         db.Collection("users"),
	}
}

// Routes returns the subrouter mounted at /announcements.
func (h *AnnouncementHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{id}", h.Get)
	r.Put("/{id}", h.Update)
	r.Delete("/{id}", h.Delete)
	return r
}

type CreateAnnouncementRequest struct {
	Title         string                     `json:"title"`
	Content       string                     `json:"content"`
	Scope         models.AnnouncementScope    `json:"scope"`
	TargetGrade   *int                       `json:"targetGrade,omitempty"`
	TargetSection *string                    `json:"targetSection,omitempty"`
	Priority      models.AnnouncementPriority `json:"priority"`
	IsPinned      bool                       `json:"isPinned"`
}

// List returns announcements filtered by query parameters and user scope.
func (h *AnnouncementHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := bson.M{}

	if scope := q.Get("scope"); scope != "" {
		filter["scope"] = scope
	}
	if priority := q.Get("priority"); priority != "" {
		filter["priority"] = priority
	}
	if gl := q.Get("gradeLevel"); gl != "" {
		if n, err := strconv.Atoi(gl); err == nil {
			filter["target_grade"] = n
		}
	}
	if sec := q.Get("sectionId"); sec != "" {
		if oid, err := primitive.ObjectIDFromHex(sec); err == nil {
			filter["target_section"] = oid
		}
	}
	if search := strings.TrimSpace(q.Get("search")); search != "" {
		filter["$or"] = bson.A{
			bson.M{"title": primitive.Regex{Pattern: search, Options: "i"}},
			bson.M{"content": primitive.Regex{Pattern: search, Options: "i"}},
			bson.M{"author_name": primitive.Regex{Pattern: search, Options: "i"}},
		}
	}

	limit := int64(30)
	if l := q.Get("limit"); l != "" {
		if n, err := strconv.ParseInt(l, 10, 64); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	skip := int64(0)
	if s := q.Get("skip"); s != "" {
		if n, err := strconv.ParseInt(s, 10, 64); err == nil && n >= 0 {
			skip = n
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	findOpts := options.Find().
		SetSort(bson.D{
			{Key: "is_pinned", Value: -1},
			{Key: "created_at", Value: -1},
		}).
		SetLimit(limit).
		SetSkip(skip)

	cursor, err := h.Announcements.Find(ctx, filter, findOpts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch announcements")
		return
	}
	defer cursor.Close(ctx)

	var list []models.Announcement
	if err := cursor.All(ctx, &list); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode announcements")
		return
	}
	if list == nil {
		list = []models.Announcement{}
	}

	total, _ := h.Announcements.CountDocuments(ctx, filter)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":  list,
		"total": total,
		"limit": limit,
		"skip":  skip,
	})
}

// Create posts a new announcement.
func (h *AnnouncementHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	authorIDStr, _ := claims["sub"].(string)
	authorRoleStr, _ := claims["role"].(string)
	authorID, err := primitive.ObjectIDFromHex(authorIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid author identifier")
		return
	}

	var req CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if req.Content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}

	if req.Scope == "" {
		req.Scope = models.ScopeSchoolWide
	}
	if req.Priority == "" {
		req.Priority = models.PriorityNormal
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Look up author name
	var author models.User
	authorName := "Staff"
	if err := h.Users.FindOne(ctx, bson.M{"_id": authorID}).Decode(&author); err == nil {
		authorName = author.FirstName + " " + author.LastName
	}

	var targetSectionOID *primitive.ObjectID
	sectionName := ""
	if req.TargetSection != nil && *req.TargetSection != "" {
		if oid, err := primitive.ObjectIDFromHex(*req.TargetSection); err == nil {
			targetSectionOID = &oid
			var sec models.Section
			if err := h.Sections.FindOne(ctx, bson.M{"_id": oid}).Decode(&sec); err == nil {
				sectionName = sec.Name
			}
		}
	}

	now := time.Now()
	ann := models.Announcement{
		ID:            primitive.NewObjectID(),
		Title:         req.Title,
		Content:       req.Content,
		AuthorID:      authorID,
		AuthorName:    authorName,
		AuthorRole:    models.Role(authorRoleStr),
		Scope:         req.Scope,
		TargetGrade:   req.TargetGrade,
		TargetSection: targetSectionOID,
		SectionName:   sectionName,
		Priority:      req.Priority,
		IsPinned:      req.IsPinned,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if _, err := h.Announcements.InsertOne(ctx, ann); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create announcement")
		return
	}

	writeJSON(w, http.StatusCreated, ann)
}

// Get returns an announcement by ID.
func (h *AnnouncementHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid announcement id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var ann models.Announcement
	if err := h.Announcements.FindOne(ctx, bson.M{"_id": id}).Decode(&ann); err != nil {
		writeError(w, http.StatusNotFound, "announcement not found")
		return
	}

	writeJSON(w, http.StatusOK, ann)
}

// Update edits an announcement. Gated to author or super_admin / registrar.
func (h *AnnouncementHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid announcement id")
		return
	}

	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	callerIDStr, _ := claims["sub"].(string)
	callerRole, _ := claims["role"].(string)

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var existing models.Announcement
	if err := h.Announcements.FindOne(ctx, bson.M{"_id": id}).Decode(&existing); err != nil {
		writeError(w, http.StatusNotFound, "announcement not found")
		return
	}

	isManager := callerRole == "super_admin" || callerRole == "registrar"
	if !isManager && existing.AuthorID.Hex() != callerIDStr {
		writeError(w, http.StatusForbidden, "you can only update your own announcements")
		return
	}

	var req CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	update := bson.M{
		"updated_at": time.Now(),
	}
	if t := strings.TrimSpace(req.Title); t != "" {
		update["title"] = t
	}
	if c := strings.TrimSpace(req.Content); c != "" {
		update["content"] = c
	}
	if req.Scope != "" {
		update["scope"] = req.Scope
	}
	if req.Priority != "" {
		update["priority"] = req.Priority
	}
	update["is_pinned"] = req.IsPinned
	update["target_grade"] = req.TargetGrade

	if req.TargetSection != nil && *req.TargetSection != "" {
		if oid, err := primitive.ObjectIDFromHex(*req.TargetSection); err == nil {
			update["target_section"] = oid
			var sec models.Section
			if err := h.Sections.FindOne(ctx, bson.M{"_id": oid}).Decode(&sec); err == nil {
				update["section_name"] = sec.Name
			}
		}
	} else if req.TargetSection != nil && *req.TargetSection == "" {
		update["target_section"] = nil
		update["section_name"] = ""
	}

	res, err := h.Announcements.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	if err != nil || res.MatchedCount == 0 {
		writeError(w, http.StatusInternalServerError, "failed to update announcement")
		return
	}

	var updated models.Announcement
	_ = h.Announcements.FindOne(ctx, bson.M{"_id": id}).Decode(&updated)
	writeJSON(w, http.StatusOK, updated)
}

// Delete removes an announcement. Gated to author or super_admin / registrar.
func (h *AnnouncementHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid announcement id")
		return
	}

	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	callerIDStr, _ := claims["sub"].(string)
	callerRole, _ := claims["role"].(string)

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var existing models.Announcement
	if err := h.Announcements.FindOne(ctx, bson.M{"_id": id}).Decode(&existing); err != nil {
		writeError(w, http.StatusNotFound, "announcement not found")
		return
	}

	isManager := callerRole == "super_admin" || callerRole == "registrar"
	if !isManager && existing.AuthorID.Hex() != callerIDStr {
		writeError(w, http.StatusForbidden, "you can only delete your own announcements")
		return
	}

	if _, err := h.Announcements.DeleteOne(ctx, bson.M{"_id": id}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete announcement")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
