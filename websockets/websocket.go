package websockets

import (
	"encoding/json"
	"fmt"
	"multiplayer-wordle/initialisers"
	"multiplayer-wordle/models"
	"sync"

	"github.com/gofiber/contrib/websocket"
)

// GameHub manages all WebSocket connections for a game
type GameHub struct {
	// connections stores active WebSocket connections per game
	connections map[uint][]Connection
	mu          sync.RWMutex
}

// Connection represents a WebSocket connection for a specific player
type Connection struct {
	Conn     *websocket.Conn
	GameID   uint
	Username string
}

// Message represents the structure of WebSocket messages
type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

var (
	// Hub is the global instance of GameHub
	Hub = &GameHub{
		connections: make(map[uint][]Connection),
	}
)

// HandleConnection manages a new WebSocket connection
func (h *GameHub) HandleConnection(c *websocket.Conn) {
	// Get gameID and username from query params

	gameID := c.Params("gameID")
	username := c.Query("username")

	// Convert gameID to uint
	var game models.Game
	if err := initialisers.DB.Where("id = ?", gameID).First(&game).Error; err != nil {
		c.Close()
		return
	}

	// Create new connection
	conn := Connection{
		Conn:     c,
		GameID:   game.ID,
		Username: username,
	}

	// Add connection to hub
	h.addConnection(conn)

	// Remove connection when function returns
	defer func() {
		h.removeConnection(conn)
		conn.Conn.Close()
	}()

	// Listen for WebSocket messages
	for {
		messageType, _, err := c.ReadMessage()
		if err != nil || messageType == websocket.CloseMessage {
			break
		}
	}
}

// addConnection adds a new connection to the hub
func (h *GameHub) addConnection(conn Connection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.connections[conn.GameID] = append(h.connections[conn.GameID], conn)
}

// removeConnection removes a connection from the hub
func (h *GameHub) removeConnection(conn Connection) {
	h.mu.Lock()
	defer h.mu.Unlock()

	conns := h.connections[conn.GameID]
	for i, c := range conns {
		if c.Conn == conn.Conn {
			h.connections[conn.GameID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}

	// Clean up empty game connections
	if len(h.connections[conn.GameID]) == 0 {
		delete(h.connections, conn.GameID)
	}
}

// BroadcastToGame sends a message to all connected clients in a specific game
func (h *GameHub) BroadcastToGame(gameID uint, messageType string, payload interface{}) {
	message := Message{
		Type:    messageType,
		Payload: payload,
	}

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		fmt.Printf("Error marshaling message: %v\n", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, conn := range h.connections[gameID] {
		err := conn.Conn.WriteMessage(websocket.TextMessage, jsonMessage)
		if err != nil {
			fmt.Printf("Error sending message to %s: %v\n", conn.Username, err)
		}
	}
}

// Convenience functions for broadcasting specific game events
func BroadcastGameCreated(game models.Game) {
	Hub.BroadcastToGame(game.ID, "game_created", game)
}

func BroadcastPlayerJoined(game models.Game) {
	Hub.BroadcastToGame(game.ID, "player_joined", game)
}

func BroadcastPlayerLeft(game models.Game) {
	Hub.BroadcastToGame(game.ID, "player_left", game)
}

func BroadcastGameStarted(game models.Game) {
	Hub.BroadcastToGame(game.ID, "game_started", game)
}

func BroadcastNewGuess(gameID uint, guess models.Guess) {
	Hub.BroadcastToGame(gameID, "new_guess", guess)
}

func BroadcastGameOver(game models.Game) {
	Hub.BroadcastToGame(game.ID, "game_over", game)
}
