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
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [userError, setUserError] = useState<
    null | "unauthorized" | "network" | "other"
  >(null);

  const fetchUser = async () => {
    try {
      const res = await api.get(endpoints.getMe);
      if (!res || !res.data?.user) throw new Error("No user returned");

      setUser(res.data.user);
      setUserError(null);
    } catch (error: any) {
      const message = getErrorMessage(error);
      errLog("Fetch user error: ", message);

      if (error?.response) {
        // Server responded but with an error
        const code = error.response.status;

        if (code === 401 || code === 403) {
          setUser(null); // Token likely expired
          setUserError("unauthorized");
        } else {
          toast({
            title: "Server Error",
            description: message,
            variant: "destructive",
          });
        }
      } else if (error?.request) {
        // Network error / No response received
        setUser(null);
        setUserError("network");
        toast({
          title: "Network Error",
          description: "Check your connection",
          variant: "destructive",
        });
      } else {
        // Any other error
        setUser(null);
        setUserError("other");
        toast({ title: "Error", description: message, variant: "destructive" });
      }

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
    <AuthContext.Provider value={{ user, setUser, logout, isLoading, userError, setUserError }}>
      {isLoading ? <Loader variant="fullscreen" size="lg" /> : children}
    </AuthContext.Provider>
  );
};
