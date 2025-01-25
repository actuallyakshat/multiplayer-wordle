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

  const numericId = Number(id);
  if (isNaN(numericId)) {
    navigate("/not-found");
  }

  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  const isCreator = user?.isAdmin;
  const [loading, setLoading] = useState({
    startGame: false,
    deleteRoom: false,
    leaveRoom: false,
  });

  //Web socket events
  useWebSocketMessage("player_joined", (payload: playerJoinedPayload) => {
    setPlayers(payload.players);
  });

  useWebSocketMessage("player_left", async (payload: playerJoinedPayload) => {
    //check if the current user is made the new admin
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

        //Check if user in game
        if (
          !data.game.players.some((player: Player) => player.ID === user.ID)
        ) {
          const response = await api.patch(`/api/game/${id}/join`);
          if (response.status === 200) {
            await refreshUser();
            data = await getGameDetailsHandler();
          } else {
            console.error("Something went wrong");
            return;
          }
        }

        if (state == "in-progress") {
          navigate("/game/" + id);
        }
        setPlayers(data.game.players);
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
    <div className="page-background min-h-screen">
      <div className="container mx-auto border-red-600 px-4 py-32 xl:max-w-screen-xl">
        <h3 className="text-center">Multiplayer Wordle</h3>
        <h1 className="text-center text-4xl font-extrabold">Lobby</h1>
        <div className="mt-7 flex w-full flex-col items-center justify-center gap-2">
          {isCreator && (
            <button
              className="primary-btn"
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
          <button onClick={leaveRoom} disabled={loading.leaveRoom}>
            {loading.leaveRoom ? "Leaving Room..." : "Leave Room"}
          </button>
        </div>
        <div className="mt-5">
          {players?.map((player: Player) => (
            <div key={player.ID}>
              {player.username}
              <span className="ml-3 text-sm font-medium text-gray-400">
                {player.isAdmin ? "(leader)" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
