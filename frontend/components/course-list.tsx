"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Course } from "@/types/course";
import { Pencil, Trash2 } from "lucide-react";

interface CourseListProps {
  courses: Course[];
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
}

function getGradeBadgeVariant(
  grade: string | null,
): "default" | "secondary" | "success" | "warning" | "destructive" | "outline" {
  const normalized = grade?.toUpperCase() ?? null;

  if (!normalized) return "outline";
  if (normalized === "A" || normalized === "PASS") return "success";
  if (normalized === "B" || normalized === "C") return "warning";
  return "destructive";
}

export function CourseList({ courses, onEdit, onDelete }: CourseListProps) {
  const safeCourses = Array.isArray(courses) ? courses : [];

  if (safeCourses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">No courses in this semester</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {safeCourses.map((course) => (
        <Card key={course.id} className="py-4">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base font-semibold">
                {course.name}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(course)}
                  aria-label={`Edit ${course.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(course)}
                  aria-label={`Delete ${course.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{course.credits} credits</span>
                <span>|</span>
                <span>{course.hp} HP</span>
              </div>
              <Badge variant={getGradeBadgeVariant(course.grade)}>
                {course.grade || "N/A"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
