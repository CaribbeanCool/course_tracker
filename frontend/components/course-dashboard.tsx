"use client";

import { useEffect, useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CourseStatsPanel } from "@/components/course-stats";
import { CourseList } from "@/components/course-list";
import { EditCourseDialog } from "@/components/edit-course-dialog";
import { AddCourseDialog } from "@/components/add-course-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Course, CourseStats } from "@/types/course";
import { Moon, Plus, Sun } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import { apiFetch, apiUrl, getStoredUser } from "@/lib/api-client";

const fetcher = async (url: string) => {
  const user = getStoredUser();
  const res = await fetch(url, {
    headers: user ? { "X-User-Id": String(user.id) } : undefined,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};

function sortSemesters(semesters: string[]): string[] {
  const collator = new Intl.Collator("es", {
    numeric: true,
    sensitivity: "base",
  });

  const parseSemester = (
    value: string,
  ): { year: number | null; term: number | null } => {
    const trimmed = value.trim();

    const matchStandard = /^(1er|2do)\s+(\d{2,4})$/i.exec(trimmed);
    if (matchStandard) {
      const term = matchStandard[1].toLowerCase() === "1er" ? 1 : 2;
      const rawYear = Number(matchStandard[2]);
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      return { year, term };
    }

    const matchSummer = /^verano\s+(\d{2,4})$/i.exec(trimmed);
    if (matchSummer) {
      const rawYear = Number(matchSummer[1]);
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      // In this app's convention, "Verano" comes after "2do" of the same year.
      return { year, term: 3 };
    }

    return { year: null, term: null };
  };

  const unique = Array.from(new Set(semesters.filter(Boolean)));

  return unique.sort((a, b) => {
    if (a === "En curso") return b === "En curso" ? 0 : -1;
    if (b === "En curso") return 1;
    if (a === "Falta") return b === "Falta" ? 0 : 1;
    if (b === "Falta") return -1;

    const parsedA = parseSemester(a);
    const parsedB = parseSemester(b);

    if (parsedA.year !== null && parsedB.year !== null) {
      if (parsedA.year !== parsedB.year) return parsedA.year - parsedB.year;
      if (parsedA.term !== null && parsedB.term !== null) {
        if (parsedA.term !== parsedB.term) return parsedA.term - parsedB.term;
      }
    }

    return collator.compare(a, b);
  });
}

export function CourseDashboard() {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [mounted, setMounted] = useState(false);

  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const coursesKey = apiUrl("/api/courses?groupBy=semester");
  const statsKey = apiUrl("/api/courses?stats=true");

  const { data: coursesBySemester, isLoading: isLoadingCourses } = useSWR<
    Record<string, Course[]>
  >(coursesKey, fetcher);

  const { data: stats, isLoading: isLoadingStats } = useSWR<CourseStats>(
    statsKey,
    fetcher,
  );

  const sessions = coursesBySemester
    ? sortSemesters(Object.keys(coursesBySemester))
    : [];

  const sessionsForDialogs = sortSemesters([...sessions, "En curso", "Falta"]);

  const handleEdit = useCallback((course: Course) => {
    setEditingCourse(course);
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((course: Course) => {
    setDeletingCourse(course);
  }, []);

  const confirmDelete = async () => {
    if (!deletingCourse) return;

    try {
      await apiFetch(`/api/courses/${deletingCourse.id}`, {
        method: "DELETE",
      });
      mutate(coursesKey);
      mutate(statsKey);
    } finally {
      setDeletingCourse(null);
    }
  };

  const handleSave = async (
    courseData: Partial<Course> & { id: number },
  ): Promise<void> => {
    await apiFetch(`/api/courses/${courseData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courseData),
    });
    mutate(coursesKey);
    mutate(statsKey);
  };

  const handleAdd = async (courseData: {
    name: string;
    credits: number;
    grade: string;
    hp: number;
    session: string;
  }): Promise<void> => {
    await apiFetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courseData),
    });
    mutate(coursesKey);
    mutate(statsKey);
  };

  const defaultTab =
    (sessions.includes("En curso") ? "En curso" : null) ??
    sessions[sessions.length - 3] ??
    sessions[0] ??
    "";

  return (
    <div className="flex flex-col gap-6">
      <CourseStatsPanel stats={stats ?? null} isLoading={isLoadingStats} />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Courses by Semester</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>

      {isLoadingCourses ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : sessions.length > 0 ? (
        <Tabs defaultValue={defaultTab} className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max">
              {sessions.map((session) => (
                <TabsTrigger key={session} value={session}>
                  {session}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({coursesBySemester?.[session]?.length || 0})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {sessions.map((session) => (
            <TabsContent key={session} value={session} className="mt-4">
              <CourseList
                courses={coursesBySemester?.[session] || []}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            No courses found. Add your first course to get started.
          </p>
        </div>
      )}

      <EditCourseDialog
        course={editingCourse}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSave}
        sessions={sessionsForDialogs}
      />

      <AddCourseDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAdd}
        sessions={sessionsForDialogs}
      />

      <AlertDialog
        open={!!deletingCourse}
        onOpenChange={(open) => !open && setDeletingCourse(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingCourse?.name}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
