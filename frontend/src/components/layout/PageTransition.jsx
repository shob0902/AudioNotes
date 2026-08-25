import { motion } from "framer-motion";

/** Wraps each route's content in a consistent fade + slight upward motion
 * (Level 3 "experience" animation, ~350ms) — see App.jsx for how this is
 * keyed per-route via AnimatePresence. */
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
