package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Conversation represents a messaging thread between teachers, guardians, or students.
type Conversation struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	ParticipantIDs []primitive.ObjectID `bson:"participant_ids"      json:"participantIds"`
	Subject        string             `bson:"subject"                json:"subject"`
	LastMessage    string             `bson:"last_message"           json:"lastMessage"`
	LastSenderID   primitive.ObjectID `bson:"last_sender_id,omitempty" json:"lastSenderId,omitempty"`
	LastMessageAt  time.Time          `bson:"last_message_at"        json:"lastMessageAt"`
	UnreadCounts   map[string]int     `bson:"unread_counts"          json:"unreadCounts"` // keyed by userID.Hex()
	CreatedAt      time.Time          `bson:"created_at"             json:"createdAt"`
	UpdatedAt      time.Time          `bson:"updated_at"             json:"updatedAt"`
}

// Message is an individual message sent within a conversation.
type Message struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	ConversationID primitive.ObjectID `bson:"conversation_id"        json:"conversationId"`
	SenderID       primitive.ObjectID `bson:"sender_id"              json:"senderId"`
	SenderName     string             `bson:"sender_name"            json:"senderName"`
	SenderRole     Role               `bson:"sender_role"            json:"senderRole"`
	Body           string             `bson:"body"                   json:"body"`
	Content        string             `bson:"-"                      json:"content"`
	IsRead         bool               `bson:"is_read"                json:"isRead"`
	CreatedAt      time.Time          `bson:"created_at"             json:"createdAt"`
}

// ParticipantSummary contains essential user info for messaging display.
type ParticipantSummary struct {
	ID        primitive.ObjectID `bson:"_id"        json:"id"`
	FirstName string             `bson:"first_name" json:"firstName"`
	LastName  string             `bson:"last_name"  json:"lastName"`
	Email     string             `bson:"email"      json:"email"`
	Role      Role               `bson:"role"       json:"role"`
}

// ConversationWithDetails embeds participant summaries and messages for the UI.
type ConversationWithDetails struct {
	Conversation
	Participants     []ParticipantSummary `json:"participants"`
	OtherParticipant *ParticipantSummary  `json:"otherParticipant,omitempty"`
	UnreadCount      int                  `json:"unreadCount"`
}
