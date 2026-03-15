"use client";

import { useId, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { Course } from "@/types/course";

interface EditCourseDialogProps {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (course: Partial<Course> & { id: number }) => Promise<void>;
  sessions: string[];
}

const NO_GRADE_VALUE = "__none__";
const GRADE_OPTIONS = ["A", "B", "C", "D", "F", "W", "PASS", "FAIL"];

export function EditCourseDialog({
  course,
  open,
  onOpenChange,
  onSave,
  sessions,
}: EditCourseDialogProps) {
  const sessionListId = useId();
  const [formData, setFormData] = useState({
    name: "",
    credits: 3,
    grade: "",
    hp: 0,
    session: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const uniqueSessions = Array.from(new Set(sessions)).filter(Boolean);

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name,
        credits: course.credits,
        grade: course.grade || "",
        hp: course.hp,
        session: course.session,
      });
    }
  }, [course]);

  const calculateHp = (grade: string, credits: number): number => {
    const gradePoints: Record<string, number> = {
      A: 4,
      B: 3,
      C: 2,
      D: 1,
      F: 0,
    };
    return (gradePoints[grade] || 0) * credits;
  };

  const handleGradeChange = (grade: string) => {
    const hp = calculateHp(grade, formData.credits);
    setFormData((prev) => ({ ...prev, grade, hp }));
  };

  const handleCreditsChange = (credits: number) => {
    const hp = calculateHp(formData.grade, credits);
    setFormData((prev) => ({ ...prev, credits, hp }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    setIsSaving(true);
    try {
      await onSave({
        id: course.id,
        ...formData,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update the details for this course. Changes will be saved
            immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Course Code</FieldLabel>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., CIIC4010"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="credits">Credits</FieldLabel>
              <Input
                id="credits"
                type="number"
                min={1}
                max={6}
                value={formData.credits}
                onChange={(e) => handleCreditsChange(parseInt(e.target.value))}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="grade">Grade</FieldLabel>
              <Select
                value={formData.grade || NO_GRADE_VALUE}
                onValueChange={(value) =>
                  handleGradeChange(value === NO_GRADE_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key={NO_GRADE_VALUE} value={NO_GRADE_VALUE}>
                    No grade
                  </SelectItem>
                  {GRADE_OPTIONS.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="hp">Honor Points</FieldLabel>
              <Input
                id="hp"
                type="number"
                min={0}
                value={formData.hp}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hp: parseInt(e.target.value),
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="session">Semester</FieldLabel>
              <Input
                id="session"
                list={`${sessionListId}-sessions`}
                value={formData.session}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, session: e.target.value }))
                }
                placeholder="Type or pick a semester"
              />
              <datalist id={`${sessionListId}-sessions`}>
                {uniqueSessions.map((session) => (
                  <option key={session} value={session} />
                ))}
              </datalist>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Spinner />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
