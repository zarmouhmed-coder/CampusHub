import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, UserRound } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard },
  { href: "/subjects", label: "Matières", short: "Matières", icon: BookOpen },
  { href: "/assignments", label: "Devoirs", short: "Devoirs", icon: ClipboardList },
  { href: "/exams", label: "Examens", short: "Examens", icon: GraduationCap },
] as const;

export const PROFILE_ITEM = { href: "/profile", label: "Profil", short: "Profil", icon: UserRound };
