"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ConnectGithubBtnProps {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export function ConnectGithubBtn({
  variant = "default",
  size = "default",
}: ConnectGithubBtnProps) {
  const handleConnect = () => {
    signIn("github", { callbackUrl: "/" });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleConnect}
      title="Requests GitHub repo scope so DevStudio can write code on your behalf"
    >
      <Github className="mr-2 h-5 w-5" />
      Connect GitHub (write access)
    </Button>
  );
}
