"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { endpoints } from "@/config/constants";
import { getErrorMessage } from "@/utils/errMsg";
import { errLog, log } from "@/utils/logger";
import Loader from "@/components/ui/loader";

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
  userError: any;
  setUserError: (error: any) => void;
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
  const [userError, setUserError] = useState<
    null | "unauthorized" | "network" | "other"
  >(null);

  const fetchUser = async () => {
    try {
      // The get me endpoint runs with the help of the axios interceptor such that it will be able to refresh access token if it has expired
      const res = await api.get(endpoints.getMe);
      if (res?.data?.user) {
        setUser(res.data.user);
        setUserError(null);
      } else {
        setUser(null);
        setUserError("unauthorized");
      }
    } catch (error: any) {
      const axiosMessage = getErrorMessage(error);
      const backendErrMsg = error?.response?.data.error;
      const status = error?.response?.status;
      errLog(
        "Fetch user error: ",
        `Axios message: ${axiosMessage} Backennd Error Messgae: ${backendErrMsg}`
      );

      if (status === 401 || status === 404) {
        setUser(null);
        setUserError("unauthorized");
      }

      if (!error.response) {
        setUser(null);
        setUserError("network");
      }

      // Fallback
      setUser(null);
      setUserError("other");
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
    <AuthContext.Provider
      value={{ user, setUser, logout, isLoading, userError, setUserError }}
    >
      {isLoading ? <Loader variant="fullscreen" size="lg" /> : children}
    </AuthContext.Provider>
  );
};
