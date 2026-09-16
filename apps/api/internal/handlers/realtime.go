package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"megagig-software-solution/apps/api/internal/realtime"
	"megagig-software-solution/apps/api/internal/services"
)

const (
	wsWriteWait      = 10 * time.Second
	wsPongWait       = 60 * time.Second
	wsPingPeriod     = (wsPongWait * 9) / 10
	wsMaxMessageSize = 1024 // we don't expect clients to send anything large
)

// upgrader allows any origin — desktop clients use Wails (file://) and
// the API is mounted behind CORS that already restricts origins for
// regular HTTP traffic.
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// RealtimeHandler upgrades an HTTP request to a WebSocket and registers
// it with the hub. Authentication uses a query-string JWT (?token=...)
// because browsers can't set custom Authorization headers on WebSocket
// handshakes — there is no other portable way to pass the JWT.
type RealtimeHandler struct {
	Hub  *realtime.Hub
	Auth *services.AuthService
}

// NewRealtimeHandler wires the handler to the global Hub and AuthService.
func NewRealtimeHandler(hub *realtime.Hub, auth *services.AuthService) *RealtimeHandler {
	return &RealtimeHandler{Hub: hub, Auth: auth}
}

// Connect upgrades the request to a WebSocket connection.
//
//	GET /api/ws?token=<jwt>
func (h *RealtimeHandler) Connect(c *gin.Context) {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "MISSING_TOKEN", "message": "?token query is required"}})
		return
	}
	claims, err := h.Auth.ValidateToken(tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "INVALID_TOKEN", "message": err.Error()}})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[ws] upgrade error: %v", err)
		return
	}

	client := &realtime.Client{
		UserID: claims.UserID,
		Conn:   conn,
		Send:   make(chan []byte, 32),
	}
	h.Hub.Register(client)

	// Greeting so the client knows the link is live.
	greeting, _ := json.Marshal(realtime.Event{
		Type:    "system.connected",
		Payload: gin.H{"user_id": claims.UserID},
	})
	select {
	case client.Send <- greeting:
	default:
	}

	go writePump(client)
	go readPump(h.Hub, client)
}

// readPump pumps messages from the client → hub. We don't currently
// accept commands from clients (mutations go through the REST API), so
// this loop just services ping/pong and cleans up on disconnect.
func readPump(hub *realtime.Hub, c *realtime.Client) {
	defer func() {
		hub.Unregister(c)
		_ = c.Conn.Close()
	}()
	c.Conn.SetReadLimit(wsMaxMessageSize)
	_ = c.Conn.SetReadDeadline(time.Now().Add(wsPongWait))
	c.Conn.SetPongHandler(func(string) error {
		_ = c.Conn.SetReadDeadline(time.Now().Add(wsPongWait))
		return nil
	})
	for {
		if _, _, err := c.Conn.ReadMessage(); err != nil {
			return
		}
	}
}

// writePump pumps messages from the hub → client and emits keepalive pings.
func writePump(c *realtime.Client) {
	ticker := time.NewTicker(wsPingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.Conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.Send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
			if !ok {
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
