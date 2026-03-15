import { CourseDashboard } from "@/components/course-dashboard";
import { SignOutButton } from "@/components/sign-out-button";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

export default async function Home() {
  const session = (await getServerSession(
    authOptions as any,
  )) as Session | null;
  if (!session) return redirect("/signin");

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
              Signed in as {session.user?.name ?? "User"}
            </div>
            <SignOutButton />
          </div>
        </header>
        <CourseDashboard />
      </div>
    </main>
  );
}
