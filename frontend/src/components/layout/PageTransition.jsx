// The fade-and-rise animation wrapper applied to every routed page.
import { motion } from "framer-motion";
// Fades its children in on entry and back out on exit as the route changes.
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
