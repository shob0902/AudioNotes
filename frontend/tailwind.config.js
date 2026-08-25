/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // "Nearly Black & Teal" — dark neumorphism, single source of truth
        // referenced by every component (bg-app, text-ink, etc.) instead of
        // scattering raw hex values through the codebase. Four depth
        // levels of nearly-black surfaces, teal as the only accent color
        // (per the spec: "use teal for ALL interactive elements, no other
        // accent colors").
        app: "#050505", // Level 0 — page background
        sidebar: "#0F1419", // Level 1 — sidebar / nav surfaces
        surface: "#1A2428", // Level 2 — cards, buttons, inputs (default)
        "surface-hover": "#1F2A30", // card hover background
        elevated: "#252D33", // Level 3 — inputs, secondary buttons, active nav
        primary: {
          DEFAULT: "#0D9B8C",
          hover: "#14B8A6",
          light: "rgba(20, 184, 166, 0.1)",
        },
        secondary: "#4ECDC4",
        accent: "#2DD4BF",
        ink: "#FFFFFF",
        muted: "#9CA3AF",
        success: "#10B981",
        warning: "#FFA500",
        danger: "#EF4444",
        // Teal border at 15% — neumorphic panels get their edge definition
        // from this rather than a glass blur/translucency effect.
        "glass-border": "rgba(20, 184, 166, 0.15)",
      },
      fontFamily: {
        // System font stack, not a web font — loads instantly, reads as
        // native, and is highly legible on dark backgrounds (the whole
        // reason this theme's spec calls for it over something like Inter).
        sans: [
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Tahoma",
          "Geneva",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      boxShadow: {
        // Dark neumorphism's signature dual shadow: a dark shadow toward
        // the bottom-right (depth) plus a faint light highlight toward the
        // top-left (a hint of light hitting the raised surface) — see
        // Card.jsx for how surfaces use these.
        soft: "4px 4px 12px rgba(0, 0, 0, 0.3), -2px -2px 8px rgba(255, 255, 255, 0.08)",
        "soft-lg": "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(20, 184, 166, 0.15)",
        "soft-hover":
          "0 0 20px rgba(20, 184, 166, 0.25), 4px 4px 12px rgba(0, 0, 0, 0.3), -2px -2px 8px rgba(255, 255, 255, 0.08)",
        inset: "inset 4px 4px 12px rgba(0, 0, 0, 0.3), inset -2px -2px 8px rgba(255, 255, 255, 0.05)",
        // Pressed neumorphic state plus the teal accent glow — the active
        // tab/nav-item look (sidebar NavList, Tabs). Same dual inset shadow
        // as `inset`, with a soft outer teal halo layered on top.
        "inset-glow": "inset 4px 4px 12px rgba(0, 0, 0, 0.3), inset -2px -2px 8px rgba(255, 255, 255, 0.05), 0 0 12px rgba(20, 184, 166, 0.2)",
        "glow-cyan": "0 0 0 3px rgba(20, 184, 166, 0.3)",
      },
      transitionTimingFunction: {
        bouncy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(20, 184, 166, 0.2), 4px 4px 12px rgba(0, 0, 0, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(20, 184, 166, 0.4), 4px 4px 12px rgba(0, 0, 0, 0.3)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 800ms ease-out both",
        float: "float 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in": "slide-in 0.6s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
