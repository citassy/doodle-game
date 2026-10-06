import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Draw n' Guess",
  description: "Draw it. Guess it. Laugh at it.",
};

export default function DrawNGuessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
