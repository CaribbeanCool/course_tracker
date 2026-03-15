import { CourseDashboard } from "@/components/course-dashboard";

export default function Home() {
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
