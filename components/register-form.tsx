"use client";

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
import { signupSchema } from "@/lib/zodSchema";
import { registerPath } from "@/config/constants";
import { Eye, EyeOff } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    wantsToBeAgent: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate against Zod schema (optional but clean)
      const parsed = signupSchema.parse(formData);

      const res = await fetcher(registerPath, {
        method: "POST",
        body: parsed,
        credentials: "omit",
      });

      toast({
        title: "Registration successful",
        description: "You can now log in",
      });

      router.push("/");
    } catch (error) {
      const message = getErrorMessage(error);
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Smart Support</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create account now to get started
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Create an Account</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  value={formData.password}
                  onChange={handleChange}
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
            <div className="flex items-center gap-2">
              <input
                id="wantsToBeAgent"
                name="wantsToBeAgent"
                type="checkbox"
                checked={formData.wantsToBeAgent}
                onChange={handleChange}
              />
              <Label htmlFor="wantsToBeAgent">Request Agent Access</Label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 mt-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Register"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <a href="/" className="text-black hover:underline">
                Sign In
              </a>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
