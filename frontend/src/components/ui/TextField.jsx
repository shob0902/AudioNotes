// A labelled pill text input: mono label above a 46px white pill field.
import styles from "./TextField.module.css";
// Renders the label and input, forwarding every other prop to the <input>.
export default function TextField({ id, label, hint, ...props }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input id={id} className={styles.input} {...props} />
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
