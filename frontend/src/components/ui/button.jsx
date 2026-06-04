import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out-quint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // primary: solid accent, no gradient
        default:
          "rounded-md bg-accent text-accent-fg shadow-sm hover:bg-accent-hover active:scale-[0.98]",
        // quiet: subtle surface with border
        quiet:
          "rounded-md border border-border bg-surface text-foreground hover:bg-surface-muted hover:border-border-strong",
        outline:
          "rounded-md border border-border bg-transparent text-foreground hover:bg-surface-muted",
        ghost:
          "rounded-md text-foreground hover:bg-surface-muted hover:text-foreground",
        destructive:
          "rounded-md bg-danger text-accent-fg shadow-sm hover:opacity-90 active:scale-[0.98]",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-8 px-3 text-[13px] rounded-md",
        lg: "h-11 px-6 text-sm rounded-md",
        icon: "h-9 w-9 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
