package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// SemaphoreProvider implements Provider for Semaphore Philippines SMS API.
type SemaphoreProvider struct {
	apiKey     string
	senderName string
	client     *http.Client
}

// NewSemaphoreProvider returns a Semaphore SMS gateway provider.
func NewSemaphoreProvider(apiKey, senderName string) *SemaphoreProvider {
	return &SemaphoreProvider{
		apiKey:     apiKey,
		senderName: senderName,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *SemaphoreProvider) Name() string {
	return "semaphore"
}

// normalizePHNumber formats phone numbers to standard 11-digit 09xxxxxxxxx or international +639xxxxxxxxx.
func normalizePHNumber(raw string) string {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.ReplaceAll(cleaned, "-", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "(", "")
	cleaned = strings.ReplaceAll(cleaned, ")", "")

	if strings.HasPrefix(cleaned, "+63") {
		cleaned = "0" + cleaned[3:]
	} else if strings.HasPrefix(cleaned, "63") && len(cleaned) == 12 {
		cleaned = "0" + cleaned[2:]
	}

	return cleaned
}

type semaphorePayload struct {
	APIKey     string `json:"apikey"`
	Number     string `json:"number"`
	Message    string `json:"message"`
	SenderName string `json:"sendername,omitempty"`
}

type semaphoreResponseItem struct {
	MessageID int    `json:"message_id"`
	UserID    int    `json:"user_id"`
	User      string `json:"user"`
	AccountID int    `json:"account_id"`
	Account   string `json:"account"`
	Recipient string `json:"recipient"`
	Message   string `json:"message"`
	Sender    string `json:"sender_name"`
	Network   string `json:"network"`
	Status    string `json:"status"`
	Type      string `json:"type"`
	Source    string `json:"source"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// Send dispatches an SMS message through Semaphore API.
func (s *SemaphoreProvider) Send(ctx context.Context, recipientNumber, message string) (*SMSResponse, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("semaphore api key is not configured")
	}

	normalized := normalizePHNumber(recipientNumber)
	payload := semaphorePayload{
		APIKey:     s.apiKey,
		Number:     normalized,
		Message:    message,
		SenderName: s.senderName,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to encode semaphore payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.semaphore.co/api/v4/messages", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create semaphore request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to dispatch semaphore sms: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read semaphore response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("semaphore api error (status %d): %s", resp.StatusCode, string(respBytes))
	}

	var items []semaphoreResponseItem
	if err := json.Unmarshal(respBytes, &items); err == nil && len(items) > 0 {
		return &SMSResponse{
			MessageID: fmt.Sprintf("%d", items[0].MessageID),
			Recipient: normalized,
			Status:    items[0].Status,
			Provider:  "semaphore",
		}, nil
	}

	return &SMSResponse{
		MessageID: fmt.Sprintf("smph_%d", time.Now().UnixNano()),
		Recipient: normalized,
		Status:    "queued",
		Provider:  "semaphore",
	}, nil
}
