"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Footprints, Radius, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

// TULAY's app views. The rail navigates between the overview dashboard and the
// two maps. No auth menu / notifications -- there is no real auth, so we don't
// fake the chrome.
const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/pam", label: "Accessibility map", icon: Footprints },
  { href: "/gis-map", label: "Transit coverage", icon: Radius },
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
        href="/"
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

      <span className="nums select-none text-[9px] font-semibold tracking-widest text-muted-foreground/60">
        TULAY
      </span>
    </aside>
  );
}
