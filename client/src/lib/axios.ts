import axios from "axios";

const token = localStorage.getItem("token") || "";

// Create a custom Axios instance
const api = axios.create({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export default api;

export const setAuthToken = (newToken: string) => {
  localStorage.setItem("token", newToken);
  api.defaults.headers.Authorization = `Bearer ${newToken}`;
};

export const removeAuthToken = () => {
  localStorage.removeItem("token");
  delete api.defaults.headers.Authorization;
};
