import {
  Dispatch,
  memo,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import api from "../lib/axios";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../store/auth";
import { validateGuess } from "../lib/validateGuess";
import { useWebSocketMessage } from "../store/websocket";
import { Loader2 } from "lucide-react";

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

interface GaveOverProps {
  Game: Game;
  Winner: Player;
  Word: string;
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
        return "bg-stone-600";
      default:
        return "bg-zinc-800/40 background-blur-sm";
    }
  };

  return (
    <div
      className={`flex size-16 items-center justify-center rounded-md border border-zinc-700/70 text-center text-2xl font-black uppercase ${getFeedbackClass()}`}
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
        <div
          key={rowIndex}
          className="max-w-screen flex flex-wrap justify-center gap-2"
        >
          {row.map((char) => (
            <button
              key={char}
              onClick={() => handleInput(char)}
              className={`rounded-md border border-zinc-700 px-2 py-2 text-base font-bold uppercase sm:px-3 sm:py-3 sm:text-lg ${
                usedLetters.includes(char)
                  ? "bg-stone-900 text-gray-100"
                  : "bg-zinc-700 text-white"
              }`}
            >
              {char}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

//Component to display game grid of the other players in the game
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

          {feedback.filter((f) => f !== "").length >= 6 && (
            <p className="mt-5 font-medium">
              {player.username} has exhausted their guesses!
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
interface GameOverDialogProps {
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  id: string;
}

//Why memo? Memo allows us to prevent unnecessary re-renders of the component. It only re-renders when the props change. Memo is a HOC provided by React.
interface GameOverDialogProps {
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  id: string;
}

const GameOverDialog = memo(
  ({ message, setMessage, id }: GameOverDialogProps) => {
    const navigate = useNavigate();

    useEffect(() => {
      if (!message) return;

      const timeout = setTimeout(() => {
        setMessage("");
        navigate("/lobby/" + id);
      }, 6000);

      return () => clearTimeout(timeout);
    }, [message, setMessage, id, navigate]);

    if (!message) return null;

    return (
      <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
        <div className="w-full max-w-md transform rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 p-8 shadow-2xl transition-all duration-300 ease-in-out">
          <h2 className="mb-6 text-center text-4xl font-extrabold tracking-tight text-white">
            Game Over
          </h2>
          <p className="mb-8 text-center text-xl font-medium text-slate-300">
            {message}
          </p>
          <div className="relative">
            {/* <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div> */}
            <div className="relative flex justify-center">
              <span className="rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 px-4 py-2 font-medium text-slate-400">
                Redirecting you to the lobby
              </span>
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <div className="h-2 w-64 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full w-full origin-left animate-[shrink_6s_ease-in-out] bg-emerald-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

//Game Screen page which handles auth, fetching game data, and rendering the game board and handling real time updates
export default function GameScreen() {
  const [guesses, setGuesses] = useState(Array(ATTEMPTS).fill(""));
  const [feedback, setFeedback] = useState(Array(ATTEMPTS).fill(""));
  const { id } = useParams<{ id: string }>();
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(0);
  const [lettersUsed, setLettersUsed] = useState<string[]>([]);
  const [players, setAllPlayers] = useState<Player[]>([]);
  const [allGuesses, setAllGuesses] = useState<Guess[]>([]);
  const [gameOverDialogMessage, setGameOverDialogMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [quitLoading, setQuitLoading] = useState(false);

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
  }, [user, isLoading, navigate]);

  useWebSocketMessage("new_guess", (data: Guess) => {
    setAllGuesses((prevGuesses) => [...prevGuesses, data]);
  });

  useWebSocketMessage("game_over", (data: GaveOverProps) => {
    let message = "";
    //Case 1: Game over due to player quitting
    if (!data.Winner && data.Game.players.length === 1) {
      message =
        "Oops! Looks like you are the only person left in this game. Anyway, the word was " +
        data.Word;
    }
    //Case 2: Game over due to player winning
    else if (data.Winner && data.Game.players.length > 1) {
      message = `${data.Winner.username} won the game! The word was ${data.Word}`;
    }
    //Case 3: Game over due to draw
    else if (!data.Winner && data.Game.players.length > 1) {
      message = "The game ended in a draw. The word was " + data.Word;
    }

    //If the user is in the game, navigate to the lobby. Otherwise (User leaving the game caused game over), navigate to the home page.
    const isUserInGame = data.Game.players.some(
      (player) => player.ID === user?.ID,
    );

    if (isUserInGame) {
      setGameOverDialogMessage(message);
      //Show game over screen. Game over screen would handle the navigation to the lobby page.
    } else {
      //If the user is not in the game, navigate to the home page.
      navigate("/");
    }
  });

  useWebSocketMessage("player_left", (data: Game) => {
    setAllPlayers(data.players.filter((player) => player.ID !== user?.ID));
  });

  useWebSocketMessage("player_joined", (data: Game) => {
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
      console.error(error);
    } finally {
      setLoading(false);
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

    const isValidWord = validateGuess(currentGuess);
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
    setQuitLoading(true);
    try {
      await api.patch(`/api/game/${id}/leave`);
      refreshUser();
      navigate("/");
    } catch (error) {
      console.error("QUIT ERROR", error);
    } finally {
      setQuitLoading(false);
    }
  };

  if (loading)
    return (
      <div className="page-background flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );

  return (
    <div className="page-background flex min-h-screen flex-col items-center justify-center py-32">
      <div className="mb-6 flex flex-col items-center justify-center gap-1">
        <h1 className="text-4xl font-extrabold tracking-tight">Wordle Race</h1>
        <p className="text-sm font-medium text-gray-200">
          Guess the word before your friends do!
        </p>
      </div>
      <GameOverDialog
        message={gameOverDialogMessage}
        setMessage={setGameOverDialogMessage}
        id={id!}
      />
      <GameBoard
        guesses={guesses}
        feedback={feedback}
        user={UserType.CURRENT}
      />
      <Keyboard handleInput={handleInput} usedLetters={lettersUsed} />
      <button
        className="text-red my-8 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-80"
        onClick={handleQuit}
        disabled={quitLoading}
      >
        {quitLoading ? "Quitting..." : "Quit Game"}
      </button>

      <div>
        <div className="mb-6 flex flex-col items-center justify-center gap-1">
          <h2 className="text-center text-4xl font-extrabold tracking-tight">
            Other Players
          </h2>
          <p className="text-sm font-medium text-gray-200">
            See how your friends are doing!
          </p>
        </div>
        <OtherPlayers players={players} allGuesses={allGuesses} />
      </div>
    </div>
  );
}
