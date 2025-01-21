package main

import (
	"multiplayer-wordle/initialisers"
	"multiplayer-wordle/middlewares"
	"multiplayer-wordle/routes"
	"multiplayer-wordle/websockets"
	"os"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func init() {
	initialisers.LoadEnv()
	initialisers.ConnectDB()
}

func main() {
	app := fiber.New()
	app.Use(cors.New())

	api := app.Group("/api")

	api.Use(logger.New())
	api.Use(middlewares.CheckAuth())

	routes.IndexRouter(api)

	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws/:gameID", websocket.New(func(c *websocket.Conn) {
		websockets.Hub.HandleConnection(c)
	}))

	// Serve static files from the "build" directory
	app.Static("/", "./client_build")

	// Fallback to index.html for SPA routes
	app.All("*", func(c *fiber.Ctx) error {
		return c.SendFile("./client_build/index.html")
	})

	port := os.Getenv("PORT")

	err := app.Listen(":" + port)
	if err != nil {
		panic(err)
	}
}
