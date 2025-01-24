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

interface Player {
  ID: string;
  username: string;
}

interface Game {
  ID: number;
  state: string;
  players: Player[];
  guesses: Guess[];
}

enum UserType {
  CURRENT,
  OTHER,
}

//This component checks if the user is the current player or not and renders the letter accordingly
function Letter({
  letter,
  feedback,
  user,
}: {
  letter: string;
  feedback?: string;
  user: UserType;
}) {
  //Styling based on feedback
  const getFeedbackClass = () => {
    switch (feedback) {
      case "2":
        return "bg-green-500";
      case "1":
        return "bg-yellow-500";
      case "0":
        return "bg-zinc-600";
      default:
        return "bg-slate-700";
    }
  };

  return (
    <div
      className={`flex size-16 items-center justify-center rounded-md border border-gray-500 text-center text-2xl font-black uppercase ${getFeedbackClass()}`}
    >
      {user === UserType.CURRENT ? letter || "" : ""}
    </div>
  );
}

//The main gameboard component to display the guesses styled with the respective feedback
function GameBoard({
  guesses,
  feedback,
  user,
}: {
  guesses: string[];
  feedback: string[];
  user: UserType;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {Array.from({ length: ATTEMPTS }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => (
            <Letter
              user={user}
              key={colIndex}
              letter={guesses[rowIndex]?.[colIndex] || ""}
              feedback={feedback[rowIndex]?.[colIndex]}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

//Keyboard component to handle user input
function Keyboard({
  handleInput,
  usedLetters,
}: {
  handleInput: (char: string) => void;
  usedLetters: string[];
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const char = event.key.toLowerCase();

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
              className={`rounded-md border border-zinc-400 p-3 text-xl font-bold uppercase ${usedLetters.includes(char) ? "bg-neutral-900 text-gray-100" : "bg-gray-600 text-white"} `}
            >
              {char}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function OtherPlayers({
  players,
  allGuesses,
}: {
  players: Player[];
  allGuesses: Guess[];
}) {
  const playerGuesses = players.map((player) => {
    const playerSpecificGuesses = allGuesses.filter(
      (guess) => guess.playerId === player.ID,
    );

    const guesses = Array(ATTEMPTS)
      .fill("")
      .map((_, index) => {
        const matchingGuess = playerSpecificGuesses.find(
          (guess) => guess.attemptNumber === index,
        );
        return matchingGuess ? matchingGuess.guessWord : "";
      });

    const feedback = Array(ATTEMPTS)
      .fill("")
      .map((_, index) => {
        const matchingGuess = playerSpecificGuesses.find(
          (guess) => guess.attemptNumber === index,
        );
        return matchingGuess ? matchingGuess.feedback : "";
      });

    return { player, guesses, feedback };
  });

  console.log("PLAYER GUESSES", playerGuesses);

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {playerGuesses.map(({ player, guesses, feedback }) => (
        <div key={player.ID} className="text-center">
          <h2 className="mb-2 text-xl font-bold">{player.username}</h2>
          <GameBoard
            guesses={guesses}
            feedback={feedback}
            user={UserType.OTHER}
          />

          {guesses.length >= 6 && (
            <p className="mt-5 font-medium">Guesses Exhausted</p>
          )}
        </div>
      ))}
    </div>
  );
}

//Game Screen page which handles auth, fetching game data, and rendering the game board and handling real time updates
export default function GameScreen() {
  const [guesses, setGuesses] = useState(Array(ATTEMPTS).fill(""));
  const [feedback, setFeedback] = useState(Array(ATTEMPTS).fill(""));
  const { id } = useParams<{ id: string }>();
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(0);
  const [lettersUsed, setLettersUsed] = useState<string[]>([]);
  const [players, setAllPlayers] = useState<Player[]>([]);
  const [allGuesses, setAllGuesses] = useState<Guess[]>([]);

  const { user, isLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate("/not-found");
      return;
    }

    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      navigate("/not-found");
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  });

  useWebSocketMessage("new_guess", (data: Guess) => {
    setAllGuesses((prevGuesses) => [...prevGuesses, data]);
  });

  useWebSocketMessage("game_over", (data) => {
    console.log("GAME OVER", data);
    navigate("/lobby/" + id);
  });

  useWebSocketMessage("player_left", (data: Game) => {
    console.log("PLAYER LEFT", data);
    setAllPlayers(data.players.filter((player) => player.ID !== user?.ID));
  });

  useWebSocketMessage("player_joined", (data: Game) => {
    console.log("PLAYER LEFT", data);
    setAllPlayers(data.players.filter((player) => player.ID !== user?.ID));
  });

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
      const newPlayers = data.game.players;
      const playersExceptCurrentUser = newPlayers.filter(
        (player: Player) => player.ID !== user?.ID,
      );

      setAllGuesses(data.game.guesses);

      data.game.guesses.forEach((guess: Guess) => {
        if (guess.playerId === user?.ID) {
          newGuesses[guess.attemptNumber] = guess.guessWord;
          newFeedback[guess.attemptNumber] = guess.feedback;
        }
      });

      newGuesses.forEach((guess) => {
        if (guess !== "") {
          updateLettersUsed(guess);
        }
      });

      setGuesses(newGuesses);
      setFeedback(newFeedback);
      setAllPlayers(playersExceptCurrentUser);
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
    setGuesses((prevGuesses) =>
      prevGuesses.map((guess, index) =>
        index === currentAttemptNumber ? guess.slice(0, -1) : guess,
      ),
    );
  }, [currentAttemptNumber]);

  const handleLetterInput = useCallback(
    (char: string) => {
      setGuesses((prevGuesses) =>
        prevGuesses.map((guess, index) =>
          index === currentAttemptNumber
            ? (guess + char).slice(0, WORD_LENGTH)
            : guess,
        ),
      );
    },
    [currentAttemptNumber],
  );

  function updateLettersUsed(currentGuess: string) {
    setLettersUsed((prevLettersUsed) => {
      const newLettersUsed = [...prevLettersUsed];
      currentGuess.split("").forEach((letter) => {
        if (!newLettersUsed.includes(letter)) {
          newLettersUsed.push(letter);
        }
      });
      return newLettersUsed;
    });
  }

  const handleGuessSubmission = useCallback(async () => {
    if (currentAttemptNumber > 5) return;
    const currentGuess = guesses[currentAttemptNumber];
    if (currentGuess.length != 5) return;

    const isValidWord = await validateGuess(currentGuess);
    if (!isValidWord) {
      alert("Not a valid word");
      return;
    }

    if (!id) return;
    else if (isNaN(parseInt(id))) return;

    const { data } = await api.post("/api/game/" + id + "/guess", {
      guessWord: currentGuess,
      attemptNumber: currentAttemptNumber,
    });

    setFeedback((prev) => {
      const newFeedback = [...prev];
      newFeedback[currentAttemptNumber] = data.guess.feedback;
      return newFeedback;
    });

    updateLettersUsed(currentGuess);
    setCurrentAttemptNumber((prev) => prev + 1);
  }, [currentAttemptNumber, guesses, id]);

  const handleInput = useCallback(
    async (char: string) => {
      if (currentAttemptNumber > 5) return;
      if (char === "Del") {
        handleDelete();
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

  const handleQuit = async () => {
    try {
      const { data } = await api.patch(`/api/game/${id}/leave`);
      console.log("QUIT RESPONSE", data);
      refreshUser();
      navigate("/");
    } catch (error) {
      console.error("QUIT ERROR", error);
    }
  };

  return (
    <div className="page-background flex min-h-screen flex-col items-center justify-center py-32">
      <h1 className="mb-6 text-4xl font-bold">Wordle Race</h1>
      <GameBoard
        guesses={guesses}
        feedback={feedback}
        user={UserType.CURRENT}
      />
      <Keyboard handleInput={handleInput} usedLetters={lettersUsed} />
      <button
        className="text-red mt-6 text-sm font-medium text-red-600 hover:underline"
        onClick={handleQuit}
      >
        Quit Game
      </button>

      <div className="mt-10">
        <h2 className="text-center text-4xl font-extrabold tracking-tight">
          Other Players
        </h2>
        <OtherPlayers players={players} allGuesses={allGuesses} />
      </div>
    </div>
  );
}
