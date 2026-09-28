package sms

import "context"

// SMSResponse contains the result of an SMS dispatch operation.
type SMSResponse struct {
	MessageID string `json:"messageId"`
	Recipient string `json:"recipient"`
	Status    string `json:"status"`
	Provider  string `json:"provider"`
}

// Provider defines the interface for SMS gateways (Semaphore, Mock, etc.).
type Provider interface {
	Send(ctx context.Context, recipientNumber, message string) (*SMSResponse, error)
	Name() string
}
