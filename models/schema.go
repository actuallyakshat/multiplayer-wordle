package models

import "gorm.io/gorm"

type Player struct {
	gorm.Model
	Username string `gorm:"uniqueIndex;not null" json:"username"`
	Password string `gorm:"not null" json:"password"`
	GameID   uint   `gorm:"not null" json:"game_id"` // Player can only be in one game at a time
}

type Game struct {
	gorm.Model
	Word    string    `gorm:"not null" json:"word"`                   // Secret word
	State   GameState `gorm:"not null" json:"state"`                  // Game state (in-progress, lobby)
	Players []Player  `gorm:"many2many:game_players;" json:"players"` // Many-to-many relation with players
	Guesses []Guess   `gorm:"foreignkey:GameID" json:"guesses"`       // Guesses made during the game
}

type Guess struct {
	gorm.Model
	GameID    uint   `gorm:"not null" json:"game_id"`
	PlayerID  uint   `gorm:"not null" json:"player_id"`
	GuessWord string `gorm:"not null" json:"guess_word"`
	Feedback  string `gorm:"not null" json:"feedback"`
}

// GameState type defines possible game states
type GameState string

const (
	GameStateInProgress GameState = "in-progress"
	GameStateFinished   GameState = "lobby"
)
