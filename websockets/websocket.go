package websockets

import (
	"encoding/json"
	"fmt"
	"log"
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

	if gameID == "" || username == "" {
		log.Printf("Missing required parameters: gameID=%s, username=%s", gameID, username)
		c.Close()
		return
	}

	// Convert gameID to uint
	var game models.Game
	if err := initialisers.DB.Where("id = ?", gameID).First(&game).Error; err != nil {
		log.Printf("Error fetching game: %v\n", err)
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
	log.Println("New connection", conn)
	h.addConnection(conn)

	// Remove connection when function returns
	defer func() {
		h.removeConnection(conn)
		conn.Conn.Close()
	}()

	// Listen for WebSocket messages
	for {
		messageType, _, err := c.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Unexpected close error: %v", err)
			}
			break
		}
		if messageType == websocket.CloseMessage {
			log.Printf("Received close message from %s in game %d", conn.Username, conn.GameID)
			break
		}
	}
}

// addConnection adds a new connection to the hub
func (h *GameHub) addConnection(conn Connection) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.connections[conn.GameID] = append(h.connections[conn.GameID], conn)
	log.Printf("New connection from %s in game %d\n", conn.Username, conn.GameID)
	log.Printf("Total connections in game with gameId %d are: %d\n", conn.GameID, len(h.connections))
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

type GameOverData struct {
	Game    models.Game
	Winner  *models.Player
	Word    string
	Players []models.Player
}

// Masking password and guess word
func maskGameInfo(game models.Game) models.Game {
	removePasswords(game.Players)
	game.Word = ""
	return game
}

func removePasswords(players []models.Player) []models.Player {
	for i := range players {
		players[i].Password = ""
	}
	return players
}

// Convenience functions for broadcasting specific game events
func BroadcastGameCreated(game models.Game) {
	maskedGame := maskGameInfo(game)
	Hub.BroadcastToGame(game.ID, "game_created", maskedGame)
}

func BroadcastPlayerJoined(game models.Game) {
	maskedGame := maskGameInfo(game)
	Hub.BroadcastToGame(game.ID, "player_joined", maskedGame)
}

func BroadcastPlayerLeft(game models.Game) {
	maskedGame := maskGameInfo(game)
	Hub.BroadcastToGame(game.ID, "player_left", maskedGame)
}

func BroadcastGameStarted(game models.Game) {
	maskedGame := maskGameInfo(game)
	Hub.BroadcastToGame(game.ID, "game_started", maskedGame)
}

func BroadcastNewGuess(gameID uint, guess models.Guess) {
	Hub.BroadcastToGame(gameID, "new_guess", guess)
}

func BroadcastGameOver(gameOver GameOverData) {
	gameOver.Winner.Password = ""
	maskedGameOver := GameOverData{
		Game:    maskGameInfo(gameOver.Game),
		Winner:  gameOver.Winner,
		Word:    gameOver.Word,
		Players: removePasswords(gameOver.Players),
	}
	Hub.BroadcastToGame(gameOver.Game.ID, "game_over", maskedGameOver)
}
