import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ErrorToast } from "@/components/shared/error-toast";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://dicteren.ai",
  ),
  title: {
    default: "Dicteren.ai · Lokaal dicteren voor Nederlandse gebruikers",
    template: "%s · Dicteren.ai",
  },
  description:
    "Spreek je gedachte uit en Dicteren.ai zet het direct om naar tekst — lokaal op je computer, in elke app. Werkt met ChatGPT, Claude, Copilot en Gemini.",
  applicationName: "Dicteren.ai",
  authors: [{ name: "Dicteren.ai" }],
  generator: "Next.js",
  keywords: [
    "dicteren",
    "spraakherkenning",
    "lokaal dicteren",
    "Nederlandse dictate",
    "AI prompts",
    "dyslexie",
    "Mac dicteren",
    "Windows dicteren",
  ],
  icons: {
    icon: [
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-64.png", type: "image/png", sizes: "64x64" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon-32.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: "Dicteren.ai",
    title: "Dicteren.ai · Lokaal dicteren voor Nederlandse gebruikers",
    description:
      "Betere AI-resultaten beginnen met meer context. Spreek je gedachte uit en zet hem direct om naar tekst.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Dicteren.ai — lokaal dicteren voor Nederlandse gebruikers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dicteren.ai · Lokaal dicteren voor Nederlandse gebruikers",
    description:
      "Spreek je gedachte uit en zet hem direct om naar tekst, lokaal op je computer.",
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${interTight.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <Toaster richColors closeButton position="top-center" />
        <Suspense fallback={null}>
          <ErrorToast />
        </Suspense>
      </body>
    </html>
  );
}
