"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/fetcher";
import { getErrorMessage } from "@/utils/errMsg";
import { Eye, EyeOff } from "lucide-react";
import { endpoints } from "@/config/constants";
import { useAuth } from "@/context/AuthContext";
import { log } from "@/utils/console-logger";
import Loader from "./ui/loader";
import { setAccessToken } from "@/utils/tokenStore";

interface LoginResponse {
  user: User; // your existing ambient `User` type from global.d.ts
  message?: string;
}

interface AccessTokenResponse {
  token: string;
  expiresIn: number;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Login Request
      const loginUser = await fetcher<LoginResponse>(endpoints.login, {
        method: "POST",
        body: { email, password },
      });

      const { user, message } = loginUser;

      // 2. 🔥 Immediately fetch access token + expiry from backend
    const tokenRes = await fetcher<AccessTokenResponse>(endpoints.accessToken);
    log("Token res", tokenRes);
    const tokenData = tokenRes;
    if (tokenData?.token && tokenData?.expiresIn) {
      setAccessToken(tokenData.token, tokenData.expiresIn);
    }

      // 3. 🔥 Store user and logged in state in context
      setUser(user);

      // 4. Redirect based on role
      switch (user.role) {
        case "ADMIN":
          router.push("/admin");
          break;
        case "AGENT":
          router.push("/dashboard");
          break;
        default:
          router.push("/my-tickets");
          break;
      }

      toast({
        title: message || "Login successful",
        description: "Welcome to Smart Support",
      });
    } catch (error) {
      const errMsg = getErrorMessage(error);
      toast({
        title: "Login failed",
        description: errMsg || "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">Sign In</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10" // leave space for the icon
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-muted-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Add Forgot Password link */}
          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:underline"
            >
              Forgot Password?
            </a>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 mt-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader variant="button" size="sm" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          {/* Add Register link */}
          <p className="text-sm text-center text-muted-foreground">
            Don’t have an account?{" "}
            <a href="/register" className="text-black hover:underline">
              Register
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
