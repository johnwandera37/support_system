"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { errLog } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import Loader from "./ui/loader";

type UserNavProps = {
  user: {
    email: string;
    name: string;
    role: string;
  };
};

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const { logout } = useAuth(); // Get lgout from context
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false); // local state for the logout

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout(); // clear user, token, etc.
      router.push("/"); // redirect to home or login
    } catch (error) {
      errLog("Logout failed:", getErrorMessage(error));
      toast({
        title: "Logout failed",
        description: "An error occured during logout",
      });

      setIsLoggingOut(false); // re-enable UI on failure
    }
  };

  const getInitials = (name: string, role: string) => {
    if (name && name.trim()) {
      const names = name.trim().split(" ");
      const initials = names
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join("");
      return initials;
    }

    return role.slice(0, 2).toUpperCase(); // fallback like 'US', 'AD', 'AG'
  };

  const navigateToDashboard = () => {
    if (user.role === "ADMIN") {
      router.push("/admin");
    } else if (user.role === "AGENT") {
      router.push("/dashboard");
    } else {
      router.push("/my-tickets");
    }
  };

  return (
    <>
      {isLoggingOut && <Loader variant="fullscreen" size="lg" />}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {getInitials(user.name, user.role)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.email}</p>
              <p className="text-xs leading-none text-muted-foreground">
                Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={navigateToDashboard}>
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/my-tickets")}>
            My Tickets
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
