import { PlaySquare, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Dialog from "../components/ui/dialog";
import api from "../lib/axios";
import { useAuth } from "../store/auth";

function Landing() {
  const [loading, setLoading] = useState(false);
  const { user, isLoading, refreshUser } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !isLoading) {
      setIsLoggedIn(false);
    } else if (user && !isLoading) {
      setIsLoggedIn(true);
    }
  }, [isLoading, user]);

  async function createGameHandler() {
    try {
      setLoading(true);
      const response = await api.post("/api/game");
      console.log("Game created", response.data);
      await refreshUser();

      const gameId = response.data.gameID;
      navigate(`/lobby/${gameId}`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-background min-h-screen">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-32">
        <div className="text-center">
          <h1 className="mb-6 text-5xl font-bold text-white md:text-7xl">
            Multiplayer Wordle
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-xl text-slate-300">
            Challenge your friends in real-time Wordle races. Create a game room
            or join an existing one to start the word-guessing battle!
          </p>

          {isLoggedIn ? (
            user?.gameId ? (
              <button
                className="primary-btn mx-auto mb-8"
                onClick={() => navigate(`/game/${user.gameId}`)}
              >
                Return to game
              </button>
            ) : (
              <div className="mb-16 flex flex-col justify-center gap-6 sm:flex-row">
                <button
                  disabled={loading}
                  onClick={createGameHandler}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-emerald-600 hover:shadow-emerald-500/25 disabled:opacity-80 disabled:hover:bg-emerald-500 disabled:hover:shadow-none"
                >
                  <PlaySquare className="h-5 w-5" />
                  {loading ? "Creating Game..." : "Create Game"}
                </button>

                <Dialog
                  isLoading={false}
                  dialogTrigger={
                    <button className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-slate-600">
                      <Users className="h-5 w-5" />
                      Join Game
                    </button>
                  }
                  dialogContent={<JoinGameForm />}
                />
              </div>
            )
          ) : (
            <button
              className="primary-btn mx-auto mb-8"
              onClick={() => {
                navigate("/register");
              }}
            >
              Get started
            </button>
          )}
        </div>

        {/* Features Section */}
        <Features />
      </div>
    </div>
  );
}

export default Landing;

function JoinGameForm() {
  const navigate = useNavigate();
  const [gameId, setGameId] = useState(0);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        if (gameId <= 0) return;
        e.preventDefault();

        navigate("/lobby/" + gameId);
      }}
    >
      <h2 className="text-left text-2xl font-extrabold">Join game</h2>
      <div className="flex flex-col gap-1.5">
        <label className="text-left text-sm text-slate-400">Game ID</label>
        <input
          type="number"
          onChange={(e) => setGameId(parseInt(e.target.value))}
          value={gameId}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white placeholder:text-sm placeholder:text-slate-400"
          placeholder="Enter game ID"
        />
      </div>
      <button className="primary-btn font-medium">Join Game</button>
    </form>
  );
}

function Features() {
  return (
    <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
          <Users className="h-6 w-6 text-emerald-500" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">
          Real-time Multiplayer
        </h3>
        <p className="text-slate-400">
          Compete with friends in real-time and see who can solve the puzzle
          first.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
          <Trophy className="h-6 w-6 text-emerald-500" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">
          Competitive Play
        </h3>
        <p className="text-slate-400">
          Track scores, compete for the fastest solve times, and climb the
          leaderboard.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
          <PlaySquare className="h-6 w-6 text-emerald-500" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">Custom Games</h3>
        <p className="text-slate-400">
          Create private game rooms and invite friends for exclusive word
          battles.
        </p>
      </div>
    </div>
  );
}
