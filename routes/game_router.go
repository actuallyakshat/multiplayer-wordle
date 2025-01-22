package routes

import (
	"multiplayer-wordle/controllers"

	"github.com/gofiber/fiber/v2"
)

func GameRouter(api fiber.Router) {
	api.Post("/game", controllers.CreateGame)
	api.Get("/game/:gameID", controllers.GetGame)
	api.Patch("/game/:gameID/join", controllers.JoinGame)
	api.Patch("/game/:gameID/leave", controllers.LeaveGame)
	api.Patch("/game/:gameID/start", controllers.StartGame)
	api.Post("/game/:gameID/guess", controllers.GuessWord)
	api.Patch("/game/:gameId/gameover", controllers.GameOver)
}
