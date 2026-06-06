import * as React from "react";
import { cn } from "@/lib/utils";

// label + big mono number + optional delta. Used in stat strips, sized with
// variety -- not as an identical hero-metric grid.
export function StatTile({
  label,
  value,
  unit,
  delta,
  hint,
  className,
  size = "md",
}) {
  const valueSize =
    size === "lg" ? "text-[33px]" : size === "sm" ? "text-xl" : "text-[26px]";
  const up = typeof delta === "number" ? delta >= 0 : null;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("nums font-bold leading-none", valueSize)}>
          {value}
        </span>
        {unit && (
          <span className="text-[13px] font-medium text-muted-foreground">
            {unit}
          </span>
        )}
        {delta != null && (
          <span
            className={cn(
              "nums ml-0.5 text-[12px] font-semibold",
              up ? "text-success" : "text-danger"
            )}
          >
            {up ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
