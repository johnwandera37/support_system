"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { endpoints } from "@/config/constants";
import { getErrorMessage } from "@/utils/errMsg";
import { errLog, log } from "@/utils/logger";
import Loader from "@/components/ui/loader";
import { fetcher } from "@/lib/fetcher";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetcher(endpoints.getMe);
      if (res.user) {
        setUser(res.user);
      }
    } catch (error) {
      errLog("Fetch user error: ", getErrorMessage(error));
      setUser(null); // unauthenticated
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post(endpoints.logout);
      setUser(null);
      router.push("/");
    } catch (err) {
      errLog("Logout failed:", getErrorMessage(err));
    }
  };

  useEffect(() => {
    const pathname = window.location.pathname;
    const publicRoutes = ["/", "/register", "/docs"];

    if (publicRoutes.includes(pathname)) {
      setIsLoading(false); // Skip fetching user, since it's a public route
      return;
    }

    // Only fetch user if not on public route
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
      {isLoading ? <Loader variant="fullscreen" size="lg" /> : children}
    </AuthContext.Provider>
  );
};
