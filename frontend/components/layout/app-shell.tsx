"use client";

import { ChevronsLeft, ChevronsRight, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { Logo } from "@/components/layout/logo";
import { ALL_ITEMS, NAV_ITEMS, PROFILE_ITEM } from "@/components/layout/nav-items";
import { QuickAddMenu, QuickAddProvider } from "@/components/layout/quick-add";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/api";
import { useI18n } from "@/lib/i18n";
import { usePersistentFlag } from "@/lib/use-persistent-flag";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Once signed in, the language saved in the profile wins over the browser cookie. */
function useProfileLocale() {
  const { data: user } = useCurrentUser();
  const { locale, setLocale } = useI18n();
  useEffect(() => {
    if (user && user.locale !== locale) setLocale(user.locale);
    // Only when the profile value changes: a manual switch updates the profile too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.locale]);
}

function Sidebar({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = usePersistentFlag("campushub_sidebar_collapsed");

  const link = ({ href, key, icon: Icon }: (typeof ALL_ITEMS)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        title={collapsed ? t.nav[key] : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
        <Icon className={cn("size-[1.1rem]", active && "text-primary")} strokeWidth={1.9} />
        {!collapsed && t.nav[key]}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "glass fixed inset-y-3 left-3 z-30 hidden flex-col rounded-2xl transition-[width] duration-300 lg:flex",
        collapsed ? "w-[4.5rem]" : "w-60",
      )}
    >
      <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "px-4")}>
        <Link href="/dashboard" aria-label={t.nav.homeLink}>
          <Logo compact={collapsed} />
        </Link>
      </div>
      {!collapsed && (
        <p className="border-gold/30 bg-gold/8 text-gold-foreground mx-4 mb-2 rounded-lg border px-2.5 py-1.5 text-[0.7rem] font-semibold tracking-wide uppercase">
          {t.nav.studentSpace}
        </p>
      )}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2" aria-label={t.nav.main}>
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="text-muted-foreground px-3 pb-1 text-[0.68rem] font-semibold tracking-wider uppercase">
              {t.nav.mySpace}
            </p>
          )}
          {NAV_ITEMS.map(link)}
        </div>
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="text-muted-foreground px-3 pb-1 text-[0.68rem] font-semibold tracking-wider uppercase">
              {t.nav.account}
            </p>
          )}
          {link(PROFILE_ITEM)}
        </div>
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
  );
}

function TopBar({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  const current = ALL_ITEMS.find((item) => isActive(pathname, item.href));
  return (
    <header className="glass sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-x-0 border-t-0 px-4 sm:px-6 lg:top-3 lg:mx-6 lg:mt-3 lg:rounded-2xl lg:border-x lg:border-t lg:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/dashboard" aria-label={t.nav.homeLink} className="lg:hidden">
          <Logo />
        </Link>
        <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm lg:flex">
          <span className="text-muted-foreground">{t.nav.studentSpace}</span>
          {current && (
            <>
              <span aria-hidden className="text-border">
                /
              </span>
              <span className="font-semibold">{t.nav[current.key]}</span>
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <QuickAddMenu side="bottom" align="end">
          <Button size="sm" className="hidden lg:inline-flex">
            <Plus /> {t.common.add}
          </Button>
        </QuickAddMenu>
        <UserMenu />
      </div>
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  const item = ({ href, key, icon: Icon }: (typeof NAV_ITEMS)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-1 pt-2.5 pb-2 text-[0.68rem] font-semibold transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className="size-[1.3rem]" strokeWidth={active ? 2.3 : 1.9} />
        {t.nav[key]}
      </Link>
    );
  };
  return (
    <nav
      className="glass fixed inset-x-2 bottom-2 z-30 rounded-2xl pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label={t.nav.main}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-1">
        {item(NAV_ITEMS[0])}
        {item(NAV_ITEMS[1])}
        <div className="flex justify-center">
          <QuickAddMenu>
            <button
              type="button"
              aria-label={t.common.add}
              className="bg-primary text-primary-foreground ring-background -mt-5 mb-2 grid size-13 place-items-center rounded-2xl shadow-[0_10px_24px_-8px_var(--primary)] ring-4 transition-transform focus-visible:outline-none active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.4} />
            </button>
          </QuickAddMenu>
        </div>
        {item(NAV_ITEMS[2])}
        {item(NAV_ITEMS[3])}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed] = usePersistentFlag("campushub_sidebar_collapsed");
  useProfileLocale();

  return (
    <QuickAddProvider>
      <div
        className={cn(
          "min-h-dvh transition-[padding] duration-300",
          collapsed ? "lg:pl-[5.25rem]" : "lg:pl-[15.75rem]",
        )}
      >
        <Sidebar pathname={pathname} />
        <TopBar pathname={pathname} />
        <main className="animate-rise mx-auto w-full max-w-7xl px-4 pt-5 pb-32 sm:px-6 lg:px-6 lg:pt-6 lg:pb-10">
          {children}
        </main>
        <MobileNav pathname={pathname} />
      </div>
    </QuickAddProvider>
  );
}
