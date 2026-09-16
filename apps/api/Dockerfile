# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# Run stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

# Non-root runtime user — Sentinel/Pulse open embedded SQLite stores under
# /app, so chown before USER or those fail with the misleading
# "out of memory (14)" SQLITE_CANTOPEN error.
RUN addgroup -S app && adduser -S -G app app

WORKDIR /app

COPY --from=builder /app/server .

RUN chown -R app:app /app

USER app

EXPOSE 8080

CMD ["./server"]
