"use client";

import { useId, useState } from "react";
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

interface AddCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (course: {
    name: string;
    credits: number;
    grade: string;
    hp: number;
    session: string;
  }) => Promise<void>;
  sessions: string[];
}

const NO_GRADE_VALUE = "__none__";
const GRADE_OPTIONS = ["A", "B", "C", "D", "F", "W", "PASS"];

export function AddCourseDialog({
  open,
  onOpenChange,
  onAdd,
  sessions,
}: AddCourseDialogProps) {
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
    if (!formData.name || !formData.session) return;

    setIsSaving(true);
    try {
      await onAdd(formData);
      onOpenChange(false);
      setFormData({
        name: "",
        credits: 3,
        grade: "",
        hp: 0,
        session: "",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
          <DialogDescription>
            Add a new course to your academic record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-name">Course Code</FieldLabel>
              <Input
                id="new-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., CIIC4010"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="new-credits">Credits</FieldLabel>
              <Input
                id="new-credits"
                type="number"
                min={1}
                max={6}
                value={formData.credits}
                onChange={(e) => handleCreditsChange(parseInt(e.target.value))}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="new-grade">Grade</FieldLabel>
              <Select
                value={formData.grade || NO_GRADE_VALUE}
                onValueChange={(value) =>
                  handleGradeChange(value === NO_GRADE_VALUE ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select grade (optional)" />
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
              <FieldLabel htmlFor="new-hp">Honor Points</FieldLabel>
              <Input
                id="new-hp"
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
              <FieldLabel htmlFor="new-session">Semester</FieldLabel>
              <Input
                id="new-session"
                list={`${sessionListId}-sessions`}
                value={formData.session}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, session: e.target.value }))
                }
                placeholder="Type or pick a semester"
                required
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
            <Button
              type="submit"
              disabled={isSaving || !formData.name || !formData.session}
            >
              {isSaving && <Spinner />}
              Add Course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
