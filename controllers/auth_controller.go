package controllers

import (
	"fmt"
	"log"
	"multiplayer-wordle/initialisers"
	"multiplayer-wordle/models"
	"os"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// Helper function to validate user input
func validateRegistrationInput(username, password string) (string, bool) {
	if username == "" || password == "" {
		return "username and password are required", false
	}
	if len(password) < 6 {
		return "password must be at least 6 characters long", false
	}
	return "", true
}

// Helper function to check if a user exists
func isUsernameUnique(db *gorm.DB, username string) bool {
	var user models.Player
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return false
	}
	return true
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}

func verifyPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func generateJWT(username string) (string, error) {
	secretKey := os.Getenv("JWT_SECRET")
	if secretKey == "" {
		return "", fmt.Errorf("JWT_SECRET is not set")
	}

	claims := jwt.MapClaims{
		"username": username,
		"exp":      time.Now().Add(24 * 30 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(secretKey))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %v", err)
	}

	return signedToken, nil
}

// Register handler
func Register(c *fiber.Ctx) error {

	db := initialisers.DB

	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse request body",
		})
	}

	// Validate input
	if message, valid := validateRegistrationInput(body.Username, body.Password); !valid {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": message,
		})
	}

	if db == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database not connected",
		})
	}

	// Check if the username already exists
	if isUsernameUnique(db, body.Username) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Username already exists",
		})
	}

	//Hash password
	hashedPassword, err := hashPassword(body.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to hash password",
		})
	}

	// Register the user
	newUser := models.Player{
		Username: body.Username,
		Password: hashedPassword,
	}

	if err := db.Create(&newUser).Error; err != nil {
		fmt.Println("Error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to register user",
		})
	}

	newUser.Password = ""

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "User registered successfully",
		"user":    newUser,
	})
}

// Login handler
func Login(c *fiber.Ctx) error {
	var db = initialisers.DB
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse request body",
		})
	}

	user := models.Player{}
	if err := db.Where("username = ?", body.Username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid username or password",
		})
	}

	if !verifyPassword(body.Password, user.Password) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid username or password",
		})
	}

	//sign jwt
	token, err := generateJWT(user.Username)
	if err != nil {
		log.Println("Something went wrong while generating JWT token")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Something went wrong",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "	Login successful",
		"jwt":     token,
	})
}

// Me handler
func Me(c *fiber.Ctx) error {
	db := initialisers.DB
	username := c.Locals("username").(string)
	user := models.Player{}

	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Something went wrong",
		})
	}

	user.Password = ""

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Success",
		"user":    user,
	})

}
