import * as React from "react";
import { cn } from "@/lib/utils";

// Floating panel that sits directly over the Leaflet map. This is the one
// intentional use of glass in TULAY (see DESIGN.md). Not for general layout.
export const GlassPanel = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("glass rounded-lg animate-fade-up", className)}
      {...props}
    >
      {children}
    </div>
  )
);
GlassPanel.displayName = "GlassPanel";

// Solid resting panel for on-canvas content.
export const Panel = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("panel", className)} {...props}>
      {children}
    </div>
  )
);
Panel.displayName = "Panel";
