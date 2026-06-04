/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
        },
        foreground: "var(--foreground)",
        "muted-foreground": "var(--muted-foreground)",
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          fg: "var(--accent-fg)",
          soft: "var(--accent-soft)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        priority: {
          0: "var(--p0)",
          1: "var(--p1)",
          2: "var(--p2)",
          3: "var(--p3)",
          4: "var(--p4)",
          5: "var(--p5)",
        },
        /* shadcn shims */
        card: { DEFAULT: "var(--surface)", foreground: "var(--foreground)" },
        popover: { DEFAULT: "var(--surface)", foreground: "var(--foreground)" },
        primary: { DEFAULT: "var(--accent)", foreground: "var(--accent-fg)" },
        secondary: {
          DEFAULT: "var(--surface-muted)",
          foreground: "var(--foreground)",
        },
        muted: {
          DEFAULT: "var(--surface-muted)",
          foreground: "var(--muted-foreground)",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "var(--accent-fg)",
        },
        input: "var(--border)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        md: "var(--radius-control)",
        sm: "calc(var(--radius-control) - 3px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel:
          "0 1px 2px oklch(0.4 0.03 264 / 0.04), 0 12px 28px -22px oklch(0.4 0.03 264 / 0.5)",
        glass: "var(--glass-shadow)",
      },
      transitionTimingFunction: {
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "fade-up": "fade-up 0.22s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.18s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
