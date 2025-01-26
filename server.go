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

// init executes before the main function
func init() {
	initialisers.LoadEnv()
	initialisers.ConnectDB()
}

func main() {
	app := fiber.New()
	setupMiddlewares(app)
	setupRoutes(app)
	setupWebSocketRoutes(app)
	setupStaticFiles(app)
	startServer(app)
}

// Configure global middlewares
func setupMiddlewares(app *fiber.App) {
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, Upgrade, Connection",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS, PATCH",
		AllowCredentials: true,
	}))
}

// Configures API routes
func setupRoutes(app *fiber.App) {
	api := app.Group("/api")
	api.Use(logger.New())
	api.Use(middlewares.CheckAuth())
	routes.IndexRouter(api)
}

// Configures WebSocket routes
func setupWebSocketRoutes(app *fiber.App) {
	app.Use("/ws", cors.New())
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws/:gameID", websocket.New(websockets.Hub.HandleConnection, websocket.Config{
		Origins: []string{"http://localhost:3000", "http://localhost:5173", "https://multiplayer-wordle-production.up.railway.app", "https://wordle.actuallyakshat.in"},
	}))
}

// Serve static files and configure SPA fallback.
func setupStaticFiles(app *fiber.App) {
	app.Static("/", "./client_build")

	app.Get("*", func(c *fiber.Ctx) error {
		return c.SendFile("./client_build/index.html")
	})
}

// Start the Fiber app on the configured port.
func startServer(app *fiber.App) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	//For Railway
	err := app.Listen("0.0.0.0:" + port)

	//For Local Host
	// err := app.Listen(":" + port)

	if err != nil {
		panic(err)
	}
}
