import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { useNavigate, Link } from "react-router";
import { FormInput } from "../components/form-input";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!username) newErrors.username = "Username is required";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(username, password);
      setErrors({});
      navigate("/");
    } catch (err) {
      console.log(err);
      setErrors({ form: "Invalid username or password" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
          Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.form && (
            <div className="text-center text-red-500">{errors.form}</div>
          )}
          <FormInput
            label="Username"
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            error={errors.username}
          />
          <FormInput
            label="Password"
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            error={errors.password}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-400">
          Don't have an account?{" "}
          <Link to="/register" className="text-emerald-500 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
