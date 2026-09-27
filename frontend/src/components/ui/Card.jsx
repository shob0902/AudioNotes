// The square, 2px-bordered panel that content blocks sit on.
import { forwardRef } from "react";
import styles from "./Card.module.css";
// Renders a white (or inverted black) panel; `lift` adds the hover lift into a hard shadow.
const Card = forwardRef(function Card(
  { variant = "white", lift = false, shadow = false, className = "", as: Tag = "div", children, ...props },
  ref
) {
  const classes = [styles.card, styles[variant], lift ? styles.lift : "", shadow ? styles.shadow : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag ref={ref} className={classes} {...props}>
      {children}
    </Tag>
  );
});
export default Card;
