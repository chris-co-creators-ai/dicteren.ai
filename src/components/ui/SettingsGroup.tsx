import React from "react";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div style={{ marginBottom: 22 }}>
      {title && (
        <div style={{ padding: "0 4px 8px" }}>
          <h2
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}
      <div
        className="dc-settings-group"
        style={{
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-sm)",
          overflow: "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
};
