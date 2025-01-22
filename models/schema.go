package models

import "gorm.io/gorm"

type Player struct {
	gorm.Model
	Username string `gorm:"uniqueIndex;not null" json:"username"`
	Password string `gorm:"not null" json:"password"`
	GameID   uint   `gorm:"not null" json:"gameId"` // Player can only be in one game at a time
	IsAdmin  bool   `gorm:"not null; default:false" json:"isAdmin"`
}

type Game struct {
	gorm.Model
	Word    string    `gorm:"not null" json:"word"` // Secret word
	State   GameState `gorm:"not null; default:lobby" json:"state"`
	Players []Player  `gorm:"many2many:game_players;constraint:OnDelete:CASCADE;" json:"players"` // Many-to-many relation with players
	Guesses []Guess   `gorm:"foreignkey:GameID;constraint:OnDelete:CASCADE;" json:"guesses"`      // Guesses made during the game
}

type Guess struct {
	gorm.Model
	GameID    uint   `gorm:"not null" json:"gameId"`
	PlayerID  uint   `gorm:"not null" json:"playerId"`
	GuessWord string `gorm:"not null" json:"guessWord"`
	Feedback  []byte `gorm:"not null" json:"feedback"`
}

// GameState type defines possible game states
type GameState string

const (
	GameStateInProgress GameState = "in-progress"
	GameStateFinished   GameState = "lobby"
)
