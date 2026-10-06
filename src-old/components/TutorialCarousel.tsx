"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ChevronIcons";

const SLIDES = [
  {
    image: "/tutorial/part1.png",
    title: "round 1: doodle fast",
    description:
      "Each round you will get a word. Draw it quickly, because the next word will come soon! Note: in manual mode, you have to click the Next button to start drawing the next word. Don't fall behind!"
  },
  {
    image: "/tutorial/part2.png",
    title: "round 2: guess the doodles",
    description:
      "you'll see your own old doodles one at a time — guess what they were. once everyone's answered, check the results to see who got it right.",
  },
  {
    image: "/tutorial/results.png",
    title: "final results",
    description: "after all 20 rounds, see the final scoreboard and browse through everyone's complete doodle gallery.",
  },
];

export function TutorialCarousel() {
  const [index, setIndex] = useState(0);

  function go(delta: number) {
    setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);
  }

  const slide = SLIDES[index];

  return (
    <div className="bg-paper border-2 border-ink rounded-xl p-4 flex flex-col">
      {/* Fixed-height frame so every slide occupies identical space,
          regardless of the exact pixel size of each screenshot. */}
      <div className="flex-1 min-h-72 flex items-center justify-center mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- static tutorial screenshots, no need for next/image optimization here */}
        <img
          src={slide.image}
          alt={slide.title}
          className="max-h-full max-w-full object-contain rounded-lg"
        />
      </div>

      <p className="font-hand text-4xl font-bold text-center mb-2">{slide.title}</p>
      <p className="text-base text-ink/60 text-center leading-relaxed mb-3">{slide.description}</p>
      <div className="flex items-center justify-between mt-auto">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous tip"
          className="w-8 h-8 rounded-full border-[1.5px] border-ink flex items-center justify-center hover:bg-ink/5"
        >
          <ChevronLeftIcon />
        </button>
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to tip ${i + 1}`}
              className={`w-2 h-2 rounded-full ${i === index ? "bg-ink" : "bg-border-muted"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next tip"
          className="w-8 h-8 rounded-full border-[1.5px] border-ink flex items-center justify-center hover:bg-ink/5"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}