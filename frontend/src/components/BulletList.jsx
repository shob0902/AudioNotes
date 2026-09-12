// A ticked bullet list card, shared by both the Key Points and Decisions sections.
import { motion } from "framer-motion";
import Card from "./ui/Card.jsx";
import AnimatedCheck from "./ui/AnimatedCheck.jsx";
import { EmptyStateSmall } from "./EmptyStateSmall.jsx";
// Staggers each bullet in with its own drawn tick, or shows the empty line when the list is empty.
export default function BulletList({ title, items, emptyText }) {
  return (
    <Card variant="elevated" className="p-6">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {items && items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items.map((item, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.09, duration: 0.3, ease: "easeOut" }}
              className="flex items-start gap-2.5 text-sm text-ink"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <AnimatedCheck size={12} delay={index * 0.09 + 0.15} />
              </span>
              <span className="leading-relaxed">{item}</span>
            </motion.li>
          ))}
        </ul>
      ) : (
        <EmptyStateSmall text={emptyText} />
      )}
    </Card>
  );
}
