package main

import (
	"multiplayer-wordle/initialisers"
	"multiplayer-wordle/middlewares"
	"multiplayer-wordle/routes"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func init() {
	initialisers.LoadEnv()
	initialisers.ConnectDB()
}

func main() {
	app := fiber.New()
	app.Use(cors.New())

	api := app.Group("/api")

	api.Use(middlewares.CheckAuth())

	routes.IndexRouter(api)

	port := os.Getenv("PORT")

	err := app.Listen(":" + port)
	if err != nil {
		panic(err)
	}
}
