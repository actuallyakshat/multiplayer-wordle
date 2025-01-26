import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import api, { removeAuthToken, setAuthToken } from "../lib/axios";
import { AxiosError } from "axios";

interface User {
  ID: string;
  username: string;
  gameId: string;
  isAdmin: boolean;
}

interface loginResponse {
  jwt?: string;
  message?: string;
  error?: string;
}

interface ErrorResponse {
  error: string;
}

export const userAtom = atom<User | null>(null);
export const isLoadingAtom = atom(true);

export const useAuth = () => {
  const [user, setUser] = useAtom(userAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const navigate = useNavigate();

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post("/api/login", {
        username,
        password,
      });

      const data: loginResponse = response.data;

      if (!data.jwt) {
        throw new Error("No JWT token found in response");
      }

      setAuthToken(data.jwt);
      await refreshUser();
      return data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const response = await api.post("/api/register", { username, password });
      const data = response.data;

      setAuthToken(data.jwt);
      await refreshUser();
    } catch (error) {
      const e = error as AxiosError<ErrorResponse>;
      if (e.response?.data.error) {
        throw new Error(e.response.data.error);
      }
      console.error(error);
      throw error;
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    navigate("/login");
  };

  interface refreshUserResponse {
    user?: User;
    error?: string;
    message?: string;
  }

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        return;
      }

      const response = await api.get("/api/me");
      const data: refreshUserResponse = response.data;

      if (!data.user) throw new Error("No user received in response");

      setUser(data.user);
    } catch (error) {
      console.error(error);
      removeAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setIsLoading]);

  return { user, isLoading, login, register, logout, refreshUser };
};
