import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="page-background flex h-full min-h-screen flex-col items-center justify-center">
      <h1 className="text-3xl font-extrabold">Page not found!</h1>
      <p className="text-sm">The page you are looking for is not found.</p>
      <Link to="/" className="primary-btn mt-4">
        Go back home
      </Link>
    </div>
  );
}
