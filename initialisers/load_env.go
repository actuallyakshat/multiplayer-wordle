package initialisers

import (
	"log"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalln("Error loading .env file")
	} else {
		log.Println(".env file loaded")
	}
}
