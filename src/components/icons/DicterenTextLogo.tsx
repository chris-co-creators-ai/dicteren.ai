import React from "react";
import logoHorizontalLockup from "@/assets/branding/logo-horizontal-lockup-transparent.png";

/* eslint-disable i18next/no-literal-string */

const DicterenTextLogo = ({
  width,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) => (
  <img
    src={logoHorizontalLockup}
    alt="Dicteren.ai"
    className={`${className ?? ""}`}
    style={{ width: width ?? 160, height: "auto" }}
  />
);

export default DicterenTextLogo;
