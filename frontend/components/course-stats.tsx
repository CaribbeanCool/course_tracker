"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CourseStats } from "@/types/course"
import { BookOpen, GraduationCap, Clock, AlertCircle } from "lucide-react"

interface CourseStatsProps {
  stats: CourseStats | null
  isLoading: boolean
}

export function CourseStatsPanel({ stats, isLoading }: CourseStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const safeStats: CourseStats = stats ?? {
    totalCredits: 0,
    totalHp: 0,
    gpa: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    missingCourses: 0,
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            GPA
          </CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(safeStats.gpa ?? 0).toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            {safeStats.totalHp ?? 0} honor points
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Credits
          </CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.totalCredits}</div>
          <p className="text-xs text-muted-foreground">
            {safeStats.completedCourses} courses completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            In Progress
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.inProgressCourses}</div>
          <p className="text-xs text-muted-foreground">courses this semester</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Missing
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.missingCourses}</div>
          <p className="text-xs text-muted-foreground">courses remaining</p>
        </CardContent>
      </Card>
    </div>
  )
}
