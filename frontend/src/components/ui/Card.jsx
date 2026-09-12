// The neumorphic card primitive that every content block sits on.
import { forwardRef } from "react";
const VARIANTS = {
  flat: "bg-transparent",
  surface: "bg-surface border border-glass-border",
  elevated: "bg-surface border border-glass-border shadow-soft",
  "elevated-lg": "bg-surface border border-glass-border shadow-soft-lg",
  inset: "bg-elevated border border-glass-border shadow-inset",
};
const HOVERABLE = new Set(["elevated", "elevated-lg"]);
// Renders the card, adding the lift-and-glow hover treatment only to the raised variants.
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
