"use client";

import { BookOpen, ClipboardList, GraduationCap } from "lucide-react";
import { createContext, use, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAssignmentDialogs } from "@/features/assignments/use-assignment-dialogs";
import { useExamDialogs } from "@/features/exams/use-exam-dialogs";
import { SubjectFormDialog } from "@/features/subjects/subject-form-dialog";
import { useI18n } from "@/lib/i18n";

type QuickAdd = {
  addAssignment: () => void;
  addExam: () => void;
  addSubject: () => void;
};

const QuickAddContext = createContext<QuickAdd | null>(null);

/** Creation dialogs reachable from anywhere in the app ("+" button, dashboard…). */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const assignments = useAssignmentDialogs();
  const exams = useExamDialogs();
  const [subjectOpen, setSubjectOpen] = useState(false);

  return (
    <QuickAddContext
      value={{
        addAssignment: assignments.openCreate,
        addExam: exams.openCreate,
        addSubject: () => setSubjectOpen(true),
      }}
    >
      {children}
      {assignments.dialogs}
      {exams.dialogs}
      <SubjectFormDialog open={subjectOpen} onOpenChange={setSubjectOpen} />
    </QuickAddContext>
  );
}

export function useQuickAdd(): QuickAdd {
  const context = use(QuickAddContext);
  if (!context) throw new Error("useQuickAdd must be used inside <QuickAddProvider>");
  return context;
}

/** "Add" menu: assignment, exam or subject. `children` is the trigger button. */
export function QuickAddMenu({
  children,
  side = "top",
  align = "center",
}: {
  children: React.ReactNode;
  side?: "top" | "bottom" | "right";
  align?: "start" | "center" | "end";
}) {
  const { addAssignment, addExam, addSubject } = useQuickAdd();
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} sideOffset={10} className="w-56">
        <DropdownMenuItem onSelect={addAssignment}>
          <ClipboardList /> {t.shell.newAssignment}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={addExam}>
          <GraduationCap /> {t.shell.newExam}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={addSubject}>
          <BookOpen /> {t.shell.newSubject}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
