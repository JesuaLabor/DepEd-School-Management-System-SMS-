package sms

import (
	"context"
	"strings"
	"testing"
)

// TestNormalizePHNumber validates conversion of various phone formats to standard 09xxxxxxxxx.
func TestNormalizePHNumber(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"09171234567", "09171234567"},
		{"+639171234567", "09171234567"},
		{"639171234567", "09171234567"},
		{"0917-123-4567", "09171234567"},
		{"(0917) 123 4567", "09171234567"},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			got := normalizePHNumber(tc.input)
			if got != tc.expected {
				t.Errorf("normalizePHNumber(%q) = %q; want %q", tc.input, got, tc.expected)
			}
		})
	}
}

// TestMockSMSProvider verifies mock dispatch without external network calls.
func TestMockSMSProvider(t *testing.T) {
	provider := NewMockProvider()
	if provider.Name() != "mock" {
		t.Errorf("expected provider name 'mock', got %s", provider.Name())
	}

	resp, err := provider.Send(context.Background(), "09171234567", "Test DepEd Alert")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Status != "delivered" {
		t.Errorf("expected status 'delivered', got %s", resp.Status)
	}
	if !strings.HasPrefix(resp.MessageID, "mock_") {
		t.Errorf("expected mock message ID, got %s", resp.MessageID)
	}
}

// TestInitProvider verifies fallback to mock provider when no API key is supplied.
func TestInitProvider(t *testing.T) {
	p1 := InitProvider("mock", "", "")
	if p1.Name() != "mock" {
		t.Errorf("expected mock provider, got %s", p1.Name())
	}

	p2 := InitProvider("semaphore", "", "") // empty key should fallback to mock
	if p2.Name() != "mock" {
		t.Errorf("expected fallback to mock provider on empty key, got %s", p2.Name())
	}

	p3 := InitProvider("semaphore", "test-api-key", "DepEd")
	if p3.Name() != "semaphore" {
		t.Errorf("expected semaphore provider, got %s", p3.Name())
	}
}
