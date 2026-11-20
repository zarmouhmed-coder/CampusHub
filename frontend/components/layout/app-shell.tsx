"use client";

import { LogOut, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { NAV_ITEMS, PROFILE_ITEM } from "@/components/layout/nav-items";
import { QuickAddMenu, QuickAddProvider } from "@/components/layout/quick-add";
import { Button } from "@/components/ui/button";
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

function Avatar({ name, className }: { name?: string; className?: string }) {
  return (
    <span
      className={cn(
        "from-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br to-[oklch(0.6_0.2_290)] text-sm font-bold",
        className,
      )}
    >
      {name?.[0]?.toUpperCase() ?? ""}
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
          "focus-visible:ring-ring flex items-center gap-3 rounded-2xl text-left outline-none focus-visible:ring-[3px]",
          compact ? "rounded-full" : "hover:bg-secondary w-full p-2",
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
                <span className="block truncate text-sm font-semibold">{user?.first_name}</span>
                <span className="text-muted-foreground block truncate text-xs">{user?.email}</span>
              </>
            )}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? "end" : "start"}
        side={compact ? "bottom" : "top"}
        className="w-60"
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

function MobileNavLink({ item, pathname }: { item: (typeof NAV_ITEMS)[number]; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 pt-2.5 pb-2 text-[0.68rem] font-semibold transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-[1.35rem]" strokeWidth={active ? 2.4 : 2} />
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <QuickAddProvider>
      <div className="min-h-dvh lg:pl-64">
        {/* Desktop sidebar */}
        <aside className="bg-card shadow-card fixed inset-y-3 left-3 z-30 hidden w-58 flex-col rounded-3xl lg:flex">
          <div className="flex h-18 items-center px-5">
            <Link href="/dashboard" aria-label="CampusHub, accueil">
              <Logo />
            </Link>
          </div>
          <div className="px-3 pb-3">
            <QuickAddMenu side="right" align="start">
              <Button className="w-full">
                <Plus /> Ajouter
              </Button>
            </QuickAddMenu>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Navigation principale">
            {[...NAV_ITEMS, PROFILE_ITEM].map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-ink text-ink-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="size-[1.15rem]" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3">
            <UserMenu />
          </div>
        </aside>

        {/* Mobile / tablet top bar */}
        <header className="bg-background/85 sticky top-0 z-30 flex h-16 items-center justify-between px-5 backdrop-blur-md lg:hidden">
          <Link href="/dashboard" aria-label="CampusHub, accueil">
            <Logo />
          </Link>
          <UserMenu compact />
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-2 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          {children}
        </main>

        {/* Mobile / tablet bottom navigation with the central "+" button */}
        <nav
          className="bg-card fixed inset-x-0 bottom-0 z-30 rounded-t-3xl pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-12px_oklch(0.2_0.03_268/0.18)] lg:hidden"
          aria-label="Navigation principale"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
            <MobileNavLink item={NAV_ITEMS[0]} pathname={pathname} />
            <MobileNavLink item={NAV_ITEMS[1]} pathname={pathname} />
            <div className="flex justify-center">
              <QuickAddMenu>
                <button
                  type="button"
                  aria-label="Ajouter"
                  className="bg-ink text-ink-foreground shadow-float ring-background focus-visible:ring-ring -mt-6 mb-2 grid size-14 place-items-center rounded-full ring-4 transition-transform focus-visible:outline-none active:scale-95"
                >
                  <Plus className="size-6" strokeWidth={2.5} />
                </button>
              </QuickAddMenu>
            </div>
            <MobileNavLink item={NAV_ITEMS[2]} pathname={pathname} />
            <MobileNavLink item={NAV_ITEMS[3]} pathname={pathname} />
          </div>
        </nav>
      </div>
    </QuickAddProvider>
  );
}
