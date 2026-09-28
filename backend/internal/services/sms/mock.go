package sms

import (
	"context"
	"fmt"
	"log"
	"time"
)

// MockProvider simulates SMS dispatch for local development and testing.
type MockProvider struct{}

// NewMockProvider returns a new MockProvider.
func NewMockProvider() *MockProvider {
	return &MockProvider{}
}

func (m *MockProvider) Name() string {
	return "mock"
}

// Send logs the simulated SMS and returns a successful response.
func (m *MockProvider) Send(ctx context.Context, recipientNumber, message string) (*SMSResponse, error) {
	msgID := fmt.Sprintf("mock_%d", time.Now().UnixNano())
	log.Printf("📲 [SMS GATEWAY (MOCK)] To: %s | ID: %s | Message: %s", recipientNumber, msgID, message)
	return &SMSResponse{
		MessageID: msgID,
		Recipient: recipientNumber,
		Status:    "delivered",
		Provider:  "mock",
	}, nil
}
