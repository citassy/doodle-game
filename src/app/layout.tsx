import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_TAGLINE,
};

// The fonts load in the visitor's browser instead of at build time, so a slow or blocked
// font download can never fail a deploy. The same CSS variables as before point at them.
const FONTS =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Fredoka:wght@400;500;600&family=Inter:wght@100..900&display=swap";

const fontVars = {
  "--font-sans": "'Inter'",
  "--font-hand": "'Caveat'",
  "--font-fredoka": "'Fredoka'",
} as React.CSSProperties;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" style={fontVars}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}