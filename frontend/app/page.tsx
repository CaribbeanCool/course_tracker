import { CourseDashboard } from "@/components/course-dashboard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions as any);
  if (!session) return redirect("/signin");

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Course Tracker</h1>
          <p className="mt-2 text-muted-foreground">
            Track your courses, view grades by semester, and monitor your
            academic progress.
          </p>
        </header>
        <CourseDashboard />
      </div>
    </main>
  );
}
