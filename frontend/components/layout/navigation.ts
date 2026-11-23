import {
  Banknote,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileBadge,
  GraduationCap,
  House,
  LayoutDashboard,
  Megaphone,
  Network,
  NotebookPen,
  ScrollText,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Messages } from "@/lib/i18n/fr";
import type { ModuleName, User } from "@/types/api";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavSection = { label: string; items: NavItem[] };

/** Navigation for the signed-in user: depends on their role and the enabled modules. */
export function buildNavigation(user: User | undefined, t: Messages): NavSection[] {
  const n = t.campus.nav;
  const has = (m: ModuleName) => Boolean(user?.institution?.modules.includes(m));
  const personal: NavSection = {
    label: t.nav.mySpace,
    items: [
      { href: "/dashboard", label: t.nav.home, icon: House },
      { href: "/assignments", label: t.nav.assignments, icon: ClipboardList },
      { href: "/exams", label: t.nav.exams, icon: GraduationCap },
      { href: "/subjects", label: t.nav.subjects, icon: BookOpen },
    ],
  };
  const account: NavSection = {
    label: t.nav.account,
    items: [{ href: "/profile", label: t.nav.profile, icon: UserRound }],
  };
  const sections: NavSection[] = [];

  if (user?.is_superadmin) {
    sections.push({
      label: n.platform,
      items: [
        { href: "/platform", label: n.institutions, icon: Building2 },
        { href: "/platform/users", label: n.users, icon: Users },
        { href: "/platform/audit", label: n.audit, icon: ScrollText },
      ],
    });
  }

  const role = user?.institution?.status === "active" ? user.role : null;
  if (role === "admin") {
    sections.push({
      label: n.school,
      items: [
        { href: "/school", label: n.schoolHome, icon: LayoutDashboard },
        { href: "/school/structure", label: n.structure, icon: Network },
        { href: "/school/people", label: n.people, icon: Users },
        { href: "/school/courses", label: n.courses, icon: BookOpen },
        ...(has("timetable")
          ? [{ href: "/timetable", label: n.timetable, icon: CalendarDays }]
          : []),
        ...(has("grades") ? [{ href: "/school/results", label: n.results, icon: BarChart3 }] : []),
        ...(has("attendance")
          ? [{ href: "/school/attendance", label: n.attendance, icon: ClipboardCheck }]
          : []),
        ...(has("finance") ? [{ href: "/school/finance", label: n.finance, icon: Banknote }] : []),
        ...(has("documents")
          ? [{ href: "/school/documents", label: n.documents, icon: FileBadge }]
          : []),
        ...(has("announcements")
          ? [{ href: "/announcements", label: n.announcements, icon: Megaphone }]
          : []),
        { href: "/school/settings", label: n.settings, icon: Settings },
        { href: "/school/audit", label: n.audit, icon: ScrollText },
      ],
    });
  } else if (role === "teacher") {
    sections.push({
      label: n.teaching,
      items: [
        ...(has("grades") ? [{ href: "/teaching", label: n.myCourses, icon: NotebookPen }] : []),
        ...(has("timetable")
          ? [{ href: "/timetable", label: n.timetable, icon: CalendarDays }]
          : []),
        ...(has("announcements")
          ? [{ href: "/announcements", label: n.announcements, icon: Megaphone }]
          : []),
      ],
    });
  } else if (role === "student") {
    sections.push({
      label: n.schooling,
      items: [
        ...(has("timetable")
          ? [{ href: "/timetable", label: n.timetable, icon: CalendarDays }]
          : []),
        ...(has("grades") ? [{ href: "/results", label: n.myResults, icon: BarChart3 }] : []),
        ...(has("attendance")
          ? [{ href: "/attendance", label: n.myAttendance, icon: ClipboardCheck }]
          : []),
        ...(has("finance") ? [{ href: "/fees", label: n.myFees, icon: Banknote }] : []),
        ...(has("documents")
          ? [{ href: "/documents", label: n.myDocuments, icon: FileBadge }]
          : []),
        ...(has("announcements")
          ? [{ href: "/announcements", label: n.announcements, icon: Megaphone }]
          : []),
      ],
    });
  }
  // Students and personal accounts keep the personal planner.
  if (!role || role === "student")
    sections.push({ ...personal, label: role ? n.personal : t.nav.mySpace });
  sections.push(account);
  return sections.filter((s) => s.items.length > 0);
}

/** Where to land after signing in. */
export function homeFor(user: User): string {
  if (user.role === "admin" && user.institution?.status === "active") return "/school";
  if (user.role === "teacher" && user.institution?.status === "active") return "/teaching";
  if (user.is_superadmin && !user.role) return "/platform";
  return "/dashboard";
}

/** Label shown above the navigation: the institution or the space. */
export function spaceLabel(user: User | undefined, t: Messages): string {
  if (user?.institution) return user.institution.name;
  if (user?.is_superadmin) return t.campus.nav.platformSpace;
  return t.nav.studentSpace;
}
