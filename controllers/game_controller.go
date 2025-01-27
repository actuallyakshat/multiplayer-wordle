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

	//Don't allow more than 8 players in a game
	if (len(game.Players) + 1) > 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Game is full",
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

	game.Word = ""

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

	game.Word = ""
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

	if len(game.Players) == 1 && game.State == models.GameState("in-progress") {
		if err := EndGame(game, nil); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to end the game",
			})
		}
	}

	websockets.BroadcastPlayerLeft(game)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "You left the game successfully",
	})

}

// returns boolean and feeback
func isValidGuess(guessWord, word string) (bool, string) {
	letters := strings.Split(word, "")
	guessLetters := strings.Split(guessWord, "")
	feedback := []rune("00000")

	if guessWord == word {
		return true, "22222"
	}

	// First pass: check for correct positions
	for i := 0; i < 5; i++ {
		if letters[i] == guessLetters[i] {
			feedback[i] = '2'
			letters[i] = "" // Mark this letter as used
		}
	}

	// Second pass: check for present but wrong positions
	for i := 0; i < 5; i++ {
		if feedback[i] == '0' {
			for j := 0; j < 5; j++ {
				if guessLetters[i] == letters[j] {
					feedback[i] = '1'
					letters[j] = ""
					break
				}
			}
		}
	}

	log.Println("Guess:", guessWord, "Word:", word, "Feedback:", string(feedback))
	return false, string(feedback)
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

	if game.State != models.GameState("in-progress") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Game is not in progress",
		})
	}

	var body struct {
		GuessWord     string `json:"guessWord"`
		AttemptNumber uint   `json:"attemptNumber"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse request body",
		})
	}

	body.GuessWord = strings.TrimSpace(body.GuessWord)

	if len(body.GuessWord) != 5 || body.GuessWord == "" {
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

	// Check if overlapping attempt number for user
	for _, guess := range game.Guesses {
		if guess.PlayerID == user.ID && guess.AttemptNumber == body.AttemptNumber {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "You have already made a guess with this attempt number",
			})
		}
	}

	// Check if the guess word is valid
	isCorrect, feedback := isValidGuess(body.GuessWord, game.Word)
	guess := models.Guess{
		GameID:        game.ID,
		PlayerID:      user.ID,
		GuessWord:     body.GuessWord,
		Feedback:      feedback,
		AttemptNumber: body.AttemptNumber,
	}

	if isCorrect {
		// Someone just won the game, broadcast the winner
		if err := EndGame(game, &user); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to end the game",
			})
		}

		// Return success response without saving the guess
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Guess word submitted successfully",
			"guess":   guess,
		})
	}

	// TODO: Check if all users have exhausted their guesses
	// Check if all players have used all 6 attempts
	// log.Println("GAME GUESSES", len(game.Guesses))
	// log.Println("GAME PLAYERS", len(game.Players))
	// log.Println("COMPARING: ", (len(game.Guesses)), " WITH ", (len(game.Players)*6)-1)

	if (len(game.Guesses)) == ((len(game.Players) * 6) - 1) {
		if err := EndGame(game, nil); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to end the game",
			})
		}
		// Return success response without saving the guess
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Guess word submitted successfully",
			"guess":   guess,
		})
	} else {

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

}

func EndGame(game models.Game, player *models.Player) error {
	db := initialisers.DB

	if game.State != models.GameState("in-progress") {
		return errors.New("game is not in progress")
	}

	game.State = models.GameState("lobby")
	word := game.Word
	game.Word = ""

	//Clear all guesses before ending game
	if err := db.Where("game_id = ?", game.ID).Delete(&models.Guess{}).Error; err != nil {
		return errors.New("failed to clear guesses")
	}

	//Update game status to lobby and resetting word
	if err := db.Save(&game).Error; err != nil {
		return errors.New("failed to update game status")
	}

	gameOverData := websockets.GameOverData{
		Game:    game,
		Winner:  player,
		Word:    word,
		Players: game.Players,
	}

	log.Println("EVERYTHING GOOD UPTIL BROADCAST")

	websockets.BroadcastGameOver(gameOverData)
	return nil
}
