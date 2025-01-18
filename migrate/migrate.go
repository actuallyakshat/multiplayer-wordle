package main

import (
	"multiplayer-wordle/initialisers"
	"multiplayer-wordle/models"
)

func init() {
	initialisers.LoadEnv()
	initialisers.ConnectDB()
}

func main() {
	initialisers.DB.AutoMigrate(&models.Player{}, &models.Game{}, &models.Guess{})
}
