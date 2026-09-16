// Package realtime is a tiny WebSocket fan-out hub. One Hub per process;
// each authenticated user can have multiple connections (e.g. desktop +
// mobile + web). The hub owns the registry and exposes safe SendToUser /
// SendToUsers / Broadcast helpers that handlers call from anywhere.
//
// Wire format on the websocket is a JSON envelope:
//
//	{ "type": "<topic>", "payload": { ... } }
//
// Topics are caller-defined strings. Suggested namespacing:
//
//	chat.message.new       — payload is a chat message
//	notification.new       — payload is a notification
//	system.connected       — server greeting on first connect
//	resource.<name>.<verb> — e.g. building.created, lease.expired
package realtime

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// Event is the envelope every WS message uses on the wire.
type Event struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Client is one open WebSocket connection bound to a user.
type Client struct {
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
}

// Hub manages connected clients. Safe for concurrent use.
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*Client]struct{} // userID -> set of connections
}

// NewHub returns an empty Hub.
func NewHub() *Hub {
	return &Hub{clients: make(map[string]map[*Client]struct{})}
}

// Register adds a client to the hub. A user can have multiple registered
// clients (different devices); each gets its own slot.
func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	set, ok := h.clients[c.UserID]
	if !ok {
		set = make(map[*Client]struct{})
		h.clients[c.UserID] = set
	}
	set[c] = struct{}{}
	log.Printf("[realtime] client registered user=%s total=%d", c.UserID, len(set))
}

// Unregister removes a client and closes its Send channel. Safe to call
// once per client (e.g. from the read pump's defer).
func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.clients[c.UserID]; ok {
		if _, exists := set[c]; exists {
			delete(set, c)
			close(c.Send)
		}
		if len(set) == 0 {
			delete(h.clients, c.UserID)
		}
	}
}

// SendToUser delivers an event to every connection bound to userID.
// If a connection's send buffer is full the message is dropped for that
// connection only — we never block the entire hub on a slow client.
// The slow client will resync on its next REST poll/refetch.
func (h *Hub) SendToUser(userID string, evt Event) {
	bytes, err := json.Marshal(evt)
	if err != nil {
		log.Printf("[realtime] marshal: %v", err)
		return
	}
	h.mu.RLock()
	set := h.clients[userID]
	targets := make([]*Client, 0, len(set))
	for c := range set {
		targets = append(targets, c)
	}
	h.mu.RUnlock()
	for _, c := range targets {
		select {
		case c.Send <- bytes:
		default:
			log.Printf("[realtime] dropping message for slow client user=%s", userID)
		}
	}
}

// SendToUsers fans out to a slice of user IDs.
func (h *Hub) SendToUsers(userIDs []string, evt Event) {
	for _, uid := range userIDs {
		h.SendToUser(uid, evt)
	}
}

// Broadcast delivers an event to every connected client, regardless of
// user. Use sparingly — for system-wide announcements, maintenance
// notices, etc.
func (h *Hub) Broadcast(evt Event) {
	bytes, err := json.Marshal(evt)
	if err != nil {
		log.Printf("[realtime] marshal: %v", err)
		return
	}
	h.mu.RLock()
	targets := make([]*Client, 0)
	for _, set := range h.clients {
		for c := range set {
			targets = append(targets, c)
		}
	}
	h.mu.RUnlock()
	for _, c := range targets {
		select {
		case c.Send <- bytes:
		default:
			log.Printf("[realtime] dropping broadcast for slow client user=%s", c.UserID)
		}
	}
}
