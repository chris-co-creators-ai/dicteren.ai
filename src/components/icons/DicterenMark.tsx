import React from "react";
import iconOnlyMaster from "@/assets/branding/icon-only-master.png";

const DicterenMark = ({
  width,
  height,
  className,
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
}) => (
  <img
    src={iconOnlyMaster}
    alt="Dicteren.ai mark"
    width={width ?? 24}
    height={height ?? 24}
    className={`object-contain ${className ?? ""}`}
  />
);

export default DicterenMark;
