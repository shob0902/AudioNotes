// The action items card, where each item can be ticked off and the state is kept in this browser.
import { motion } from "framer-motion";
import Card from "./ui/Card.jsx";
import AnimatedCheck from "./ui/AnimatedCheck.jsx";
import { EmptyStateSmall } from "./EmptyStateSmall.jsx";
import { useLocalStorageSet } from "../hooks/useLocalStorageSet.js";
// Renders each item as a toggle button and remembers which ones are checked for this note.
export default function ActionItems({ noteId, items }) {
  const { has, toggle } = useLocalStorageSet(`audio-notes:checked-items:${noteId}`);
  return (
    <Card variant="elevated" className="p-6">
      <h2 className="text-base font-bold text-ink">Action Items</h2>
      {items && items.length > 0 ? (
        <ul className="mt-4 space-y-2.5">
          {items.map((item, index) => {
            const key = String(index);
            const checked = has(key);
            return (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3, ease: "easeOut" }}
              >
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  aria-pressed={checked}
                  className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 hover:bg-app"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-200 ${
                      checked ? "border-primary bg-primary text-white" : "border-primary/30 text-transparent"
                    }`}
                  >
                    {checked && <AnimatedCheck size={12} />}
                  </span>
                  <span
                    className={`text-sm leading-relaxed transition-colors duration-200 ${
                      checked ? "text-muted line-through decoration-primary/50" : "text-ink"
                    }`}
                  >
                    {item}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <EmptyStateSmall text="No action items identified." />
      )}
    </Card>
  );
}
