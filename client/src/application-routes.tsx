import { Route, Routes } from "react-router";
import Landing from "./pages/landing";
import Lobby from "./pages/lobby";
import { LoginPage } from "./pages/login";
import NotFound from "./pages/not-found";
import { RegisterPage } from "./pages/register";
import { AuthProvider } from "./components/auth-provider";
import { Navbar } from "./components/navbar";
import GameScreen from "./pages/game";
import { WebSocketProvider } from "./components/web-socket-provider";

export default function ApplicationRoutes() {
  return (
    <AuthProvider>
      <Navbar />
      <WebSocketProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/lobby/:id" element={<Lobby />} />
          <Route path="/game/:id" element={<GameScreen />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </WebSocketProvider>
    </AuthProvider>
  );
}
