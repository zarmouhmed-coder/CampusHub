"use client";

import { Check, Languages, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser, useLogout } from "@/features/auth/api";
import { useUpdateProfile } from "@/features/profile/api";
import { errorMessage } from "@/lib/api-client";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function Avatar({ name, className }: { name?: string; className?: string }) {
  return (
    <span
      className={cn(
        "from-primary to-ink text-primary-foreground ring-card grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[0.8rem] font-semibold ring-2",
        className,
      )}
    >
      {name?.[0]?.toUpperCase() ?? ""}
    </span>
  );
}

const THEMES: { value: ThemeChoice; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

/** Change the interface language, and remember it in the profile. */
export function useChangeLocale() {
  const { t, setLocale } = useI18n();
  const update = useUpdateProfile();
  return (locale: Locale) => {
    setLocale(locale);
    update.mutate({ locale }, { onError: (error) => toast.error(errorMessage(error, t)) });
  };
}

export function UserMenu() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { t, locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const changeLocale = useChangeLocale();
  const themeLabel = {
    light: t.shell.themeLight,
    dark: t.shell.themeDark,
    system: t.shell.themeSystem,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus-visible:ring-ring flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-[3px]"
        aria-label={t.shell.accountMenu}
      >
        <Avatar name={user?.first_name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar name={user?.first_name} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.first_name}</p>
            <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound /> {t.shell.myProfile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <Languages className="size-3.5" /> {t.shell.language}
        </DropdownMenuLabel>
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => changeLocale(l)}>
            <span className="w-4">{l === locale && <Check />}</span>
            {t.languages[l]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuLabel>{t.shell.theme}</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 px-1 pb-1">
          {THEMES.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg py-2 text-[0.7rem] font-medium transition-colors",
                theme === value
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-secondary/70",
              )}
            >
              <Icon className="size-4" />
              {themeLabel[value]}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          onSelect={() => logout.mutate()}
        >
          <LogOut /> {t.shell.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
