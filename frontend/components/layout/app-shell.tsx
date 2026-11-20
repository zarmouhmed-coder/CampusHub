"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { NAV_ITEMS, PROFILE_ITEM } from "@/components/layout/nav-items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useLogout } from "@/features/auth/api";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Avatar({ name }: { name?: string }) {
  return (
    <span className="bg-accent text-accent-foreground grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold">
      {name?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data: user, isPending } = useCurrentUser();
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hover:bg-secondary focus-visible:ring-ring flex items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-[3px]",
          compact ? "p-1" : "w-full p-2",
        )}
        aria-label="Menu du compte"
      >
        <Avatar name={user?.first_name} />
        {!compact && (
          <span className="min-w-0 flex-1">
            {isPending ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <>
                <span className="block truncate text-sm font-medium">{user?.first_name}</span>
                <span className="text-muted-foreground block truncate text-xs">{user?.email}</span>
              </>
            )}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? "end" : "start"}
        side={compact ? "bottom" : "top"}
        className="w-56"
      >
        <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound /> Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          onSelect={() => logout.mutate()}
        >
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="bg-card fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" aria-label="CampusHub, tableau de bord">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Navigation principale">
          {[...NAV_ITEMS, PROFILE_ITEM].map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-[1.1rem]" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="bg-card/95 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" aria-label="CampusHub, tableau de bord">
          <Logo />
        </Link>
        <UserMenu compact />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
        {children}
      </main>

      {/* Mobile / tablet bottom navigation */}
      <nav
        className="bg-card/95 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navigation principale"
      >
        {[...NAV_ITEMS, PROFILE_ITEM].map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
