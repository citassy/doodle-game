"use client";

import { useEffect, useState } from "react";

interface Props {
  deadline: string | null;
  durationSeconds: number;
  size?: number;
}

export function CountdownRing({ deadline, durationSeconds, size = 28 }: Props) {
  const [remaining, setRemaining] = useState(1);

  
  useEffect(() => {
    if (!deadline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external prop (deadline going null means "timer off"), not derived render state
      setRemaining(0);
      return;
    }
    const deadlineMs = new Date(deadline).getTime();
    
    function tick() {
      const msLeft = deadlineMs - Date.now();
      setRemaining(Math.max(0, Math.min(1, msLeft / (durationSeconds * 1000))));
    }

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [deadline, durationSeconds]);

  const radius = size / 2 - 3.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - remaining);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-muted)" strokeWidth={3.5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f0997b"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.1s linear" }}
      />
    </svg>
  );
}