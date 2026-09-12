// The vertical flow diagram on the architecture page showing a note's journey through the system.
import { motion } from "framer-motion";
const NODES = [
  { label: "Browser", detail: "React + Vite + Tailwind" },
  { label: "FastAPI", detail: "Validate → Store → Schedule → Respond" },
  { label: "Object Storage", detail: "R2 / Supabase / S3-compatible" },
  { label: "PostgreSQL", detail: "Note metadata, transcript, summary" },
  { label: "Background Task", detail: "In-process (FastAPI BackgroundTasks)" },
  { label: "Gnani ASR", detail: "Chunked speech-to-text" },
  { label: "Groq LLM", detail: "Structured summarization" },
  { label: "PostgreSQL", detail: "Final transcript + summary saved" },
];
const SYNC_COUNT = 2;
// The small downward arrow drawn between two nodes.
function Arrow() {
  return (
    <div className="flex justify-center py-1">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-primary/30">
        <path d="M12 4v14m0 0-5-5m5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
// Renders the nodes in order as they scroll into view, colouring the background ones differently.
export default function ArchitectureDiagram() {
  return (
    <div className="mx-auto max-w-sm">
      {NODES.map((node, index) => (
        <div key={`${node.label}-${index}`}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`rounded-xl px-4 py-3 text-center shadow-inset ${
              index < SYNC_COUNT ? "bg-app" : "bg-primary-light"
            }`}
          >
            <p className="text-sm font-semibold text-ink">{node.label}</p>
            <p className="text-xs text-muted">{node.detail}</p>
          </motion.div>
          {index < NODES.length - 1 && <Arrow />}
        </div>
      ))}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-app shadow-inset" /> Synchronous (request/response)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-light" /> Background (in-process task)
        </span>
      </div>
    </div>
  );
}
