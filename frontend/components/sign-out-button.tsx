"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: "/signin" });
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
