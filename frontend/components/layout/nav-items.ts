import { BookOpen, ClipboardList, GraduationCap, House, UserRound } from "lucide-react";

import type { Messages } from "@/lib/i18n/fr";

type NavKey = keyof Pick<
  Messages["nav"],
  "home" | "assignments" | "exams" | "subjects" | "profile"
>;

export const NAV_ITEMS = [
  { href: "/dashboard", key: "home", icon: House },
  { href: "/assignments", key: "assignments", icon: ClipboardList },
  { href: "/exams", key: "exams", icon: GraduationCap },
  { href: "/subjects", key: "subjects", icon: BookOpen },
] as const satisfies readonly { href: string; key: NavKey; icon: unknown }[];

export const PROFILE_ITEM = { href: "/profile", key: "profile", icon: UserRound } as const;

export const ALL_ITEMS = [...NAV_ITEMS, PROFILE_ITEM];
