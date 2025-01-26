import { PlaySquare, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "../lib/axios";
import { useAuth } from "../store/auth";
import Dialog from "../components/ui/dialog";

interface Game {
  ID: number;
}

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
      const { data } = await api.post<{ game: Game }>("/api/game");
      await refreshUser();

      const gameId = data.game.ID;
      navigate(`/lobby/${gameId}`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-background flex min-h-screen items-center justify-center">
      <div className="container mx-auto px-4 py-40">
        <div className="text-center">
          <h1 className="mb-4 text-5xl font-bold text-white md:text-7xl">
            Wordle Race
          </h1>
          <p className="mx-auto mb-5 max-w-2xl text-lg text-slate-300">
            A multiplayer variant of the popular game called Wordle by The New
            York Times. Challenge your friends in real-time Wordle races. Create
            a game room or join an existing one to start the word-guessing
            battle!
          </p>

          {isLoggedIn ? (
            user?.gameId ? (
              <button
                className="mx-auto mb-8 rounded-lg bg-emerald-600 px-6 py-2.5 text-lg text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => navigate(`/game/${user.gameId}`)}
              >
                Return to game
              </button>
            ) : (
              <div className="mb-16 flex flex-col justify-center gap-6 sm:flex-row">
                <button
                  disabled={loading}
                  onClick={createGameHandler}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-lg font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-emerald-400"
                >
                  <PlaySquare className="h-5 w-5" />
                  {loading ? "Creating Game..." : "Create Game"}
                </button>

                <Dialog
                  isLoading={false}
                  dialogTrigger={
                    <button className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-6 py-3 text-lg font-semibold text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
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
              className="mx-auto mb-8 rounded-lg bg-emerald-600 px-6 py-3 text-lg font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => navigate("/register")}
            >
              Get started
            </button>
          )}
        </div>

        <Features />
      </div>
    </div>
  );
}

export default Landing;

function JoinGameForm() {
  const navigate = useNavigate();
  const [gameId, setGameId] = useState<number | "">("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (typeof gameId === "number" && gameId > 0) {
      navigate("/lobby/" + gameId);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h2 className="text-left text-2xl font-extrabold text-white">
        Join game
      </h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="gameId" className="text-left text-sm text-slate-400">
          Game ID
        </label>
        <input
          id="gameId"
          type="number"
          onChange={(e) =>
            setGameId(e.target.value === "" ? "" : Number(e.target.value))
          }
          value={gameId}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white placeholder:text-sm placeholder:text-slate-400"
          placeholder="Enter game ID"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Join Game
      </button>
    </form>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Features() {
  return (
    <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
      <FeatureCard
        icon={<Users className="h-6 w-6 text-emerald-500" />}
        title="Real-time Multiplayer"
        description="Compete with friends in real-time and see who can solve the puzzle first."
      />
      <FeatureCard
        icon={<Trophy className="h-6 w-6 text-emerald-500" />}
        title="Competitive Play"
        description="Track scores, compete for the fastest solve times, and climb the leaderboard."
      />
      <FeatureCard
        icon={<PlaySquare className="h-6 w-6 text-emerald-500" />}
        title="Custom Games"
        description="Create private game rooms and invite friends for exclusive word battles."
      />
    </div>
  );
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}
