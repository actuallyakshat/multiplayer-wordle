// src/components/WebSocketProvider.tsx
import { useAtom } from "jotai";
import { useEffect } from "react";
import { wsManagerAtom } from "../store/websocket";
import { useAuth } from "../store/auth";

type WebSocketProviderProps = {
  children: React.ReactNode;
};

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const { user } = useAuth();
  const [, initWebSocket] = useAtom(wsManagerAtom);

  useEffect(() => {
    if (user && user.gameId) {
      initWebSocket(user.gameId, user.username);
    }
  }, [initWebSocket, user]);

  return <>{children}</>;
};
