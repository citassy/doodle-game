import { PATHS } from "@/components/puzzle/LandingPieces";

/* ---------- Draw n' Guess: two game screens drawn in code (no image) ---------- */

function Screen({ word, label, children, next }: { word: string; label: string; children: React.ReactNode; next?: boolean }) {
  const hand = { fontFamily: "var(--font-hand), Caveat, cursive" } as const;
  const sans = { fontFamily: "var(--font-sans), system-ui, sans-serif" } as const;
  return (
    <>
      <rect x="0.6" y="0.6" width="168.8" height="228.8" rx="16" fill="#FDFCF9" stroke="#1A1A1A" strokeWidth="1.3" />
      <circle cx="20" cy="22" r="7" fill="none" stroke="#E8E4DC" strokeWidth="2.6" />
      <circle
        cx="20"
        cy="22"
        r="7"
        fill="none"
        stroke="#F0997B"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="30 44"
        transform="rotate(-90 20 22)"
      />
      <path d="M146 18.5h2.6l3.4-2.6v8.2l-3.4-2.6H146z" fill="none" stroke="#9A968C" strokeWidth="1.1" strokeLinejoin="round" />
      <text x="34" y="20" fontSize="7.5" fill="#9A968C" style={sans}>
        {label}
      </text>
      <text x="34" y="33" fontSize="14" fontWeight="700" fill="#1A1A1A" style={hand}>
        {word}
      </text>
      <rect x="12" y="42" width="146" height="132" rx="6" fill="#FFFFFF" stroke="#D8D5CC" strokeWidth="1" />
      <g
        transform="translate(12 42)"
        fill="none"
        stroke="#1A1A1A"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
      {next && (
        <>
          <rect x="12" y="182" width="146" height="24" rx="7" fill="#1A1A1A" />
          <text x="85" y="198" textAnchor="middle" fontSize="13" fontWeight="600" fill="#FDFCF9" style={hand}>
            Next →
          </text>
          <text x="85" y="219" textAnchor="middle" fontSize="6.5" fill="#9A968C" style={sans}>
            or press space
          </text>
        </>
      )}
    </>
  );
}

export function DoodleArt() {
  return (
    <svg
      viewBox="0 0 395 315"
      role="img"
      aria-label="Two Draw n' Guess screens: a giraffe doodle and a bowl of fried rice"
      className="hub-art-svg"
    >
      {/* back screen: fried rice (automatic mode, no Next button) */}
      <g transform="translate(196 8) rotate(9)">
        <Screen word="fried rice" label="word 10 of 20">
          <path d="M30 64C30 100 54 116 74 116S116 100 116 64" />
          <path d="M30 64H116" strokeWidth="1.8" />
          <path d="M54 50L108 22" />
          <path d="M70 54L116 30" />
          <path d="M42 56l3-2M58 55l2-3M78 56l4-1M96 55l2-2" strokeWidth="1.6" />
        </Screen>
      </g>
      {/* front screen: giraffe */}
      <g transform="translate(8 56) rotate(-9)">
        <Screen word="giraffe" label="word 11 of 20" next>
          <path d="M54 126C58 100 62 78 66 58" />
          <path d="M92 126C90 104 88 84 90 58" />
          <path d="M66 58C56 52 56 38 66 32C70 20 86 14 100 20C112 25 112 40 100 46C96 50 92 54 90 58" />
          <path d="M82 18L80 8M92 19L94 9" strokeWidth="1.8" />
          <path d="M68 34C60 28 56 34 62 40" strokeWidth="1.7" />
          <path d="M72 80C80 76 84 86 76 90C70 92 68 84 72 80Z" strokeWidth="1.7" />
          <path d="M70 108C78 104 82 114 74 117C68 118 66 111 70 108Z" strokeWidth="1.7" />
          <circle cx="108" cy="30" r="1.7" fill="#1A1A1A" stroke="none" />
        </Screen>
      </g>
    </svg>
  );
}

/* ---------- Puzzle Together: real pieces from the landing photo, plus two live-style cursors ---------- */

// The four joined pieces share ONE transform (so their edges mesh); the loose ones are placed on their own.
const CLUSTER = {
  tf: "translate(150,170) rotate(6)",
  pieces: [
    { id: 24, x: -50, y: -50 },
    { id: 25, x: 50, y: -50 },
    { id: 33, x: -50, y: 50 },
    { id: 34, x: 50, y: 50 },
  ],
};
const LOOSE: { id: number; tf: string }[] = [
  { id: 14, tf: "translate(330,90) rotate(-18) scale(0.85)" },
  { id: 27, tf: "translate(70,330) rotate(14) scale(0.8)" },
  { id: 42, tf: "translate(300,300) rotate(-8) scale(0.85)" },
];
const ALL_IDS = [...CLUSTER.pieces.map((p) => p.id), ...LOOSE.map((p) => p.id)];

function Piece({ id, tf }: { id: number; tf: string }) {
  const r = Math.floor(id / 9);
  const c = id % 9;
  const d = PATHS[String(id)];
  return (
    <g transform={tf}>
      <g clipPath={`url(#hub-pz-${id})`}>
        <use href="#hub-pz-art" transform={`translate(${-(c * 100 + 50)},${-(r * 100 + 50)})`} />
      </g>
      <path d={d} fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="5" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="rgba(60,40,40,.4)" strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  );
}

function Cursor({ color, ink, name, style }: { color: string; ink: string; name: string; style: React.CSSProperties }) {
  return (
    <div className="hub-cursor" style={style} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path
          d="M3.5 3.5l16 7-7 2.5-2.5 7z"
          fill={color}
          stroke="#fff"
          strokeWidth="3.4"
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      </svg>
      <span style={{ background: color, color: ink }}>{name}</span>
    </div>
  );
}

export function PuzzleArt() {
  return (
    <div className="hub-puzzle-stage">
      <svg viewBox="10 20 390 370" role="img" aria-label="A jigsaw being put together by two people" className="hub-art-svg">
        <defs>
          <g id="hub-pz-art">
            <image href="/puzzle-street.jpg" width="900" height="600" preserveAspectRatio="none" />
          </g>
          {ALL_IDS.map((id) => (
            <clipPath key={id} id={`hub-pz-${id}`}>
              <path d={PATHS[String(id)]} />
            </clipPath>
          ))}
        </defs>
        <g transform={CLUSTER.tf}>
          {CLUSTER.pieces.map((p) => (
            <Piece key={p.id} id={p.id} tf={`translate(${p.x},${p.y})`} />
          ))}
        </g>
        {LOOSE.map((p) => (
          <Piece key={p.id} id={p.id} tf={p.tf} />
        ))}
      </svg>
      <Cursor color="#BE5560" ink="#fff" name="Maya" style={{ left: "35%", top: "81%" }} />
      <Cursor color="#E3A857" ink="#4A2F2F" name="Leo" style={{ left: "72%", top: "37%" }} />
    </div>
  );
}