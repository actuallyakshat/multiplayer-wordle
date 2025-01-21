package routes

import (
	"multiplayer-wordle/controllers"

	"github.com/gofiber/fiber/v2"
)

func IndexRouter(api fiber.Router) {
	// Health check route
	api.Get("/", controllers.HealthCheck)

	// Add authentication-related routes
	AuthRouter(api)
	GameRouter(api)
}
