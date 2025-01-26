package initialisers

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	if os.Getenv("GO_ENV") != "production" {
		log.Println("Loading .env file")
		if err := godotenv.Load(); err != nil {
			log.Println("No .env file found or error loading: ", err)
		}
	}
}
