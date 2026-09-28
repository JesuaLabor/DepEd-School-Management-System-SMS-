package models_test

import (
	"testing"

	"github.com/deped-sms/backend/internal/models"
)

// TestValidateLRN validates DepEd 12-digit numeric Learner Reference Number rules.
func TestValidateLRN(t *testing.T) {
	tests := []struct {
		name     string
		lrn      string
		expected bool
	}{
		{"Valid 12-digit LRN", "109283746501", true},
		{"Valid another LRN", "123456789012", true},
		{"Too short 11 digits", "10928374650", false},
		{"Too long 13 digits", "1092837465012", false},
		{"Empty string", "", false},
		{"Contains alphabetic character", "10928374650A", false},
		{"Contains hyphen formatting", "1092-8374-65", false},
		{"Contains space", "109283 46501", false},
		{"Letters only", "ABCDEFGHIJKL", false},
		{"Special symbols", "10928374650!", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := models.ValidateLRN(tc.lrn)
			if got != tc.expected {
				t.Errorf("ValidateLRN(%q) = %v; want %v", tc.lrn, got, tc.expected)
			}
		})
	}
}
