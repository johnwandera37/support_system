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
import { loginPath } from "@/config/constants";
import { getErrorMessage } from "@/utils/errMsg";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const loginUser = await fetcher(loginPath, {
        method: "POST",
        body: { email, password },
      });

      const { user, message } = loginUser;

      // save user data locally, for now, will user proper auth
      localStorage.setItem("user", JSON.stringify(user));

      // Redirect based on role
      console.log("User role", user.role);
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter style={{ marginTop: "20px" }}>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
