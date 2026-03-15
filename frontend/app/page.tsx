"use client";

import { CourseDashboard } from "@/components/course-dashboard";
import { SignOutButton } from "@/components/sign-out-button";
import { getStoredUser } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const current = getStoredUser();
    if (!current) router.replace("/signin");
    setUser(current);
  }, [router]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Course Tracker
            </h1>
            <p className="mt-2 text-muted-foreground">
              Track your courses, view grades by semester, and monitor your
              academic progress.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-sm text-muted-foreground sm:block">
              Signed in as {user.username}
            </div>
            <SignOutButton />
          </div>
        </header>
        <CourseDashboard />
      </div>
    </main>
  );
}
