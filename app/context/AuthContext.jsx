// app/context/AuthContext.jsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // ✅ Check auth on mount - verifies session token via /api/auth/me
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        // ✅ If session expired (another device logged in), clear local state
        if (data.message === "Session expired. Please login again.") {
          toast.error("Your session has been replaced by a new login.");
          localStorage.removeItem("user");
          localStorage.removeItem("isAuthenticated");
          // Optionally clear cookie server-side
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
          router.push("/login?session=expired");
        }
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        // ✅ Re-fetch full user from /api/auth/me
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        const meData = await meRes.json();

        if (meData.success) {
          setUser(meData.user);
        } else {
          setUser(data.user);
        }

        setIsAuthenticated(true);
        router.push("/");
        return { success: true, user: meData.user || data.user };
      } else {
        toast.error(data.message || "Login failed");
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("user");
      localStorage.removeItem("isAuthenticated");
      toast.success("Logged out successfully");
      router.push("/login");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};