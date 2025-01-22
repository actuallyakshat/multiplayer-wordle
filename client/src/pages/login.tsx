import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { useNavigate } from "react-router";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold">Login</h1>
        {error && <div className="text-red-500">{error}</div>}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full rounded border p-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded border p-2"
        />
        <button
          type="submit"
          className="w-full rounded bg-blue-500 p-2 text-white"
        >
          Login
        </button>
      </form>
    </div>
  );
}
