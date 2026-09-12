// A single dashboard statistic tile with an icon and an animated number.
import { motion } from "framer-motion";
import Card from "./ui/Card.jsx";
import { useCountUp } from "../hooks/useCountUp.js";
// Fades the tile in and counts the value up from zero.
export default function StatsCard({ icon, label, value, suffix = "", delayMs = 0 }) {
  const display = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: delayMs / 1000, ease: "easeOut" }}
    >
      <Card className="p-5">
        <div className="flex items-center gap-2 text-muted">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
            {icon}
          </span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums text-ink">
          {display}
          {suffix}
        </p>
      </Card>
    </motion.div>
  );
}
