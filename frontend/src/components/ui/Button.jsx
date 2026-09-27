// The shared pill button primitive; renders a router Link or plain anchor when given `to` or `href`.
import { forwardRef } from "react";
import { Link } from "react-router-dom";
import styles from "./Button.module.css";
// Picks the element to render and applies the variant and size classes.
const Button = forwardRef(function Button(
  { variant = "primary", size = "md", to, href, type = "button", block = false, className = "", children, ...props },
  ref
) {
  const classes = [styles.button, styles[variant], styles[size], block ? styles.block : "", className]
    .filter(Boolean)
    .join(" ");
  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button ref={ref} type={type} className={classes} {...props}>
      {children}
    </button>
  );
});
export default Button;
