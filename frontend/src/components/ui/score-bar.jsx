import * as React from "react";
import { cn } from "@/lib/utils";
import { qualityColor, qualityLabel, scoreDisplay } from "@/lib/scoring";

// Horizontal sub-score row: label + track + mono value. The shared way the
// accessibility / safety / mobility sub-scores are shown in a drill-in.
export function ScoreBar({ label, score, className }) {
  const color = qualityColor(score);
  const pct = scoreDisplay(score);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="nums text-[15px] font-semibold" style={{ color }}>
            {pct}
          </span>
          <span className="text-[11px] capitalize text-muted-foreground">
            {qualityLabel(score)}
          </span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out-quint"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
