import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      axios
        .get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        })
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("access_token");
          setUser(false);
        })
        .finally(() => setLoading(false));
    } else {
      axios
        .get(`${API}/auth/me`, { withCredentials: true })
        .then((res) => setUser(res.data))
        .catch(() => setUser(false))
        .finally(() => setLoading(false));
    }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(
      `${API}/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    if (res.data.access_token) {
      localStorage.setItem("access_token", res.data.access_token);
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(
      `${API}/auth/register`,
      { name, email, password },
      { withCredentials: true }
    );
    if (res.data.access_token) {
      localStorage.setItem("access_token", res.data.access_token);
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true }).catch(() => {});
    localStorage.removeItem("access_token");
    setUser(false);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem("access_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios.get(`${API}/auth/me`, { headers, withCredentials: true });
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  if (adminOnly && user.role !== "admin") {
    window.location.href = "/dashboard";
    return null;
  }

  return children;
}
