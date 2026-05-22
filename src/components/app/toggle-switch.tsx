"use client";

import { useState } from "react";
import styles from "./toggle-switch.module.css";

interface ToggleSwitchProps {
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

export function ToggleSwitch({
  defaultChecked = false,
  checked,
  onChange,
  disabled = false,
  label,
}: ToggleSwitchProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internal;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-on={on}
      disabled={disabled}
      onClick={() => {
        const next = !on;
        if (!isControlled) setInternal(next);
        onChange?.(next);
      }}
      className={styles.toggle}
    />
  );
}
