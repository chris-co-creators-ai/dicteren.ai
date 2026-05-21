import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  height?: number;
  href?: string;
  className?: string;
};

export function Logo({ height = 36, href = "/", className }: LogoProps) {
  const img = (
    <Image
      src="/branding/logo-horizontal.png"
      alt="Dicteren.ai"
      height={height}
      width={Math.round(height * 4.2)}
      priority
      className={className}
      style={{ height, width: "auto", display: "block" }}
    />
  );

  if (href === "") return img;
  return (
    <Link href={href} aria-label="Dicteren.ai — naar homepage">
      {img}
    </Link>
  );
}

type LogoIconProps = {
  size?: number;
  className?: string;
  alt?: string;
};

export function LogoIcon({ size = 40, className, alt = "" }: LogoIconProps) {
  return (
    <Image
      src="/branding/logo-icon.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
