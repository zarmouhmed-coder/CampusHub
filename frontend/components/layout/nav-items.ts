import { BookOpen, ClipboardList, GraduationCap, House, UserRound } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: House },
  { href: "/assignments", label: "Devoirs", icon: ClipboardList },
  { href: "/exams", label: "Examens", icon: GraduationCap },
  { href: "/subjects", label: "Matières", icon: BookOpen },
] as const;

export const PROFILE_ITEM = { href: "/profile", label: "Profil", icon: UserRound };
