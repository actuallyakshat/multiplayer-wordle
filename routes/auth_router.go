package routes

import (
	"multiplayer-wordle/controllers"

	"github.com/gofiber/fiber/v2"
)

func AuthRouter(api fiber.Router) {
	api.Post("/register", controllers.Register)
	api.Post("/login", controllers.Login)
	api.Get("/me", controllers.Me)
}
