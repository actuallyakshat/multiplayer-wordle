import { useEffect } from "react";
import { useAuth } from "../store/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return children;
}
