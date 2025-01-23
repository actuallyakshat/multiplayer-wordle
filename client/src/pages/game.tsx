import { useCallback, useEffect, useState } from "react";
import api from "../lib/axios";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../store/auth";
import { validateGuess } from "../lib/validateGuess";
import { useWebSocketMessage } from "../store/websocket";

const ATTEMPTS = 6;
const WORD_LENGTH = 5;
const KEYBOARD = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["Del", "z", "x", "c", "v", "b", "n", "m", "Enter"],
];

interface Guess {
  feedback: string;
  attemptNumber: number;
  playerId: string;
  guessWord: string;
}

export default function GameScreen() {
  const [guesses, setGuesses] = useState(Array(ATTEMPTS).fill("")); // Array of guesses, one for each attempt
  const [feedback, setFeedback] = useState(Array(ATTEMPTS).fill(""));
  const { id } = useParams<{ id: string }>();
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(0);
  const [lettersUsed, setLettersUsed] = useState<string[]>([]);

  const { user, isLoading, refreshUser } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  });

  useEffect(() => {
    console.log("GUESSES", guesses);
    console.log("FEEDBACK", feedback);
  }, [guesses, feedback]);

  useWebSocketMessage("new_guess", (data: Guess) => {
    console.log("NEW GUESS FROM SOME PLAYER", data);
  });

  useWebSocketMessage("game_over", (data) => {
    console.log("GAME OVER", data);
    navigate("/lobby/" + id);
  });

  useWebSocketMessage("player_left", (data) => {
    console.log("PLAYER LEFT", data);
  });

  useEffect(() => {
    console.log("currentAttemptNumber", currentAttemptNumber);
  }, [currentAttemptNumber]);

  const getGameDetails = useCallback(async () => {
    try {
      if (!id) return;
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        return;
      }

      const { data } = await api.get("/api/game/" + id);

      if (data.game.state === "lobby") {
        navigate("/lobby/" + id);
        return;
      }

      const userGuesses = data.game.guesses.filter(
        (guess: Guess) => guess.playerId === user?.ID,
      );

      setCurrentAttemptNumber(userGuesses.length);

      const newGuesses = Array(ATTEMPTS).fill("");
      const newFeedback = Array(ATTEMPTS).fill("");

      data.game.guesses.forEach((guess: Guess) => {
        if (guess.playerId === user?.ID) {
          newGuesses[guess.attemptNumber] = guess.guessWord;
          newFeedback[guess.attemptNumber] = guess.feedback;
        }
      });

      setGuesses(newGuesses);
      setFeedback(newFeedback);

      console.log(data);
    } catch (error) {
      console.log(error);
    }
  }, [id, user?.ID, navigate]);

  useEffect(() => {
    if (user) {
      getGameDetails();
    }
  }, [getGameDetails, user]);

  const handleDelete = useCallback(() => {
    {
      setGuesses((prevGuesses) =>
        prevGuesses.map((guess, index) =>
          index === currentAttemptNumber ? guess.slice(0, -1) : guess,
        ),
      );
    }
  }, [currentAttemptNumber]);

  const handleLetterInput = useCallback(
    (char: string) => {
      {
        setGuesses((prevGuesses) =>
          prevGuesses.map((guess, index) =>
            index === currentAttemptNumber
              ? (guess + char).slice(0, WORD_LENGTH)
              : guess,
          ),
        );
      }
    },
    [currentAttemptNumber],
  );

  const handleGuessSubmission = useCallback(async () => {
    {
      if (currentAttemptNumber > 5) return;
      const currentGuess = guesses[currentAttemptNumber];
      if (currentGuess.length != 5) return;
      const isValidWord = await validateGuess(currentGuess);
      if (!isValidWord) {
        alert("Not a valid word");
        return;
      }

      //Send Guess Post Request
      if (!id) return;
      else if (isNaN(parseInt(id))) return;
      const { data } = await api.post("/api/game/" + id + "/guess", {
        guessWord: currentGuess,
        attemptNumber: currentAttemptNumber,
      });
      console.log("GUESS RESPONSE -> ", data);
      //Increment

      setFeedback((prev) => {
        const newFeedback = [...prev];
        newFeedback[currentAttemptNumber] = data.guess.feedback;
        console.log("NEW FEEDBACK -> ", newFeedback);
        return newFeedback;
      });

      //update letters used
      setLettersUsed((prevLettersUsed) => {
        const newLettersUsed = [...prevLettersUsed];
        currentGuess.split("").forEach((letter: (typeof currentGuess)[0]) => {
          if (!newLettersUsed.includes(letter)) {
            newLettersUsed.push(letter);
          }
        });
        return newLettersUsed;
      });

      setCurrentAttemptNumber((prev) => prev + 1);
      console.log("ALL GOOD");
    }
  }, [currentAttemptNumber, guesses, id]);

  const handleInput = useCallback(
    async (char: string) => {
      if (currentAttemptNumber > 5) return;
      if (char === "Del") {
        handleDelete();
        return;
      } else if (char === "Enter") {
        handleGuessSubmission();
      } else {
        handleLetterInput(char);
      }
    },
    [
      handleDelete,
      handleLetterInput,
      handleGuessSubmission,
      currentAttemptNumber,
    ],
  );

  if (!id) {
    navigate("/not-found");
    return;
  }

  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    navigate("/not-found");
  }

  const handleQuit = async () => {
    try {
      const { data } = await api.patch(`/api/game/${id}/leave`);
      console.log("QUIT", data);

      refreshUser();

      navigate("/");
    } catch (error) {
      console.error("QUIT ERROR", error);
    }
  };

  return (
    <div className="page-background flex min-h-screen flex-col items-center justify-center py-20">
      <h1 className="mb-6 text-4xl font-bold">Wordle Race</h1>
      {/* Game board */}
      <div className="flex flex-col items-center justify-center gap-2">
        {Array.from({ length: ATTEMPTS }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={`flex size-16 items-center justify-center rounded-md border border-gray-500 text-center text-2xl font-black uppercase ${feedback[rowIndex][colIndex] == "2" ? "bg-green-500" : feedback[rowIndex][colIndex] == "1" ? "bg-yellow-500" : feedback[rowIndex][colIndex] == "0" ? "bg-zinc-600" : "bg-slate-700"}`}
              >
                {guesses[rowIndex][colIndex] || ""}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Input */}

      <Keyboard handleInput={handleInput} usedLetters={lettersUsed} />

      <button
        className="text-red mt-6 text-sm font-medium text-red-600 hover:underline"
        onClick={handleQuit}
      >
        Quit
      </button>
    </div>
  );
}

function Keyboard({
  handleInput,
  usedLetters,
}: {
  handleInput: (char: string) => void;
  usedLetters: string[];
}) {
  //Event listner to handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const char = event.key.toLowerCase();

      //ignore ctrl | alt + key combinations
      if ((event.ctrlKey || event.altKey) && char.length === 1) {
        return;
      }

      if (char.length === 1 && /^[a-z]$/.test(char)) {
        handleInput(char);
      }

      if (event.key == "Backspace") {
        handleInput("Del");
      }

      if (event.key == "Enter") {
        handleInput("Enter");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleInput]);

  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-2">
      {KEYBOARD.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {row.map((char) => (
            <button
              key={char}
              onClick={() => handleInput(char)}
              className={`rounded-md border border-zinc-400 p-3 text-xl font-extrabold uppercase ${usedLetters.includes(char) ? "bg-neutral-900 text-gray-100" : "bg-gray-600 text-white"} `}
            >
              {char}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
