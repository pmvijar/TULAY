"use client";

import { cn } from "@/lib/utils";

// Contextual per-page top bar. Title + optional breadcrumb / subtitle on the
// left, actions on the right. Sits inside the content column, above the page.
export function TopBar({
  title,
  subtitle,
  breadcrumb,
  children,
  className,
  bordered = true,
}) {
  return (
    <header
      className={cn(
        "flex min-h-[56px] items-center justify-between gap-4 px-6 py-3",
        bordered && "border-b border-border bg-surface/70 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        {breadcrumb}
        <h1 className="truncate text-[15px] font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-[12px] text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </header>
  );
}
