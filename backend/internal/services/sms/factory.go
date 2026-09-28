package sms

import (
	"strings"
)

// InitProvider selects and configures the SMS provider based on configuration.
func InitProvider(providerName, apiKey, senderName string) Provider {
	p := strings.ToLower(strings.TrimSpace(providerName))
	if p == "semaphore" && apiKey != "" {
		return NewSemaphoreProvider(apiKey, senderName)
	}
	return NewMockProvider()
}
