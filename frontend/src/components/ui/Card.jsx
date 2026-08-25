import { forwardRef } from "react";

// Nearly Black & Teal: dark neumorphism — solid, opaque surfaces (no
// glassmorphism per this theme's spec: "Don't use glassmorphism
// (neumorphism only)"). Depth comes from the dual dark/light box-shadow
// (see tailwind.config.js's shadow.soft/soft-lg/inset) plus a subtle teal
// border, not from translucency or blur.
const VARIANTS = {
  flat: "bg-transparent",
  surface: "bg-surface border border-glass-border",
  elevated: "bg-surface border border-glass-border shadow-soft",
  "elevated-lg": "bg-surface border border-glass-border shadow-soft-lg",
  inset: "bg-elevated border border-glass-border shadow-inset",
};

// Elevated variants lift, glow, and lighten on hover — flat/inset stay put
// (a "pressed in" surface lifting on hover would read as contradictory).
const HOVERABLE = new Set(["elevated", "elevated-lg"]);

/** Neumorphic card primitive — the base every content block sits on. */
const Card = forwardRef(function Card({ variant = "elevated", className = "", children, ...props }, ref) {
  const hoverClasses = HOVERABLE.has(variant)
    ? "transition-all duration-300 ease-bouncy hover:-translate-y-1.5 hover:bg-surface-hover hover:border-primary/20 hover:shadow-soft-hover"
    : "transition-colors duration-300";
  return (
    <div ref={ref} className={`rounded-2xl ${VARIANTS[variant]} ${hoverClasses} ${className}`} {...props}>
      {children}
    </div>
  );
});

export default Card;
