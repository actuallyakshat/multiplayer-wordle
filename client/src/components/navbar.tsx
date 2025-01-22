import { Link } from "react-router";
import { useAuth } from "../store/auth";
export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 z-[1] w-full border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold text-white">
          Wordle Race
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-slate-300">Hi, {user.username}!</span>
              <button
                onClick={logout}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
