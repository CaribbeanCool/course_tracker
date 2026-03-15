export interface Course {
  id: number
  name: string
  credits: number
  grade: string | null
  hp: number
  session: string
  created_at: string
  updated_at: string
}

export interface CourseStats {
  totalCredits: number
  totalHp: number
  gpa: number
  completedCourses: number
  inProgressCourses: number
  missingCourses: number
}
