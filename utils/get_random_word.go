package utils

import (
	"math/rand"
	"multiplayer-wordle/constants"
	"time"
)

func GetRandomWord() string {

	rand.Seed(time.Now().UnixNano())

	// Generate a random index
	randomIndex := rand.Intn(len(constants.WordList))

	// Access the random element
	randomWord := constants.WordList[randomIndex]
	return randomWord
}
