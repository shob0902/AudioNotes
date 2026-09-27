// The 38px round icon button, used for toggles like favorite and for small actions like delete.
import { useState } from "react";
import styles from "./IconButton.module.css";
// Renders the icon-only button and plays a pop animation each time a toggle is pressed.
export default function IconButton({ label, pressed, onClick, className = "", children, ...props }) {
  const [popKey, setPopKey] = useState(0);
  const isToggle = typeof pressed === "boolean";
  const handleClick = (event) => {
    if (isToggle) setPopKey((k) => k + 1);
    onClick?.(event);
  };
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isToggle ? pressed : undefined}
      onClick={handleClick}
      className={`${styles.iconButton} ${pressed ? styles.active : ""} ${className}`}
      {...props}
    >
      <span key={popKey} className={popKey ? styles.pop : undefined}>
        {children}
      </span>
    </button>
  );
}
