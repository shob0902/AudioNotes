import { motion } from "framer-motion";

import Card from "./ui/Card.jsx";
import CopyButton from "./CopyButton.jsx";
import { SparkleIcon } from "./icons.jsx";

export default function SummaryCard({ summary }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
      <Card variant="elevated-lg" className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
              <SparkleIcon className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-ink">TL;DR</h2>
          </div>
          <CopyButton text={summary.summary} label="Copy" toastMessage="Summary copied to clipboard" />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-3 text-[15px] leading-relaxed text-ink"
        >
          {summary.summary}
        </motion.p>
      </Card>
    </motion.div>
  );
}
