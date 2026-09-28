package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/deped-sms/backend/internal/models"
)

// MessageHandler handles 1-on-1 direct messaging between school personnel, parents, and students.
type MessageHandler struct {
	Conversations *mongo.Collection
	Messages      *mongo.Collection
	Users         *mongo.Collection
	Students      *mongo.Collection
	Sections      *mongo.Collection
}

func NewMessageHandler(db *mongo.Database) *MessageHandler {
	return &MessageHandler{
		Conversations: db.Collection("conversations"),
		Messages:      db.Collection("messages"),
		Users:         db.Collection("users"),
		Students:      db.Collection("students"),
		Sections:      db.Collection("sections"),
	}
}

// Routes returns the subrouter mounted at /messages.
func (h *MessageHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/conversations", h.ListConversations)
	r.Post("/conversations", h.StartConversation)
	r.Get("/conversations/{id}", h.GetConversation)
	r.Post("/conversations/{id}/reply", h.SendReply)
	r.Get("/recipients", h.GetRecipients)
	return r
}

// ── ListConversations ──────────────────────────────────────────────────────────
func (h *MessageHandler) ListConversations(w http.ResponseWriter, r *http.Request) {
	myID := callerID(r)
	if myID.IsZero() {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	cursor, err := h.Conversations.Find(ctx,
		bson.M{"participant_ids": myID},
		options.Find().SetSort(bson.D{{Key: "last_message_at", Value: -1}}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query conversations")
		return
	}
	defer cursor.Close(ctx)

	var convs []models.Conversation
	if err := cursor.All(ctx, &convs); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode conversations")
		return
	}
	if convs == nil {
		convs = []models.Conversation{}
	}

	// Collect all unique participant IDs
	participantIDMap := make(map[primitive.ObjectID]bool)
	for _, c := range convs {
		for _, pid := range c.ParticipantIDs {
			participantIDMap[pid] = true
		}
	}

	var pIDs []primitive.ObjectID
	for pid := range participantIDMap {
		pIDs = append(pIDs, pid)
	}

	// Fetch participant details
	userMap := make(map[primitive.ObjectID]models.ParticipantSummary)
	if len(pIDs) > 0 {
		uCursor, _ := h.Users.Find(ctx, bson.M{"_id": bson.M{"$in": pIDs}})
		if uCursor != nil {
			var uList []models.ParticipantSummary
			_ = uCursor.All(ctx, &uList)
			for _, u := range uList {
				userMap[u.ID] = u
			}
		}
	}

	// Build enriched response
	var results []models.ConversationWithDetails
	myHex := myID.Hex()

	for _, c := range convs {
		var pList []models.ParticipantSummary
		var other *models.ParticipantSummary

		for _, pid := range c.ParticipantIDs {
			if u, ok := userMap[pid]; ok {
				pList = append(pList, u)
				if pid != myID {
					otherCopy := u
					other = &otherCopy
				}
			}
		}

		unread := 0
		if c.UnreadCounts != nil {
			unread = c.UnreadCounts[myHex]
		}

		results = append(results, models.ConversationWithDetails{
			Conversation:     c,
			Participants:     pList,
			OtherParticipant: other,
			UnreadCount:      unread,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":  results,
		"total": len(results),
	})
}

// ── StartConversation ─────────────────────────────────────────────────────────
type startConversationRequest struct {
	RecipientID    string `json:"recipientId"`
	Subject        string `json:"subject"`
	InitialMessage string `json:"initialMessage"`
	Content        string `json:"content"`
}

func (h *MessageHandler) StartConversation(w http.ResponseWriter, r *http.Request) {
	myID := callerID(r)
	if myID.IsZero() {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req startConversationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	recipientID, err := primitive.ObjectIDFromHex(req.RecipientID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid recipientId")
		return
	}

	if recipientID == myID {
		writeError(w, http.StatusBadRequest, "cannot start conversation with yourself")
		return
	}

	body := strings.TrimSpace(req.InitialMessage)
	if body == "" {
		body = strings.TrimSpace(req.Content)
	}
	if body == "" {
		writeError(w, http.StatusBadRequest, "message content cannot be empty")
		return
	}

	subject := strings.TrimSpace(req.Subject)
	if subject == "" {
		subject = "General Inquiry"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Get sender details
	var sender models.User
	if err := h.Users.FindOne(ctx, bson.M{"_id": myID}).Decode(&sender); err != nil {
		writeError(w, http.StatusUnauthorized, "sender user not found")
		return
	}

	now := time.Now()
	recHex := recipientID.Hex()

	// Check if conversation between these two already exists
	var existing models.Conversation
	err = h.Conversations.FindOne(ctx, bson.M{
		"participant_ids": bson.M{"$all": []primitive.ObjectID{myID, recipientID}},
	}).Decode(&existing)

	var convID primitive.ObjectID
	if err == nil {
		convID = existing.ID
		// Update existing
		_, _ = h.Conversations.UpdateOne(ctx, bson.M{"_id": convID}, bson.M{
			"$set": bson.M{
				"last_message":    body,
				"last_sender_id":  myID,
				"last_message_at": now,
				"updated_at":      now,
			},
			"$inc": bson.M{
				"unread_counts." + recHex: 1,
			},
		})
	} else {
		// Create new conversation
		newConv := models.Conversation{
			ID:             primitive.NewObjectID(),
			ParticipantIDs: []primitive.ObjectID{myID, recipientID},
			Subject:        subject,
			LastMessage:    body,
			LastSenderID:   myID,
			LastMessageAt:  now,
			UnreadCounts: map[string]int{
				recHex: 1,
			},
			CreatedAt: now,
			UpdatedAt: now,
		}
		_, err = h.Conversations.InsertOne(ctx, newConv)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create conversation")
			return
		}
		convID = newConv.ID
	}

	// Insert message
	msg := models.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: convID,
		SenderID:       myID,
		SenderName:     sender.FirstName + " " + sender.LastName,
		SenderRole:     sender.Role,
		Body:           body,
		IsRead:         false,
		CreatedAt:      now,
	}

	msg.Content = body

	_, err = h.Messages.InsertOne(ctx, msg)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save message")
		return
	}

	var updatedConv models.Conversation
	_ = h.Conversations.FindOne(ctx, bson.M{"_id": convID}).Decode(&updatedConv)

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"conversation":   updatedConv,
		"conversationId": convID.Hex(),
		"message":        msg,
	})
}

// ── GetConversation ───────────────────────────────────────────────────────────
func (h *MessageHandler) GetConversation(w http.ResponseWriter, r *http.Request) {
	myID := callerID(r)
	if myID.IsZero() {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	convID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid conversation id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var conv models.Conversation
	if err := h.Conversations.FindOne(ctx, bson.M{
		"_id":             convID,
		"participant_ids": myID,
	}).Decode(&conv); err != nil {
		writeError(w, http.StatusNotFound, "conversation not found or unauthorized")
		return
	}

	// Reset unread count for caller
	myHex := myID.Hex()
	_, _ = h.Conversations.UpdateOne(ctx, bson.M{"_id": convID}, bson.M{
		"$set": bson.M{
			"unread_counts." + myHex: 0,
		},
	})

	// Fetch participant details
	var pList []models.ParticipantSummary
	var other *models.ParticipantSummary
	uCursor, _ := h.Users.Find(ctx, bson.M{"_id": bson.M{"$in": conv.ParticipantIDs}})
	if uCursor != nil {
		_ = uCursor.All(ctx, &pList)
		for _, u := range pList {
			if u.ID != myID {
				otherCopy := u
				other = &otherCopy
			}
		}
	}

	// Fetch all messages in conversation
	mCursor, err := h.Messages.Find(ctx,
		bson.M{"conversation_id": convID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query messages")
		return
	}
	defer mCursor.Close(ctx)

	var messages []models.Message
	if err := mCursor.All(ctx, &messages); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode messages")
		return
	}
	if messages == nil {
		messages = []models.Message{}
	}
	for i := range messages {
		messages[i].Content = messages[i].Body
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"conversation":     conv,
		"participants":     pList,
		"otherParticipant": other,
		"messages":         messages,
	})
}

// ── SendReply ─────────────────────────────────────────────────────────────────
type replyRequest struct {
	Body    string `json:"body"`
	Content string `json:"content"`
}

func (h *MessageHandler) SendReply(w http.ResponseWriter, r *http.Request) {
	myID := callerID(r)
	if myID.IsZero() {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	convID, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid conversation id")
		return
	}

	var req replyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	body := strings.TrimSpace(req.Body)
	if body == "" {
		body = strings.TrimSpace(req.Content)
	}
	if body == "" {
		writeError(w, http.StatusBadRequest, "message body cannot be empty")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var conv models.Conversation
	if err := h.Conversations.FindOne(ctx, bson.M{
		"_id":             convID,
		"participant_ids": myID,
	}).Decode(&conv); err != nil {
		writeError(w, http.StatusNotFound, "conversation not found or unauthorized")
		return
	}

	// Get sender details
	var sender models.User
	if err := h.Users.FindOne(ctx, bson.M{"_id": myID}).Decode(&sender); err != nil {
		writeError(w, http.StatusUnauthorized, "sender user not found")
		return
	}

	now := time.Now()

	// Insert message
	msg := models.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: convID,
		SenderID:       myID,
		SenderName:     sender.FirstName + " " + sender.LastName,
		SenderRole:     sender.Role,
		Body:           body,
		Content:        body,
		IsRead:         false,
		CreatedAt:      now,
	}

	_, err = h.Messages.InsertOne(ctx, msg)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save reply message")
		return
	}

	// Increment unread count for other participants
	incUpdate := bson.M{}
	for _, pid := range conv.ParticipantIDs {
		if pid != myID {
			incUpdate["unread_counts."+pid.Hex()] = 1
		}
	}

	updateDoc := bson.M{
		"$set": bson.M{
			"last_message":    body,
			"last_sender_id":  myID,
			"last_message_at": now,
			"updated_at":      now,
		},
	}
	if len(incUpdate) > 0 {
		updateDoc["$inc"] = incUpdate
	}

	_, _ = h.Conversations.UpdateOne(ctx, bson.M{"_id": convID}, updateDoc)

	writeJSON(w, http.StatusCreated, msg)
}

// ── GetRecipients ─────────────────────────────────────────────────────────────
// Returns list of users that the caller can message.
func (h *MessageHandler) GetRecipients(w http.ResponseWriter, r *http.Request) {
	myID := callerID(r)
	if myID.IsZero() {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	// Return active users excluding self
	cursor, err := h.Users.Find(ctx,
		bson.M{"_id": bson.M{"$ne": myID}, "is_active": true},
		options.Find().
			SetProjection(bson.M{"_id": 1, "first_name": 1, "last_name": 1, "email": 1, "role": 1}).
			SetSort(bson.D{{Key: "role", Value: 1}, {Key: "last_name", Value: 1}}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query recipients")
		return
	}
	defer cursor.Close(ctx)

	var recipients []models.ParticipantSummary
	if err := cursor.All(ctx, &recipients); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to decode recipients")
		return
	}
	if recipients == nil {
		recipients = []models.ParticipantSummary{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data": recipients,
	})
}
