// The shared button primitive, so hover and press behaviour is the same everywhere.
import { motion } from "framer-motion";
const VARIANTS = {
  primary: "bg-primary text-white shadow-soft hover:bg-primary-hover hover:shadow-soft-hover",
  secondary: "bg-elevated border border-glass-border text-primary shadow-soft hover:bg-surface-hover hover:border-primary/50 hover:text-accent",
  ghost: "bg-transparent text-muted hover:bg-primary-light hover:text-ink",
  danger: "bg-elevated border border-glass-border text-danger shadow-soft hover:bg-danger/10",
};
const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};
// Renders a button in the chosen variant and size, with the lift and press animations attached.
export default function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
