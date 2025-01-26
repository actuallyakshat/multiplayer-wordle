import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import api from "../lib/axios";
import { useAuth } from "../store/auth";
import { useWebSocketMessage } from "../store/websocket";
import { AxiosError } from "axios";

interface Player {
  ID: string;
  username: string;
  isAdmin: boolean;
}

interface playerJoinedPayload {
  players: Player[];
}

export default function Lobby() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[] | []>([]);
  const { user, refreshUser, isLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  const numericId = Number(id);
  if (isNaN(numericId)) {
    navigate("/not-found");
  }

  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setIsCreator(user.isAdmin);
  }, [user]);

  const [loading, setLoading] = useState({
    startGame: false,
    deleteRoom: false,
    leaveRoom: false,
  });

  // Web socket events
  useWebSocketMessage("player_joined", (payload: playerJoinedPayload) => {
    setPlayers(payload.players);
    setIsLoadingPlayers(false);
  });

  useWebSocketMessage("player_left", async (payload: playerJoinedPayload) => {
    for (const player of payload.players) {
      if (player.isAdmin) {
        await refreshUser();
        break;
      }
    }
    setPlayers(payload.players);
  });

  useWebSocketMessage("game_started", () => {
    navigate("/game/" + id);
  });

  const getGameDetailsHandler = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.get(`/api/game/${numericId}`);
      return response.data;
    } catch (e: AxiosError | unknown) {
      console.error("Error fetching game details:", e);
      if (e instanceof AxiosError && e.response?.status === 404) {
        navigate("/not-found");
      }
    }
  }, [numericId, user, navigate]);

  useEffect(() => {
    async function getGameDetails() {
      try {
        if (!user) return;
        let data = await getGameDetailsHandler();
        const state = data.game.state;

        // Check if the user is already in the game
        if (
          !data.game.players.some((player: Player) => player.ID === user.ID)
        ) {
          try {
            const response = await api.patch(`/api/game/${id}/join`);
            if (response.status === 200) {
              await refreshUser();
              data = await getGameDetailsHandler();
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (error: any) {
            if (
              error.response?.status === 400 &&
              error.response.data?.error === "Game is full"
            ) {
              alert("The game is full. You cannot join.");
            } else {
              console.error(
                "Something went wrong while joining the game:",
                error,
              );
            }
            return;
          }
        }

        // If the game is in progress, navigate to the game page
        if (state === "in-progress") {
          navigate("/game/" + id);
        }
        setPlayers(data.game.players);
        setIsLoadingPlayers(false);
      } catch (error) {
        console.error("Error fetching game details:", error);
      }
    }

    getGameDetails();
  }, [id, navigate, user, getGameDetailsHandler, refreshUser]);

  async function startGame() {
    try {
      setLoading({ ...loading, startGame: true });
      await api.patch(`/api/game/${id}/start`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading({ ...loading, startGame: false });
    }
  }

  async function leaveRoom() {
    try {
      setLoading({ ...loading, leaveRoom: true });
      const response = await api.patch(`/api/game/${id}/leave`);
      if (response.status === 200) {
        refreshUser();
        navigate("/");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading({ ...loading, leaveRoom: false });
    }
  }

  return (
    <div className="page-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h3 className="text-center text-lg font-semibold text-gray-600">
          Wordle Race
        </h3>
        <h1 className="mb-6 mt-2 text-center text-4xl font-extrabold text-gray-800">
          Lobby
        </h1>
        <div className="mb-8 flex flex-col items-center justify-center gap-4">
          {isCreator && (
            <button
              className={`w-full rounded-md px-4 py-3 font-semibold text-white transition-all ${
                players?.length < 2 || loading.startGame
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              onClick={startGame}
              disabled={players?.length < 2 || loading.startGame}
            >
              {players?.length < 2
                ? "Waiting for players"
                : loading.startGame
                  ? "Starting Game..."
                  : "Start Game"}
            </button>
          )}
          <button
            className={`w-full rounded-md px-4 py-3 font-semibold transition-all ${
              loading.leaveRoom
                ? "cursor-not-allowed bg-gray-400 text-white"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
            onClick={leaveRoom}
            disabled={loading.leaveRoom}
          >
            {loading.leaveRoom ? "Leaving Room..." : "Leave Room"}
          </button>
        </div>
        <div className="space-y-4">
          <h2 className="mb-4 text-xl font-bold text-gray-700">Players</h2>
          {isLoadingPlayers
            ? Array.from({ length: 3 }).map((_, index) => (
                <PlayerSkeleton key={index} />
              ))
            : players?.map((player: Player) => (
                <div
                  key={player.ID}
                  className="flex items-center space-x-4 rounded-md bg-gray-100 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
                    {player.username[0].toUpperCase()}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-gray-800">
                      {player.username}
                    </p>
                    {player.isAdmin && (
                      <span className="text-sm font-medium text-indigo-600">
                        (leader)
                      </span>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

function PlayerSkeleton() {
  return (
    <div className="mb-4 flex animate-pulse items-center space-x-4">
      <div className="h-8 w-8 rounded-full bg-gray-300"></div>
      <div className="h-4 w-1/4 rounded bg-gray-300"></div>
    </div>
  );
}
