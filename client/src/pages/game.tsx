import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import api from "../lib/axios";
import { useAuth } from "../store/auth";
import { useWebSocketMessage } from "../store/websocket";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

interface GameState {
  currentAttempt: number;
  guesses: string[];
  currentGuess: string;
  usedLetters: {
    [key: string]: "correct" | "present" | "absent" | undefined;
  };
}

export default function GameScreen() {
  const { id } = useParams<{ id: string }>();
  const [gameState, setGameState] = useState<GameState>({
    currentAttempt: 0,
    guesses: Array(MAX_ATTEMPTS).fill(""),
    currentGuess: "",
    usedLetters: {},
  });

  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  //Websockets
  useWebSocketMessage("player_joined", (data) => {
    console.log("Player joined", data);
  });

  useEffect(() => {
    async function getGameDetails() {
      try {
        setLoading(true);
        const response = await api.get(`/api/game/${id}`);
        if (response.status === 200) {
          console.log("Game details: ", response.data);
        } else {
          console.error("Failed to fetch game details");
          return;
        }

        if (response.data.game.state == "lobby") {
          // Redirect to lobby page
          navigate(`/lobby/${id}`);
        }

        // setGameState(response.data.game);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    getGameDetails();
  }, [id, navigate]);

  //Websockets
  useWebSocketMessage("game_over", (data) => {
    console.log("Game over", data);
    navigate(`/lobby/${id}/`);
  });

  useWebSocketMessage("new_guess", (data) => {
    console.log("New guess", data);
  });

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameState.currentAttempt >= MAX_ATTEMPTS) return;

      if (key === "⌫" || key === "Backspace") {
        setGameState((prev) => ({
          ...prev,
          currentGuess: prev.currentGuess.slice(0, -1),
        }));
      } else if (key === "ENTER" || key === "Enter") {
        if (gameState.currentGuess.length === WORD_LENGTH) {
          // Here you would normally validate the word and check against the solution
          const newGuesses = [...gameState.guesses];
          newGuesses[gameState.currentAttempt] = gameState.currentGuess;

          // Simulate letter status (replace with actual logic based on solution)
          const newUsedLetters = { ...gameState.usedLetters };
          gameState.currentGuess.split("").forEach((letter) => {
            if (!newUsedLetters[letter]) {
              newUsedLetters[letter] =
                Math.random() > 0.5 ? "correct" : "present";
            }
          });

          setGameState((prev) => ({
            ...prev,
            guesses: newGuesses,
            currentAttempt: prev.currentAttempt + 1,
            currentGuess: "",
            usedLetters: newUsedLetters,
          }));
        }
      } else if (gameState.currentGuess.length < WORD_LENGTH) {
        // For physical keyboard input, only accept letters A-Z
        const letter = key.length === 1 ? key.toUpperCase() : key;
        if (/^[A-Z]$/.test(letter)) {
          setGameState((prev) => ({
            ...prev,
            currentGuess: prev.currentGuess + letter,
          }));
        }
      }
    },
    [gameState],
  );

  // Add keyboard event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyPress(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameState, handleKeyPress]); // Include gameState and handleKeyPress in dependencies to ensure we're using latest state

  const getLetterClass = (letter: string, isCurrentGuess: boolean) => {
    if (!letter) return "bg-zinc-700 border-zinc-400";
    if (isCurrentGuess) return "bg-zinc-500 border-zinc-400";

    const status = gameState.usedLetters[letter];
    switch (status) {
      case "correct":
        return "bg-green-500 text-white border-green-600";
      case "present":
        return "bg-yellow-500 text-white border-yellow-600";
      case "absent":
        return "bg-gray-600 text-white border-gray-700";
      default:
        return "bg-gray-900 border-gray-400";
    }
  };

  async function leaveGameHandler() {
    try {
      const response = await api.patch(`/api/game/${id}/leave`);
      if (response.status === 200) {
        console.log("Left game successfully");
        refreshUser();
        navigate("/");
      } else {
        console.error("Failed to leave game");
        return;
      }
    } catch (error) {
      console.error(error);
    }
  }

  if (loading) return;

  return (
    <div className="page-background flex min-h-screen flex-col">
      <div className="flex h-full flex-1 flex-col items-center justify-start px-4 py-32">
        <h2 className="mb-8 text-2xl font-bold">Wordle Race</h2>

        {/* Game Grid */}
        <div className="mb-8 grid grid-rows-6 gap-2">
          {gameState.guesses.map((guess, attemptIndex) => (
            <div key={attemptIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: WORD_LENGTH }).map((_, letterIndex) => {
                const letter =
                  attemptIndex === gameState.currentAttempt
                    ? gameState.currentGuess[letterIndex]
                    : guess[letterIndex];

                return (
                  <div
                    key={letterIndex}
                    className={`flex h-14 w-14 items-center justify-center border-2 text-2xl font-bold uppercase transition-colors ${getLetterClass(
                      letter,
                      attemptIndex === gameState.currentAttempt,
                    )} `}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Keyboard */}
        <Keyboard
          onKeyPress={handleKeyPress}
          usedLetters={gameState.usedLetters}
        />

        <button
          className="mt-5 text-sm font-medium text-red-500 hover:underline"
          onClick={leaveGameHandler}
        >
          Quit game
        </button>
      </div>
    </div>
  );
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  usedLetters: {
    [key: string]: "correct" | "present" | "absent" | undefined;
  };
}

function Keyboard({ onKeyPress, usedLetters }: KeyboardProps) {
  const getKeyClass = (key: string) => {
    const status = usedLetters[key];
    const baseClass =
      "rounded font-bold uppercase bg-gray-600 hover:bg-gray-500 transition-colors";

    if (key === "ENTER" || key === "⌫") {
      return `${baseClass} px-4 py-4 text-sm bg-gray-300 hover:bg-gray-500`;
    }

    switch (status) {
      case "correct":
        return `${baseClass} bg-green-500 text-white`;
      case "present":
        return `${baseClass} bg-yellow-500 text-white`;
      case "absent":
        return `${baseClass} bg-gray-600 text-white`;
      default:
        return `${baseClass} bg-gray-300 hover:bg-gray-400`;
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-2">
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} className="my-1.5 flex justify-center gap-1.5">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              className={`${getKeyClass(key)} h-14 min-w-[40px] p-2`}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
