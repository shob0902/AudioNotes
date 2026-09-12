// The pill-style tab switcher, with a sliding highlight behind the active tab.
import { motion } from "framer-motion";
// Renders one button per tab and reports the chosen id back through onChange.
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-2xl border border-glass-border bg-elevated p-1 shadow-inset">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className="relative rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors duration-150"
          >
            {isActive && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 rounded-xl bg-primary shadow-soft"
              />
            )}
            <span className={`relative z-10 ${isActive ? "text-white" : "text-muted hover:text-ink"}`}>
              {tab.label}
              {typeof tab.count === "number" && (
                <span className={`ml-1.5 text-xs ${isActive ? "text-white/80" : "text-muted"}`}>{tab.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
