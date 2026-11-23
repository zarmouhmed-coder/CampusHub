"use client";

import { ArrowLeftRight, Check, ChevronsLeft, ChevronsRight, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

import { Logo } from "@/components/layout/logo";
import { buildNavigation, spaceLabel, type NavItem } from "@/components/layout/navigation";
import { QuickAddMenu, QuickAddProvider } from "@/components/layout/quick-add";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser, useSwitchInstitution } from "@/features/auth/api";
import { useI18n } from "@/lib/i18n";
import { usePersistentFlag } from "@/lib/use-persistent-flag";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";

/** The longest matching href wins ("/school/people" over "/school"). */
function activeHref(pathname: string, items: NavItem[]): string | undefined {
  return items
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

/** Once signed in, the language saved in the profile wins over the browser cookie. */
function useProfileLocale(user: User | undefined) {
  const { locale, setLocale } = useI18n();
  useEffect(() => {
    if (user && user.locale !== locale) setLocale(user.locale);
    // Only when the profile value changes: a manual switch updates the profile too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.locale]);
}

/** White-label: the institution's colour replaces the default accent when contrast allows. */
function brandStyle(user: User | undefined): React.CSSProperties | undefined {
  const color = user?.institution?.primary_color;
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return undefined;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum > 0.55) return undefined; // too light for white text on buttons
  return { "--primary": color, "--ring": `${color}55` } as React.CSSProperties;
}

/** Students and personal accounts can add their own tasks from anywhere. */
const canQuickAdd = (user: User | undefined) => !user?.role || user.role === "student";

function InstitutionSwitcher({ user }: { user: User }) {
  const { t } = useI18n();
  const switcher = useSwitchInstitution();
  if (user.memberships.length < 2) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t.campus.nav.switchInstitution}>
          <ArrowLeftRight />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{t.campus.nav.switchInstitution}</DropdownMenuLabel>
        {user.memberships.map((m) => (
          <DropdownMenuItem
            key={m.institution_id}
            onSelect={() => switcher.mutate(m.institution_id)}
          >
            <span className="w-4">{m.institution_id === user.institution?.id && <Check />}</span>
            <span className="min-w-0 flex-1 truncate">{m.institution_name}</span>
            <span className="text-muted-foreground text-xs">{t.campus.roles[m.role]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { data: user } = useCurrentUser();
  const [collapsed, setCollapsed] = usePersistentFlag("campushub_sidebar_collapsed");
  useProfileLocale(user);

  const sections = useMemo(() => buildNavigation(user, t), [user, t]);
  const allItems = sections.flatMap((s) => s.items);
  const current = activeHref(pathname, allItems);
  const currentItem = allItems.find((i) => i.href === current);
  const primary = sections[0]?.items ?? [];
  const mobileItems = primary.slice(0, 4);
  const space = spaceLabel(user, t);

  const navLink = ({ href, label, icon: Icon }: NavItem) => {
    const active = href === current;
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          collapsed && "justify-center px-0",
          active
            ? "bg-card text-foreground shadow-soft"
            : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
        )}
      >
        {active && (
          <span
            aria-hidden
            className="bg-gold absolute top-2 bottom-2 left-0 w-[3px] rounded-full"
          />
        )}
        <Icon
          className={cn("size-[1.1rem] shrink-0", active && "text-primary")}
          strokeWidth={1.9}
        />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <QuickAddProvider>
      <div
        style={brandStyle(user)}
        className={cn(
          "min-h-dvh transition-[padding] duration-300",
          collapsed ? "lg:pl-[5.25rem]" : "lg:pl-[15.75rem]",
          "print:!p-0",
        )}
      >
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "glass fixed inset-y-3 left-3 z-30 hidden flex-col rounded-2xl transition-[width] duration-300 lg:flex print:!hidden",
            collapsed ? "w-[4.5rem]" : "w-60",
          )}
        >
          <div
            className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "px-4")}
          >
            <Link href={allItems[0]?.href ?? "/dashboard"} aria-label={t.nav.homeLink}>
              <Logo compact={collapsed} />
            </Link>
          </div>
          {!collapsed && (
            <p className="border-gold/30 bg-gold/8 text-gold-foreground mx-4 mb-2 truncate rounded-lg border px-2.5 py-1.5 text-[0.7rem] font-semibold tracking-wide uppercase">
              {space}
            </p>
          )}
          <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2" aria-label={t.nav.main}>
            {sections.map((section) => (
              <div key={section.label} className="space-y-0.5">
                {!collapsed && (
                  <p className="text-muted-foreground px-3 pb-1 text-[0.68rem] font-semibold tracking-wider uppercase">
                    {section.label}
                  </p>
                )}
                {section.items.map(navLink)}
              </div>
            ))}
          </nav>
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              className={cn("w-full", collapsed ? "justify-center" : "justify-start")}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? t.nav.expand : t.nav.collapse}
            >
              {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
              {!collapsed && t.nav.collapse}
            </Button>
          </div>
        </aside>

        {/* Top bar */}
        <header className="glass sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-x-0 border-t-0 px-4 sm:px-6 lg:top-3 lg:mx-6 lg:mt-3 lg:rounded-2xl lg:border-x lg:border-t lg:px-4 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={allItems[0]?.href ?? "/dashboard"}
              aria-label={t.nav.homeLink}
              className="lg:hidden"
            >
              <Logo />
            </Link>
            <nav
              aria-label="Breadcrumb"
              className="hidden min-w-0 items-center gap-2 text-sm lg:flex"
            >
              <span className="text-muted-foreground truncate">{space}</span>
              {currentItem && (
                <>
                  <span aria-hidden className="text-border">
                    /
                  </span>
                  <span className="truncate font-semibold">{currentItem.label}</span>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user && <InstitutionSwitcher user={user} />}
            {canQuickAdd(user) && (
              <QuickAddMenu side="bottom" align="end">
                <Button size="sm" className="hidden lg:inline-flex">
                  <Plus /> {t.common.add}
                </Button>
              </QuickAddMenu>
            )}
            <UserMenu />
          </div>
        </header>

        <main className="animate-rise mx-auto w-full max-w-7xl px-4 pt-5 pb-32 sm:px-6 lg:px-6 lg:pt-6 lg:pb-10">
          {children}
        </main>

        {/* Mobile / tablet bottom navigation */}
        <nav
          className="glass fixed inset-x-2 bottom-2 z-30 rounded-2xl pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
          aria-label={t.nav.main}
        >
          <div className="mx-auto grid max-w-md grid-cols-5 items-end px-1">
            {[mobileItems[0], mobileItems[1]].map(
              (item) =>
                item && <MobileLink key={item.href} item={item} active={item.href === current} />,
            )}
            <div className="flex justify-center">
              {canQuickAdd(user) ? (
                <QuickAddMenu>
                  <button type="button" aria-label={t.common.add} className={centerButton}>
                    <Plus className="size-6" strokeWidth={2.4} />
                  </button>
                </QuickAddMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={t.nav.main} className={centerButton}>
                      <LayoutGrid className="size-6" strokeWidth={2.2} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="max-h-[60dvh] w-64 overflow-y-auto"
                  >
                    {allItems.map(({ href, label, icon: Icon }) => (
                      <DropdownMenuItem key={href} asChild>
                        <Link href={href}>
                          <Icon /> {label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {[mobileItems[2], mobileItems[3]].map(
              (item) =>
                item && <MobileLink key={item.href} item={item} active={item.href === current} />,
            )}
          </div>
        </nav>
      </div>
    </QuickAddProvider>
  );
}

const centerButton =
  "-mt-5 mb-2 grid size-13 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_-8px_var(--primary)] ring-4 ring-background transition-transform focus-visible:outline-none active:scale-95";

function MobileLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 pt-2.5 pb-2 text-[0.68rem] font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-[1.3rem]" strokeWidth={active ? 2.3 : 1.9} />
      <span className="max-w-full truncate px-1">{item.label}</span>
    </Link>
  );
}
