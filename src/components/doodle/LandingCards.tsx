// Decorative game-screen cards for the /draw-n-guess landing page (the same look as the in-game "word" screen).
//  - >= 900px: cards peek in from the left and right page edges (more of them on very wide screens).
//  - <  900px: no side strips; three small cards bleed off the top-right, bottom-left and bottom-right corners.
// Plain CSS (not Tailwind classes) so positioning can't depend on class generation.
import type { ReactNode } from "react";

type Doodle = { word: string; n: number; next?: boolean; art: ReactNode };

const hand = { fontFamily: "var(--font-hand), Caveat, cursive" } as const;
const sans = { fontFamily: "var(--font-sans), system-ui, sans-serif" } as const;

// Every doodle is drawn in a 146 x 132 canvas.
const DOODLES: Record<string, Doodle> = {
  giraffe: {
    word: "giraffe",
    n: 11,
    next: true,
    art: (
      <>
        <path d="M54 126C58 100 62 78 66 58" />
        <path d="M92 126C90 104 88 84 90 58" />
        <path d="M66 58C56 52 56 38 66 32C70 20 86 14 100 20C112 25 112 40 100 46C96 50 92 54 90 58" />
        <path d="M82 18L80 8M92 19L94 9" strokeWidth="1.8" />
        <path d="M68 34C60 28 56 34 62 40" strokeWidth="1.7" />
        <path d="M72 80C80 76 84 86 76 90C70 92 68 84 72 80Z" strokeWidth="1.7" />
        <path d="M70 108C78 104 82 114 74 117C68 118 66 111 70 108Z" strokeWidth="1.7" />
        <circle cx="108" cy="30" r="1.7" fill="#1A1A1A" stroke="none" />
      </>
    ),
  },
  rice: {
    word: "fried rice",
    n: 10,
    art: (
      <>
        <path d="M30 64C30 100 54 116 74 116S116 100 116 64" />
        <path d="M30 64H116" strokeWidth="1.8" />
        <path d="M54 50L108 22" />
        <path d="M70 54L116 30" />
        <path d="M42 56l3-2M58 55l2-3M78 56l4-1M96 55l2-2" strokeWidth="1.6" />
      </>
    ),
  },
  coaster: {
    word: "roller coaster",
    n: 5,
    next: true,
    art: (
      <>
        <path d="M8 112H50C66 112 78 104 90 92C108 74 120 56 112 36C106 22 84 20 74 32C66 44 72 62 86 74C100 84 112 86 138 84" />
        <path d="M16 90V108H40L38 88Z" strokeWidth="1.8" />
        <path d="M12 88H18" strokeWidth="1.8" />
      </>
    ),
  },
  spider: {
    word: "spider",
    n: 7,
    art: (
      <>
        <path d="M56 54C62 40 88 38 94 52C100 68 92 82 76 82C60 82 50 68 56 54Z" />
        <path d="M60 48C54 34 44 30 38 36" />
        <path d="M58 62C42 56 30 66 24 92" />
        <path d="M60 74C46 76 38 90 40 106" />
        <path d="M92 48C98 34 110 32 114 38" />
        <path d="M96 62C110 58 122 66 124 80L112 76" />
        <path d="M92 74C106 76 112 92 106 104" />
      </>
    ),
  },
  stamp: {
    word: "stamp",
    n: 6,
    next: true,
    art: (
      <>
        <path d="M64 18C54 22 52 38 62 46C72 52 86 48 88 36C90 24 78 14 64 18Z" />
        <path d="M70 48L66 66M82 48L88 66" />
        <path d="M40 66C56 62 96 62 112 66L108 82H44Z" />
        <path d="M34 96H58M72 96H108" strokeWidth="1.8" />
        <path d="M40 112H102" strokeWidth="1.8" />
      </>
    ),
  },
  pumpkin: {
    word: "pumpkin",
    n: 3,
    art: (
      <>
        <path d="M24 82C22 58 46 44 72 48C100 44 124 58 122 84C120 108 96 116 72 112C48 116 26 106 24 82Z" />
        <path d="M72 48C58 64 58 98 72 112" />
        <path d="M48 52C38 70 40 94 52 108" />
        <path d="M98 52C108 70 106 94 94 108" />
        <path d="M70 46C68 38 72 30 82 26" strokeWidth="1.8" />
      </>
    ),
  },
  rainbow: {
    word: "rainbow",
    n: 7,
    next: true,
    art: (
      <>
        <path d="M18 108C18 60 46 30 74 30C102 30 130 60 130 108" />
        <path d="M34 108C34 70 52 46 74 46C96 46 114 70 114 108" />
        <path d="M50 108C50 82 60 62 74 62C88 62 98 82 98 108" />
      </>
    ),
  },
  minotaur: {
    word: "the minotaur",
    n: 12,
    art: (
      <>
        <path d="M46 52L54 68C50 92 58 110 74 112C92 110 100 92 96 68L106 52L90 58C80 54 66 54 58 58Z" />
        <path d="M54 58C42 44 44 28 52 14" />
        <path d="M96 58C108 44 106 28 98 12" />
        <path d="M60 72L70 75M88 72L78 75" strokeWidth="1.8" />
        <path d="M66 94H84V102H66Z" strokeWidth="1.8" />
      </>
    ),
  },
  door: {
    word: "revolving door",
    n: 11,
    art: (
      <>
        <path d="M50 20V112H104V24C98 20 62 22 56 22" />
        <path d="M84 66C80 64 80 74 84 78C90 80 92 72 90 66Z" strokeWidth="1.8" />
        <path d="M14 62L30 58C36 52 44 52 46 60C44 70 34 74 26 72" strokeWidth="1.8" />
        <path d="M12 74H30" strokeWidth="1.8" />
      </>
    ),
  },
};

/** One game card, centred on (0,0). Card is 170 x 230. */
function Card({ k }: { k: string }) {
  const d = DOODLES[k];
  return (
    <g transform="translate(-85,-115)">
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
        {`word ${d.n} of 20`}
      </text>
      <text x="34" y="33" fontSize="14" fontWeight="700" fill="#1A1A1A" style={hand}>
        {d.word}
      </text>
      <rect x="12" y="42" width="146" height="132" rx="6" fill="#FFFFFF" stroke="#D8D5CC" strokeWidth="1" />
      <g transform="translate(12 42)" fill="none" stroke="#1A1A1A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        {d.art}
      </g>
      {d.next && (
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
    </g>
  );
}

type Place = { k: string; tf: string };

// Edge strips: svg viewBox is 260 x 700. Left cards sit near x=0 (bleeding off), right cards near x=260.
const LEFT: Place[] = [
  { k: "giraffe", tf: "translate(74,150) rotate(-10) scale(0.88)" },
  { k: "coaster", tf: "translate(105,385) rotate(7) scale(0.78)" },
  { k: "spider", tf: "translate(60,610) rotate(-14) scale(0.8)" },
];
const RIGHT: Place[] = [
  { k: "pumpkin", tf: "translate(150,95) rotate(-7) scale(0.78)" },
  { k: "rice", tf: "translate(204,330) rotate(10) scale(0.88)" },
  { k: "stamp", tf: "translate(165,590) rotate(-9) scale(0.8)" },
];
// Extra cards, only on very wide screens (>= 1400px). Svg viewBox is 200 x 700.
const WIDE_LEFT: Place[] = [{ k: "rainbow", tf: "translate(100,520) rotate(9) scale(0.72)" }];
const WIDE_RIGHT: Place[] = [{ k: "minotaur", tf: "translate(100,215) rotate(-8) scale(0.72)" }];
// Small corner cards for narrow screens: [card, css class].
const CORNERS: [string, string][] = [
  ["pumpkin", "tr"],
  ["door", "bl"],
  ["rice", "br"],
];

export const LANDING_CARDS_CSS = `
.dg-main{padding-inline:16px}
.dg-edge,.dg-wide{position:absolute;top:0;height:100%;pointer-events:none;z-index:0;overflow:visible}
.dg-edge{width:clamp(90px,22vw,300px)}
.dg-edge.l{left:0}.dg-edge.r{right:0}
.dg-wide{display:none;width:clamp(120px,10vw,200px)}
.dg-wide.l{left:clamp(190px,14vw,280px)}.dg-wide.r{right:clamp(190px,14vw,280px)}
.dg-corner{display:none;position:absolute;pointer-events:none;z-index:0;overflow:visible;width:84px;height:112px}
.dg-corner.tr{top:3%;right:-20px;transform:rotate(12deg)}
.dg-corner.bl{bottom:4%;left:-24px;transform:rotate(-14deg)}
.dg-corner.br{bottom:11%;right:-14px;width:66px;height:88px;transform:rotate(18deg)}
@media (min-width:1400px){.dg-wide{display:block}}
@media (max-width:899px){
  .dg-edge{display:none}
  .dg-corner{display:block}
}
@media (max-width:560px){
  .dg-corner{width:62px;height:84px}
  .dg-corner.tr{top:2%;right:-14px}
  .dg-corner.bl{bottom:3%;left:-16px}
  .dg-corner.br{width:50px;height:68px;bottom:8%;right:-10px}
}`;

export function LandingCards() {
  return (
    <>
      <style>{LANDING_CARDS_CSS}</style>

      <svg className="dg-edge l" viewBox="0 0 260 700" preserveAspectRatio="xMinYMid slice" aria-hidden="true">
        {LEFT.map((p) => (
          <g key={p.k} transform={p.tf}>
            <Card k={p.k} />
          </g>
        ))}
      </svg>
      <svg className="dg-edge r" viewBox="0 0 260 700" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        {RIGHT.map((p) => (
          <g key={p.k} transform={p.tf}>
            <Card k={p.k} />
          </g>
        ))}
      </svg>

      <svg className="dg-wide l" viewBox="0 0 200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {WIDE_LEFT.map((p) => (
          <g key={p.k} transform={p.tf}>
            <Card k={p.k} />
          </g>
        ))}
      </svg>
      <svg className="dg-wide r" viewBox="0 0 200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {WIDE_RIGHT.map((p) => (
          <g key={p.k} transform={p.tf}>
            <Card k={p.k} />
          </g>
        ))}
      </svg>

      {CORNERS.map(([k, pos]) => (
        <svg key={pos} className={`dg-corner ${pos}`} viewBox="-85 -115 170 230" aria-hidden="true">
          <Card k={k} />
        </svg>
      ))}
    </>
  );
}