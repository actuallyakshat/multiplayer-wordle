import { PlaySquare, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import Dialog from "../components/ui/dialog";
import { useAuth } from "../store/auth";

function Landing() {
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  const { user } = useAuth();

  const navigate = useNavigate();

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

          {user?.gameId ? (
            <button
              className="primary-btn mx-auto mb-8"
              onClick={() => navigate(`/game/${user.gameId}`)}
            >
              Return to game
            </button>
          ) : (
            <div className="mb-16 flex flex-col justify-center gap-6 sm:flex-row">
              <Dialog
                isLoading={createLoading}
                dialogTrigger={
                  <button className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-emerald-600 hover:shadow-emerald-500/25 disabled:opacity-80 disabled:hover:bg-emerald-500 disabled:hover:shadow-none">
                    <PlaySquare className="h-5 w-5" />
                    Create Game
                  </button>
                }
                dialogContent={
                  <CreateGameForm
                    loading={createLoading}
                    setLoading={setCreateLoading}
                  />
                }
              />

              <Dialog
                isLoading={joinLoading}
                dialogTrigger={
                  <button className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-slate-600">
                    <Users className="h-5 w-5" />
                    Join Game
                  </button>
                }
                dialogContent={
                  <JoinGameForm
                    loading={joinLoading}
                    setLoading={setJoinLoading}
                  />
                }
              />
            </div>
          )}
        </div>

        {/* Features Section */}
        <Features />
      </div>
    </div>
  );
}

export default Landing;

function CreateGameForm({
  setLoading,
  loading,
}: {
  setLoading: (loading: boolean) => void;
  loading: boolean;
}) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setLoading(true);
        new Promise((resolve) => {
          setTimeout(resolve, 2000);
        }).then(() => {
          console.log("submitted");
          setLoading(false);
        });
      }}
    >
      <h2 className="text-left text-2xl font-extrabold">Create new game</h2>
      <div className="flex flex-col gap-1.5">
        <label className="text-left text-sm text-slate-400">Player Name</label>
        <input
          type="text"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white placeholder:text-sm placeholder:text-slate-400"
          placeholder="Enter your name"
          disabled={loading}
        />
      </div>
      <button className="primary-btn font-medium" disabled={loading}>
        {loading ? "Creating..." : "Create Game"}
      </button>
    </form>
  );
}

function JoinGameForm({
  setLoading,
  loading,
}: {
  setLoading: (loading: boolean) => void;
  loading: boolean;
}) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setLoading(true);
        new Promise((resolve) => {
          setTimeout(resolve, 2000);
        }).then(() => {
          console.log("submitted");
          setLoading(false);
        });
      }}
    >
      <h2 className="text-left text-2xl font-extrabold">Join game</h2>
      <div className="flex flex-col gap-1.5">
        <label className="text-left text-sm text-slate-400">Game ID</label>
        <input
          type="text"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white placeholder:text-sm placeholder:text-slate-400"
          placeholder="Enter game ID"
          disabled={loading}
        />
      </div>
      <button className="primary-btn font-medium" disabled={loading}>
        {loading ? "Joining..." : "Join Game"}
      </button>
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
