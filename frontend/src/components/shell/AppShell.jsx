"use client";

import { Rail } from "./Rail";
import { cn } from "@/lib/utils";

// Persistent app shell: fixed icon rail + content column. Pages render their
// own TopBar inside `children` so map pages can go full-bleed while data pages
// use the tinted canvas.
export function AppShell({ children, className, scroll = false }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Rail />
      <main
        className={cn(
          "relative flex h-screen min-w-0 flex-1 flex-col",
          scroll ? "overflow-y-auto" : "overflow-hidden",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
