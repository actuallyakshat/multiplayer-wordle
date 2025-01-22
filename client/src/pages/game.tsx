import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import api from "../lib/axios";
import { useAuth } from "../store/auth";
import { useWebSocketMessage } from "../store/websocket";
import { validateGuess } from "../lib/validateGuess";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

interface Guess {
  id: string;
  gameId: string;
  playerId: string;
  guessWord: string;
  feedback: number[];
  createdAt: string;
}

interface Player {
  id: string;
  username: string;
  guesses: Guess[];
}

interface GameState {
  currentAttempt: number;
  guesses: string[];
  currentGuess: string;
  usedLetters: {
    [key: string]: "correct" | "present" | "absent" | undefined;
  };
  players: Player[];
}

const initialGameState: GameState = {
  currentAttempt: 0,
  guesses: Array(MAX_ATTEMPTS).fill(""),
  currentGuess: "",
  usedLetters: {},
  players: [],
};

export default function GameScreen() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const { refreshUser, user, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  const numericId = Number(id);
  if (isNaN(numericId)) {
    navigate("/not-found");
  }

  // Update game state when receiving new guesses
  useWebSocketMessage("new_guess", (data: { guess: Guess }) => {
    if (!data?.guess) return;

    setGameState((prev) => {
      const newPlayers = [...(prev.players || [])];
      const playerIndex = newPlayers.findIndex(
        (p) => p?.id === data.guess.playerId,
      );

      if (playerIndex !== -1) {
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          guesses: [...(newPlayers[playerIndex].guesses || []), data.guess],
        };
      }

      // Update letter statuses for the current user's guesses
      if (data.guess.playerId === user?.ID) {
        const newUsedLetters = { ...(prev.usedLetters || {}) };
        const guessWord = data.guess.guessWord.toUpperCase();

        guessWord.split("").forEach((letter, index) => {
          if (data.guess.feedback[index] === 2) {
            newUsedLetters[letter] = "correct";
          } else if (data.guess.feedback[index] === 1) {
            newUsedLetters[letter] = "present";
          } else {
            if (!newUsedLetters[letter]) {
              newUsedLetters[letter] = "absent";
            }
          }
        });

        const newGuesses = [...(prev.guesses || Array(MAX_ATTEMPTS).fill(""))];
        newGuesses[prev.currentAttempt] = guessWord;

        return {
          ...prev,
          players: newPlayers,
          usedLetters: newUsedLetters,
          guesses: newGuesses,
          currentAttempt: (prev.currentAttempt || 0) + 1,
          currentGuess: "",
        };
      }

      return {
        ...prev,
        players: newPlayers,
      };
    });
  });

  useWebSocketMessage("player_joined", (data: { player: Player }) => {
    if (!data?.player) return;

    setGameState((prev) => ({
      ...prev,
      players: [...(prev.players || []), data.player],
    }));
  });

  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    async function getGameDetails() {
      if (!id) return;

      try {
        setLoading(true);
        const response = await api.get(`/api/game/${id}`);
        if (response.status === 200) {
          const { game, players } = response.data;

          if (game?.state === "lobby") {
            navigate(`/lobby/${id}`);
            return;
          }

          setGameState((prev) => ({
            ...prev,
            players: players || [],
          }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    getGameDetails();
  }, [id, navigate]);

  useWebSocketMessage("game_over", (data) => {
    if (!id) return;
    console.log("GAME OVER", data);
    navigate(`/lobby/${id}/`);
  });

  const handleKeyPress = useCallback(
    async (key: string) => {
      if (!gameState || gameState.currentAttempt >= MAX_ATTEMPTS) return;

      if (key === "⌫" || key === "Backspace") {
        setGameState((prev) => ({
          ...prev,
          currentGuess: prev.currentGuess.slice(0, -1),
        }));
      } else if (key === "ENTER" || key === "Enter") {
        if (gameState.currentGuess.length === WORD_LENGTH) {
          const isValid = await validateGuess(gameState.currentGuess);

          if (!isValid) {
            alert("Invalid guess. Please enter a valid word");
            return;
          }

          try {
            if (!id) return;
            await api.post(`/api/game/${id}/guess`, {
              guessWord: gameState.currentGuess,
            });
          } catch (error) {
            console.error("Failed to submit guess:", error);
            alert("Failed to submit guess. Please try again.");
          }
        }
      } else if (gameState.currentGuess.length < WORD_LENGTH) {
        const letter = key.length === 1 ? key.toUpperCase() : key;
        if (/^[A-Z]$/.test(letter)) {
          setGameState((prev) => ({
            ...prev,
            currentGuess: prev.currentGuess + letter,
          }));
        }
      }
    },
    [gameState, id],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyPress(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress]);

  const getFeedbackClass = (feedback: number) => {
    switch (feedback) {
      case 2:
        return "bg-green-500 border-green-600";
      case 1:
        return "bg-yellow-500 border-yellow-600";
      case 0:
        return "bg-gray-600 border-gray-700";
      default:
        return "bg-zinc-700 border-zinc-400";
    }
  };

  const getLetterClass = (letter: string, isCurrentGuess: boolean) => {
    if (!letter) return "bg-zinc-700 border-zinc-400";
    if (isCurrentGuess) return "bg-zinc-500 border-zinc-400";

    const status = gameState?.usedLetters?.[letter];
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
    if (!id) return;

    try {
      const response = await api.patch(`/api/game/${id}/leave`);
      if (response.status === 200) {
        refreshUser();
        navigate("/");
      }
    } catch (error) {
      console.error(error);
    }
  }

  if (loading) return null;

  const otherPlayers =
    gameState?.players?.filter((p) => p?.id !== user?.ID) || [];

  return (
    <div className="page-background flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-start px-4 py-8">
        <h2 className="mb-8 text-2xl font-bold">Wordle Race</h2>

        {/* Main player's grid */}
        <div className="mb-8 grid grid-rows-6 gap-2">
          {(gameState?.guesses || []).map((guess, attemptIndex) => (
            <div key={attemptIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: WORD_LENGTH }).map((_, letterIndex) => {
                const letter =
                  attemptIndex === gameState?.currentAttempt
                    ? gameState?.currentGuess?.[letterIndex]
                    : guess?.[letterIndex];

                return (
                  <div
                    key={letterIndex}
                    className={`flex h-14 w-14 items-center justify-center border-2 text-2xl font-bold uppercase transition-colors ${getLetterClass(
                      letter,
                      attemptIndex === gameState?.currentAttempt,
                    )}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Other players' grids */}
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {otherPlayers.map((player) => (
            <div key={player?.id} className="flex flex-col items-center">
              <h3 className="mb-2 text-lg font-semibold">{player?.username}</h3>
              <div className="grid origin-top scale-75 grid-rows-6 gap-1">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, attemptIndex) => {
                  const guess = player?.guesses?.[attemptIndex];
                  return (
                    <div key={attemptIndex} className="grid grid-cols-5 gap-1">
                      {Array.from({ length: WORD_LENGTH }).map(
                        (_, letterIndex) => (
                          <div
                            key={letterIndex}
                            className={`flex h-14 w-14 items-center justify-center border-2 transition-colors ${
                              guess
                                ? getFeedbackClass(guess.feedback[letterIndex])
                                : "border-zinc-400 bg-zinc-700"
                            }`}
                          />
                        ),
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Keyboard */}
        <Keyboard
          onKeyPress={handleKeyPress}
          usedLetters={gameState?.usedLetters || {}}
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
    const status = usedLetters?.[key];
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
