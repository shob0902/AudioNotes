import { motion } from "framer-motion";

import Card from "./ui/Card.jsx";
import { EmptyStateSmall } from "./EmptyStateSmall.jsx";

export default function TopicChips({ topics }) {
  return (
    <Card variant="elevated" className="p-6">
      <h2 className="text-base font-bold text-ink">Topics</h2>
      {topics && topics.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {topics.map((topic, index) => (
            <motion.span
              key={topic}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.06, duration: 0.25, ease: "easeOut" }}
              className="rounded-full bg-secondary/10 px-3.5 py-1.5 text-sm font-medium text-secondary"
            >
              {topic}
            </motion.span>
          ))}
        </div>
      ) : (
        <EmptyStateSmall text="No topics identified." />
      )}
    </Card>
  );
}
