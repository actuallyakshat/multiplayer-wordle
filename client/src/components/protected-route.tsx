import { useEffect } from "react";
import { useAuth } from "../store/auth";
import { useNavigate } from "react-router";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  return children;
}
