import type { ReactNode } from "react";
import styles from "./settings-group.module.css";

interface SettingsGroupProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsGroup({ title, children, className }: SettingsGroupProps) {
  return (
    <div className={`${styles.wrapper}${className ? ` ${className}` : ""}`}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.card}>{children}</div>
    </div>
  );
}

interface SettingRowProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <div className={styles.rowTitle}>{title}</div>
        {description && <div className={styles.rowDesc}>{description}</div>}
      </div>
      {children && <div className={styles.rowAction}>{children}</div>}
    </div>
  );
}
