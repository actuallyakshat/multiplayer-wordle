package utils

import (
	"math/rand"
	"multiplayer-wordle/constants"
)

func GetRandomWord() string {
	randomIndex := rand.Intn(len(constants.WordList))
	randomWord := constants.WordList[randomIndex]
	return randomWord
}
