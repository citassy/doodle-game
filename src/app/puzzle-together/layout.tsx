import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Puzzle Together",
  description: "Build a jigsaw together, from anywhere.",
};

export default function PuzzleTogetherLayout({ children }: { children: React.ReactNode }) {
  return <div className="pt min-h-screen flex flex-col">{children}</div>;
}
