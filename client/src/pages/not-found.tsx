import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="page-background flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-8 text-9xl font-extrabold text-slate-600">404</div>
      <h1 className="mb-4 text-4xl font-bold text-white">
        Oops! Page not found
      </h1>
      <p className="mb-8 max-w-md text-lg text-slate-300">
        The page you are looking for might have been removed, had its name
        changed, or is temporarily unavailable.
      </p>
      <Link
        to="/"
        className="group relative inline-flex items-center overflow-hidden rounded-full bg-emerald-500 px-8 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        <span className="absolute left-0 -translate-x-full transition-transform group-hover:translate-x-4">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            ></path>
          </svg>
        </span>
        <span className="transition-all group-hover:ml-4 group-hover:mr-[-20px]">
          Go back home
        </span>
      </Link>
    </div>
  );
}
