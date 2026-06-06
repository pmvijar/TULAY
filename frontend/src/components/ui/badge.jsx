import * as React from "react";
import { cn } from "@/lib/utils";
import { scoreColor, scoreDisplay, scoreLabel } from "@/lib/scoring";

// Pill badge. Functional color shown as a soft tint + solid text. No side stripes.
const TONES = {
  neutral: "bg-surface-muted text-muted-foreground border border-border",
  accent: "bg-accent-soft text-accent border border-transparent",
  success:
    "text-success border border-transparent [background:oklch(0.62_0.14_152_/_0.12)]",
  warning:
    "text-warning border border-transparent [background:oklch(0.74_0.15_78_/_0.16)]",
  danger:
    "text-danger border border-transparent [background:oklch(0.585_0.20_27_/_0.12)]",
};

export function Badge({ tone = "neutral", className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-5",
        TONES[tone] || TONES.neutral,
        className
      )}
      {...props}
    />
  );
}

// Shared status language. status -> tone.
const STATUS_TONE = {
  adequate: "success",
  good: "success",
  ok: "success",
  moderate: "warning",
  warning: "warning",
  pending: "warning",
  critical: "danger",
  high: "danger",
  error: "danger",
  offline: "neutral",
  live: "accent",
};

export function StatusBadge({ status = "neutral", label, className }) {
  const key = String(status).toLowerCase();
  const tone = STATUS_TONE[key] || "neutral";
  return (
    <Badge tone={tone} className={className}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: "currentColor" }}
      />
      {label || status}
    </Badge>
  );
}

// The shared way a priority score is shown: mono number on a choropleth-tinted pill.
export function ScoreBadge({ score, showLabel = false, className }) {
  const color = scoreColor(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
        className
      )}
      style={{
        background: `color-mix(in oklch, ${color} 18%, transparent)`,
        color,
      }}
    >
      <span className="nums text-[13px] font-semibold leading-5">
        {scoreDisplay(score)}
      </span>
      {showLabel && (
        <span className="text-[11px] font-medium capitalize opacity-80">
          {scoreLabel(score)}
        </span>
      )}
    </span>
  );
}
