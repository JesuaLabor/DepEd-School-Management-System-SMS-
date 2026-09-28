# Multi-stage production Dockerfile for DepEd SMS Backend

# ── Stage 1: Build binary ──
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build statically linked binaries
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/seed ./cmd/seed

# ── Stage 2: Minimal runtime image ──
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S deped && adduser -S deped -G deped

WORKDIR /home/deped

COPY --from=builder /bin/server /bin/server
COPY --from=builder /bin/seed /bin/seed

# Default Philippine time zone
ENV TZ=Asia/Manila
ENV PORT=8080
ENV ENV=production

USER deped

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["/bin/server"]
