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
  title: {
    default: "Dicteren.ai · Lokaal dicteren voor Nederlandse gebruikers",
    template: "%s · Dicteren.ai",
  },
  description:
    "Spreek je gedachte uit en Dicteren.ai zet het direct om naar tekst, lokaal op je computer, in elke app. Werkt fantastisch met ChatGPT, Claude, Copilot en Gemini.",
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
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: "Dicteren.ai",
    title: "Dicteren.ai · Lokaal dicteren voor Nederlandse gebruikers",
    description:
      "Betere AI-resultaten beginnen met meer context. Spreek je gedachte uit en zet hem direct om naar tekst.",
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
