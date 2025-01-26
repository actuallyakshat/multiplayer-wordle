import { atom, useAtom } from "jotai";
import { useEffect, useCallback, useRef } from "react";

// Types
type WebSocketMessage = {
  type:
    | "player_joined"
    | "player_left"
    | "game_started"
    | "new_guess"
    | "game_over";
  payload: unknown;
};

// Constants
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

// Atoms
export const wsConnectionAtom = atom<WebSocket | null>(null);
export const wsConnectedAtom = atom<boolean>(false);

// Derived atom for creating/managing the connection
export const wsManagerAtom = atom(
  (get) => get(wsConnectionAtom),
  (get, set, gameId: string, username: string) => {
    // Close existing connection if any
    const existingWs = get(wsConnectionAtom);
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      existingWs.close(1000, "New connection requested");
      console.log("Existing WebSocket connection closed");
    }

    let reconnectAttempts = 0;
    let reconnectTimeout: number;

    const connectWebSocket = () => {
      // Create new WebSocket connection with proper URL encoding
      const ws = new WebSocket(
        //For loclahost
        // `ws://localhost:8080/ws/${encodeURIComponent(gameId)}?username=${encodeURIComponent(username)}`,
        //For Production
        `wss://multiplayer-wordle-production.up.railway.app/ws/${encodeURIComponent(gameId)}?username=${encodeURIComponent(username)}`,
      );

      // Set a connection timeout
      const connectionTimeout = window.setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          console.log("Connection timeout - closing socket");
        }
      }, 5000);

      ws.onopen = () => {
        window.clearTimeout(connectionTimeout);
        set(wsConnectedAtom, true);
        reconnectAttempts = 0;
        console.log("WebSocket connected");
      };

      ws.onclose = (event) => {
        window.clearTimeout(connectionTimeout);
        set(wsConnectedAtom, false);
        console.log(
          `WebSocket disconnected: code=${event.code}, reason=${event.reason}`,
        );

        // Attempt reconnection if not deliberately closed
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`Reconnecting... Attempt ${reconnectAttempts}`);
          reconnectTimeout = window.setTimeout(
            connectWebSocket,
            RECONNECT_DELAY,
          );
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      // Store the WebSocket instance
      set(wsConnectionAtom, ws);
      return ws;
    };

    const ws = connectWebSocket();

    // Cleanup function
    return () => {
      window.clearTimeout(reconnectTimeout);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounted");
      }
    };
  },
);

// Custom hook for WebSocket messages with improved error handling
export const useWebSocketMessage = <T>(
  messageType: WebSocketMessage["type"],
  handler: (payload: T) => void,
) => {
  const [ws] = useAtom(wsConnectionAtom);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const messageHandler = useCallback(
    (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        if (data.type === messageType) {
          handlerRef.current(data.payload as T);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    },
    [messageType],
  );

  useEffect(() => {
    if (!ws) return;

    ws.addEventListener("message", messageHandler);
    return () => ws.removeEventListener("message", messageHandler);
  }, [ws, messageHandler]);
};
