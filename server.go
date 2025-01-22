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

	// CORS configuration
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000, http://localhost:5173",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS, PATCH",
		AllowCredentials: true,
	}))

	// API routes
	api := app.Group("/api")
	api.Use(logger.New())
	api.Use(middlewares.CheckAuth())
	routes.IndexRouter(api)

	// WebSocket configuration
	app.Use("/ws", cors.New()) // Additional CORS middleware specifically for WebSocket path
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// WebSocket route
	app.Get("/ws/:gameID", websocket.New(websockets.Hub.HandleConnection, websocket.Config{
		Origins: []string{"http://localhost:3000", "http://localhost:5173"},
	}))

	// Static file serving
	app.Static("/", "./client_build")

	// SPA fallback
	app.Get("*", func(c *fiber.Ctx) error {
		return c.SendFile("./client_build/index.html")
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port if not specified
	}

	err := app.Listen(":" + port)
	if err != nil {
		panic(err)
	}
}
