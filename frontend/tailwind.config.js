// Tailwind theme for the dark teal design: colors, shadows, fonts and animations used app-wide.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        app: "#050505",
        sidebar: "#0F1419",
        surface: "#1A2428",
        "surface-hover": "#1F2A30",
        elevated: "#252D33",
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
        "glass-border": "rgba(20, 184, 166, 0.15)",
      },
      fontFamily: {
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
        soft: "4px 4px 12px rgba(0, 0, 0, 0.3), -2px -2px 8px rgba(255, 255, 255, 0.08)",
        "soft-lg": "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(20, 184, 166, 0.15)",
        "soft-hover":
          "0 0 20px rgba(20, 184, 166, 0.25), 4px 4px 12px rgba(0, 0, 0, 0.3), -2px -2px 8px rgba(255, 255, 255, 0.08)",
        inset: "inset 4px 4px 12px rgba(0, 0, 0, 0.3), inset -2px -2px 8px rgba(255, 255, 255, 0.05)",
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
