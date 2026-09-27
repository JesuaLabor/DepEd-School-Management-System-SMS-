package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration for the application.
type Config struct {
	Port               string
	Env                string
	MongoURI           string
	MongoDBName        string
	JWTSecret          string
	JWTExpiryHours     int
	GoogleClientID     string
	GoogleClientSecret string
}

// Load reads a .env file (if present) and environment variables into Config.
func Load() *Config {
	_ = godotenv.Load()

	expiry, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil {
		expiry = 24
	}

	return &Config{
		Port:               getEnv("PORT", "8080"),
		Env:                getEnv("ENV", "development"),
		MongoURI:           getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDBName:        getEnv("MONGO_DB_NAME", "deped_sms"),
		JWTSecret:          getEnv("JWT_SECRET", "dev-secret-change-me"),
		JWTExpiryHours:     expiry,
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
