"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Footprints,
  Radius,
  Sparkles,
  HelpCircle,
  Bell,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pam", label: "Accessibility map", icon: Footprints },
  { href: "/gis-map", label: "Transit coverage", icon: Radius },
  { href: "/recommendations", label: "Recommendations", icon: Sparkles },
];

function RailLink({ href, label, icon: Icon, active }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center rounded-[12px] transition-all duration-200 ease-out-quint",
        active
          ? "bg-accent text-accent-fg shadow-sm"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.9} />
      <span className="pointer-events-none absolute left-[calc(100%+10px)] z-50 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-[12px] font-medium text-foreground opacity-0 shadow-panel transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </Link>
  );
}

export function Rail() {
  const pathname = usePathname() || "";
  return (
    <aside className="z-40 flex h-screen w-16 shrink-0 flex-col items-center border-r border-border bg-surface/80 py-4 backdrop-blur-sm">
      <Link
        href="/dashboard"
        aria-label="TULAY home"
        className="mb-5 flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent text-accent-fg shadow-sm"
      >
        <Footprints className="h-5 w-5" strokeWidth={2.2} />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {NAV.map((item) => (
          <RailLink
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      <div className="flex flex-col items-center gap-1.5">
        <RailLink href="#help" label="Help" icon={HelpCircle} active={false} />
        <RailLink
          href="#alerts"
          label="Notifications"
          icon={Bell}
          active={false}
        />
        <Link
          href="/"
          title="Sign out"
          aria-label="Sign out"
          className="flex h-11 w-11 items-center justify-center rounded-[12px] text-muted-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-danger"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </Link>
      </div>
    </aside>
  );
}
