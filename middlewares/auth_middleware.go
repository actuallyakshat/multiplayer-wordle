package middlewares

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var ignoredRoutes = []string{"/api/register", "/api/login"}

func isIgnoredRoute(c *fiber.Ctx) bool {
	for _, route := range ignoredRoutes {
		if c.Path() == route {
			return true
		}
	}
	return false
}

func CheckAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if isIgnoredRoute(c) {
			return c.Next()
		}

		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing or invalid authorization header",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil {
			log.Println("Token Parsing Error:", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			username, ok := claims["username"].(string)
			if !ok {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Invalid token claims",
				})
			}

			c.Locals("username", username)
			return c.Next()
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid token",
		})
	}
}
