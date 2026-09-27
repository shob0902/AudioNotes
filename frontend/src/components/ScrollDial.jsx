// The rotating "SCROLL DOWN •" dial: circular text spinning around a static arrow.
import { DownArrowIcon } from "./icons.jsx";
import styles from "./ScrollDial.module.css";
// Renders the spinning text ring as a link that jumps to the given anchor.
export default function ScrollDial({ href, label = "Scroll down" }) {
  return (
    <a href={href} className={styles.dial} aria-label={label}>
      <svg viewBox="0 0 100 100" className={styles.ring} aria-hidden="true">
        <defs>
          <path id="scroll-dial-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text className={styles.text}>
          <textPath href="#scroll-dial-circle">Scroll down • Scroll down • Scroll down •</textPath>
        </text>
      </svg>
      <DownArrowIcon className={styles.arrow} />
    </a>
  );
}
