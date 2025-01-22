package controllers

import (
	"errors"
	"log"
	"multiplayer-wordle/initialisers"
	"multiplayer-wordle/models"
	"multiplayer-wordle/utils"
	"multiplayer-wordle/websockets"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func CreateGame(c *fiber.Ctx) error {
	// Access the database
	db := initialisers.DB

	// Get the username from the context (assuming middleware sets this)
	username, ok := c.Locals("username").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	// Fetch the user by username
	var user models.Player
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user",
		})
	}

	// Check if the user is already in a game
	if user.GameID != 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You are already in a game",
		})
	}

	// Create a new game with the user as the creator and admin
	newGame := models.Game{
		State:   models.GameState("lobby"),
		Players: []models.Player{user},
	}

	if err := db.Create(&newGame).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create a game",
		})
	}

	// Update the user to set GameID and IsAdmin
	user.GameID = newGame.ID
	user.IsAdmin = true
	if err := db.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update user as game creator",
		})
	}

	// Remove password for each user

	for i := range newGame.Players {
		newGame.Players[i].Password = ""
	}

	// Respond with the created game details
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Game created successfully",
		"game":    newGame,
	})
}

func JoinGame(c *fiber.Ctx) error {
	username, ok := c.Locals("username").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	db := initialisers.DB

	var user models.Player
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user",
		})
	}

	gameIDParam := c.Params("gameID")
	gameID, err := strconv.ParseUint(gameIDParam, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid game ID",
		})
	}

	if user.GameID == uint(gameID) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You are already in this game",
		})
	}

	if user.GameID != 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You are already in a game",
		})
	}

	game := models.Game{}
	if err := db.Where("id = ?", gameID).Preload("Players").First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Game not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch game",
		})
	}

	// if game.State != models.GameState("lobby") {
	// 	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
	// 		"error": "Game is not in lobby state",
	// 	})
	// }

	for _, player := range game.Players {
		if player.Username == user.Username {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "You are already in this game",
			})
		}
	}

	user.GameID = game.ID
	user.IsAdmin = false
	if err := db.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update user as game player",
		})
	}

	game.Players = append(game.Players, user)
	if err := db.Save(&game).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update game",
		})
	}

	websockets.BroadcastPlayerJoined(game)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Joined game successfully",
		"game":    game,
	})
}

func GetGame(c *fiber.Ctx) error {
	username, ok := c.Locals("username").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	db := initialisers.DB

	var user models.Player
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user",
		})
	}

	gameID := c.Params("gameID")
	game := models.Game{}
	if err := db.Where("id = ?", gameID).Preload("Players").Preload("Guesses").First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Game not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch game",
		})
	}

	for i := range game.Players {
		game.Players[i].Password = ""
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Success",
		"game":    game,
	})
}

func StartGame(c *fiber.Ctx) error {
	username, ok := c.Locals("username").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	db := initialisers.DB

	var user models.Player
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user",
		})
	}

	gameID := c.Params("gameID")
	game := models.Game{}
	if err := db.Where("id = ?", gameID).Preload("Players").First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Game not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch game",
		})
	}

	//check if user in game
	var presentUser *models.Player
	for _, player := range game.Players {
		if player.Username == user.Username {
			presentUser = &player
			break
		}
	}
	if presentUser == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You are not in this game",
		})
	}

	if !presentUser.IsAdmin {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You are not the admin",
		})
	}

	if game.State == models.GameState("in-progress") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Game is already in progress",
		})
	}
	game.State = models.GameState("in-progress")

	// TODO: Set word of the game before starting
	game.Word = utils.GetRandomWord()

	if err := db.Save(&game).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update game",
		})
	}

	websockets.BroadcastGameStarted(game)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Game started successfully",
		"game":    game,
	})
}

func DeleteGame(gameID int) bool {

	db := initialisers.DB

	game := models.Game{}
	if err := db.Where("id = ?", gameID).Preload("Players").First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false
		}
		return false
	}

	// Set gameId of each player to 0 to indicate they are no longer in the game
	if err := db.Table("players").Where("game_id = ?", game.ID).Update("game_id", 0).Error; err != nil {
		return false
	}

	if err := db.Delete(&game).Error; err != nil {
		return false
	}

	return true
}

func LeaveGame(c *fiber.Ctx) error {
	username, ok := c.Locals("username").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	db := initialisers.DB

	var user models.Player
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user",
		})
	}

	gameID := c.Params("gameID")
	game := models.Game{}
	if err := db.Where("id = ?", gameID).Preload("Players").First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Game not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch game",
		})
	}

	isUserPresent := false
	for _, player := range game.Players {
		if player.Username == user.Username {
			isUserPresent = true
			break
		}
	}
	if !isUserPresent {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You are not in this game",
		})
	}

	// Set gameId of the user to 0 to indicate they are no longer in the game
	user.GameID = 0
	user.IsAdmin = false
	if err := db.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update user",
		})
	}

	//remove user from game
	if err := db.Model(&game).Association("Players").Delete(&user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to remove user from game",
		})
	}

	//remove user from game.players
	for i, player := range game.Players {
		if player.Username == user.Username {
			game.Players = append(game.Players[:i], game.Players[i+1:]...)
			break
		}
	}

	//make the next user the admin
	if len(game.Players) > 0 {
		game.Players[0].IsAdmin = true
		if err := db.Save(&game.Players[0]).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update user as admin",
			})
		}
	}

	if len(game.Players) == 0 {
		//delete game if no players left
		deleteSuccess := DeleteGame(int(game.ID))
		if !deleteSuccess {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to delete game",
			})
		} else {
			log.Println("Game deleted successfully: ", game.ID)
		}
	}

	if len(game.Players) == 1 {
		game.State = models.GameState("lobby")
		if err := db.Save(&game).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update game status",
			})
		}
		websockets.BroadcastGameOver(game)
	}

	websockets.BroadcastPlayerLeft(game)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "You left the game successfully",
	})

}

func isValidGuess(guessWord, word string) bool {
	//TODO: Implement validation logic

	//exmaple: Actual word: apple ; guess word: attire

	// letters := strings.Split(word, "")
	// guessLetters := strings.Split(guessWord, "")

	// if len(guessLetters) != len(letters) {
	// 	return false
	// }

	// for i := range guessLetters {
	// 	if guessLetters[i] != letters[i] {
	// 		return false
	// 	}
	// }

	log.Println(guessWord + " " + word)
	return true
}

func GuessWord(c *fiber.Ctx) error {
	username, ok := c.Locals("username").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	db := initialisers.DB

	var user models.Player
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user",
		})
	}

	gameID := c.Params("gameID")
	game := models.Game{}
	if err := db.Where("id = ?", gameID).Preload("Players").First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Game not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch game",
		})
	}

	if game.State != models.GameState("in-progress") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Game is not in progress",
		})
	}

	var body struct {
		GuessWord string `json:"guessWord"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse request body",
		})
	}

	body.GuessWord = strings.TrimSpace(body.GuessWord)
	if len(body.GuessWord) != 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "The guess word must be exactly 5 letters",
		})
	}

	// Check if the user is in the game
	isUserPresent := false
	for _, player := range game.Players {
		if player.Username == user.Username {
			isUserPresent = true
			break
		}
	}
	if !isUserPresent {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You are not in this game",
		})
	}

	// Check if the guess word is valid
	log.Println(isValidGuess(body.GuessWord, game.Word))

	guess := models.Guess{
		GameID:    game.ID,
		PlayerID:  user.ID,
		GuessWord: body.GuessWord,
		Feedback:  "Incorrect",
	}

	if err := db.Create(&guess).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create a guess",
		})
	}

	websockets.BroadcastNewGuess(game.ID, guess)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Guess word submitted successfully",
		"guess":   guess,
	})
}

func GameOver(c *fiber.Ctx) error {
	log.Println("GAME OVER")
	username, ok := c.Locals("username").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized access",
		})
	}

	db := initialisers.DB

	var user models.Player
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user",
		})
	}

	gameID := c.Params("gameID")
	game := models.Game{}
	if err := db.Where("id = ?", gameID).Preload("Players").First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Game not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch game",
		})
	}

	word := game.Word

	if game.State != models.GameState("in-progress") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Game is not in progress",
		})
	}

	// Check if the user is in the game
	isUserPresent := false
	for _, player := range game.Players {
		if player.Username == user.Username {
			isUserPresent = true
			break
		}
	}

	if !isUserPresent {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You are not in this game",
		})
	}

	game.State = models.GameState("lobby")
	game.Word = ""

	if err := db.Save(&game).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update game status",
		})
	}

	websockets.BroadcastGameOver(game)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Game over",
		"game":    game,
		"word":    word,
	})

}
