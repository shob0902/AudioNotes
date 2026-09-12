// A gallery whose cards slide sideways as you scroll down, with a plain scrolling row as fallback.
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
const GAP = 24;
// Pins a tall section and maps its scroll progress onto a horizontal shift of the card row.
export default function HorizontalScrollGallery({ items }) {
  const containerRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [itemWidth, setItemWidth] = useState(420);
  useEffect(() => {
    const updateWidth = () => setItemWidth(window.innerWidth < 640 ? 280 : 420);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const totalDistance = (items.length - 1) * (itemWidth + GAP);
  const x = useTransform(scrollYProgress, [0, 1], [0, -totalDistance]);
  if (reduceMotion) {
    return (
      <div className="scrollbar-thin -mx-1 flex gap-6 overflow-x-auto px-1 pb-4">
        {items.map((item) => (
          <GalleryCard key={item.number} item={item} width={itemWidth} />
        ))}
      </div>
    );
  }
  return (
    <div ref={containerRef} style={{ height: `${items.length * 60}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div className="flex" style={{ x, gap: GAP }}>
          {items.map((item) => (
            <GalleryCard key={item.number} item={item} width={itemWidth} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
// One numbered card in the gallery, scrollable on its own if the content is tall.
function GalleryCard({ item, width }) {
  return (
    <div
      className="scrollbar-thin flex h-[70vh] max-h-[640px] shrink-0 flex-col overflow-y-auto rounded-2xl border border-glass-border bg-surface p-6 shadow-soft sm:p-7"
      style={{ width }}
    >
      <span className="font-mono text-xs font-semibold text-primary">
        {String(item.number).padStart(2, "0")}
      </span>
      <h2 className="mt-2 text-lg font-bold text-ink">{item.title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink">{item.content}</div>
    </div>
  );
}
