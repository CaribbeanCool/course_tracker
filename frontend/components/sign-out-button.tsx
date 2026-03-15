"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clearStoredUser } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      clearStoredUser();
      router.replace("/signin");
    } finally {
      // If signOut redirects, this won't run; if it doesn't, re-enable.
      setIsSigningOut(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}
