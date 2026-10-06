// Decorative jigsaw pieces for the /puzzle-together landing page.
//  - >= 900px: pieces peek in from the left and right page edges (more of them on very wide screens).
//  - <  900px: no side strips; three small pieces bleed off the top-right, bottom-left and bottom-right corners.
// Two live-style cursors (Maya, Leo) sit next to the pieces at every size, and scale with the screen.
// Outlines come from the game's own jigsaw geometry (9x6 grid, 100-unit cells) over a 900x600 viewBox of the photo.
// Plain CSS (not Tailwind classes) so positioning can't depend on class generation.
type Cluster = { ids: number[]; cols: number; rows: number; tf: string };

export const PATHS: Record<string, string> = {
  "6": "M-50,-50 L50,-50 C48.6,-30 41.2,0.2 61.2,-8.4 C81.2,-17 81.2,23 61.2,11.6 C41.2,0.2 46.9,30 50,50 C30,52.7 -0.4,36.2 6.1,56.2 C12.5,76.2 -27.5,76.2 -13.9,56.2 C-0.4,36.2 -30,47.9 -50,50 C-48.2,30 -40.2,4.6 -60.1,12 C-80.1,19.4 -80.1,-20.6 -60.1,-8 C-40.2,4.6 -46.3,-30 -50,-50 Z",
  "11": "M-50,-50 C-30,-49.7 4.9,-56.9 -8.8,-36.9 C-22.5,-16.9 17.5,-16.9 11.2,-36.9 C4.9,-56.9 30,-47.3 50,-50 C48.7,-30 43.1,4.1 63.1,-6.5 C83.1,-17.2 83.1,22.8 63.1,13.5 C43.1,4.1 51.8,30 50,50 C30,49.3 1.5,60.1 13.6,40.1 C25.8,20.1 -14.2,20.1 -6.4,40.1 C1.5,60.1 -30,48.1 -50,50 C-51.4,30 -57.9,-4.9 -37.9,7.8 C-17.9,20.5 -17.9,-19.5 -37.9,-12.2 C-57.9,-4.9 -50.8,-30 -50,-50 Z",
  "14": "M-50,-50 C-30,-52.6 1.3,-41.1 -10.6,-61.1 C-22.5,-81.1 17.5,-81.1 9.4,-61.1 C1.3,-41.1 30,-50.4 50,-50 C48.4,-30 39.5,-1.5 59.5,-13.7 C79.5,-25.8 79.5,14.2 59.5,6.3 C39.5,-1.5 52.9,30 50,50 C30,46.5 0.7,43 6.9,63 C13,83 -27,83 -13.1,63 C0.7,43 -30,46.2 -50,50 C-48.9,30 -63.9,-5 -43.9,9 C-23.9,22.9 -23.9,-17.1 -43.9,-11 C-63.9,-5 -50.3,-30 -50,-50 Z",
  "20": "M-50,-50 C-30,-51.9 1.5,-39.9 -6.4,-59.9 C-14.2,-79.9 25.8,-79.9 13.6,-59.9 C1.5,-39.9 30,-50.7 50,-50 C46.6,-30 59.8,6.8 39.8,-6.7 C19.8,-20.3 19.8,19.7 39.8,13.3 C59.8,6.8 46.6,30 50,50 C30,46.9 -2.9,59.7 8.7,39.7 C20.4,19.7 -19.6,19.7 -11.3,39.7 C-2.9,59.7 -30,50.5 -50,50 C-47.8,30 -57.6,4 -37.6,11.9 C-17.6,19.7 -17.6,-20.3 -37.6,-8.1 C-57.6,4 -48.6,-30 -50,-50 Z",
  "21": "M-50,-50 C-30,-52.8 -2.7,-40.4 -12.5,-60.4 C-22.3,-80.4 17.7,-80.4 7.5,-60.4 C-2.7,-40.4 30,-50.2 50,-50 C53.3,-30 40,1.6 60,-7.6 C80,-16.8 80,23.2 60,12.4 C40,1.6 48.2,30 50,50 C30,48.4 2.2,60 12.7,40 C23.2,20 -16.8,20 -7.3,40 C2.2,60 -30,46.1 -50,50 C-53.4,30 -40.2,6.8 -60.2,13.3 C-80.2,19.7 -80.2,-20.3 -60.2,-6.7 C-40.2,6.8 -53.4,-30 -50,-50 Z",
  "24": "M-50,-50 C-30,-50.7 -1.1,-58.1 -10,-38.1 C-19,-18.1 21,-18.1 10,-38.1 C-1.1,-58.1 30,-51.1 50,-50 C52.6,-30 58.1,1.5 38.1,-10.8 C18.1,-23 18.1,17 38.1,9.2 C58.1,1.5 49.9,30 50,50 C30,48.2 -4.9,61.9 8.5,41.9 C22,21.9 -18,21.9 -11.5,41.9 C-4.9,61.9 -30,46.3 -50,50 C-52.3,30 -42.6,-2.4 -62.6,11 C-82.6,24.3 -82.6,-15.7 -62.6,-9 C-42.6,-2.4 -51.8,-30 -50,-50 Z",
  "25": "M-50,-50 C-30,-51.7 4.8,-40.2 -7.6,-60.2 C-20,-80.2 20,-80.2 12.4,-60.2 C4.8,-40.2 30,-49.3 50,-50 C53.5,-30 37.2,5.2 57.2,-6.1 C77.2,-17.3 77.2,22.7 57.2,13.9 C37.2,5.2 47.9,30 50,50 C30,46.2 0.4,56.3 12.6,36.3 C24.8,16.3 -15.2,16.3 -7.4,36.3 C0.4,56.3 -30,47.7 -50,50 C-50.1,30 -41.9,1.5 -61.9,9.2 C-81.9,17 -81.9,-23 -61.9,-10.8 C-41.9,1.5 -47.4,-30 -50,-50 Z",
  "27": "M-50,-50 C-30,-52.6 1.1,-39.4 -7.8,-59.4 C-16.7,-79.4 23.3,-79.4 12.2,-59.4 C1.1,-39.4 30,-53.4 50,-50 C51.1,-30 42.5,-3.5 62.5,-11.2 C82.5,-19 82.5,21 62.5,8.8 C42.5,-3.5 47.2,30 50,50 C30,50.1 3.4,61.8 10.8,41.8 C18.1,21.8 -21.9,21.8 -9.2,41.8 C3.4,61.8 -30,49 -50,50 L-50,-50 Z",
  "29": "M-50,-50 C-30,-49.5 -2.9,-40.3 -11.3,-60.3 C-19.6,-80.3 20.4,-80.3 8.7,-60.3 C-2.9,-40.3 30,-53.1 50,-50 C52.6,-30 56.6,3.8 36.6,-7.6 C16.6,-18.9 16.6,21 36.6,12.4 C56.6,3.8 53.7,30 50,50 C30,50.8 -3,61.7 6.8,41.7 C16.6,21.7 -23.4,21.7 -13.2,41.7 C-3,61.7 -30,52.8 -50,50 C-49,30 -56.2,-6.7 -36.2,6.8 C-16.2,20.3 -16.2,-19.7 -36.2,-13.2 C-56.2,-6.7 -49.1,-30 -50,-50 Z",
  "30": "M-50,-50 C-30,-53.9 2.2,-40 -7.3,-60 C-16.8,-80 23.2,-80 12.7,-60 C2.2,-40 30,-51.6 50,-50 C50.7,-30 38.4,-2.7 58.4,-12.2 C78.4,-21.7 78.4,18.3 58.4,7.8 C38.4,-2.7 47.4,30 50,50 C30,50 -1.5,56.7 10.2,36.7 C22,16.7 -18,16.7 -9.8,36.7 C-1.5,56.7 -30,47.1 -50,50 C-46.3,30 -43.4,3.8 -63.4,12.4 C-83.4,21 -83.4,-18.9 -63.4,-7.6 C-43.4,3.8 -47.4,-30 -50,-50 Z",
  "33": "M-50,-50 C-30,-53.7 -4.9,-38.1 -11.5,-58.1 C-18,-78.1 22,-78.1 8.5,-58.1 C-4.9,-38.1 30,-51.8 50,-50 C53.4,-30 63.4,-2 43.4,-12 C23.4,-21.9 23.4,18.1 43.4,8 C63.4,-2 48.3,30 50,50 C30,48.2 3.1,61.9 10.7,41.9 C18.4,21.9 -21.6,21.9 -9.3,41.9 C3.1,61.9 -30,51.8 -50,50 C-49,30 -61.4,-2.7 -41.4,6.7 C-21.4,16.1 -21.4,-23.9 -41.4,-13.3 C-61.4,-2.7 -51.2,-30 -50,-50 Z",
  "34": "M-50,-50 C-30,-52.3 0.4,-43.7 -7.4,-63.7 C-15.2,-83.7 24.8,-83.7 12.6,-63.7 C0.4,-43.7 30,-53.8 50,-50 C53.3,-30 56.4,1.8 36.4,-7.8 C16.4,-17.4 16.4,22.6 36.4,12.2 C56.4,1.8 46.9,30 50,50 C30,49 0.5,36.6 13.8,56.6 C27.2,76.6 -12.8,76.6 -6.2,56.6 C0.5,36.6 -30,49.6 -50,50 C-51.7,30 -36.6,-2 -56.6,8 C-76.6,18.1 -76.6,-21.9 -56.6,-12 C-36.6,-2 -46.6,-30 -50,-50 Z",
  "41": "M-50,-50 C-30,-46 -5.8,-42 -12.7,-62 C-19.5,-82 20.5,-82 7.3,-62 C-5.8,-42 30,-46.6 50,-50 C53.4,-30 41.7,5.7 61.7,-7.3 C81.7,-20.3 81.7,19.7 61.7,12.7 C41.7,5.7 49.6,30 50,50 C30,50.1 -0.4,56.5 6.3,36.5 C12.9,16.5 -27.1,16.5 -13.7,36.5 C-0.4,56.5 -30,53.7 -50,50 C-46,30 -58.9,1.6 -38.9,8.1 C-18.9,14.5 -18.9,-25.5 -38.9,-11.9 C-58.9,1.6 -49.7,-30 -50,-50 Z",
  "42": "M-50,-50 C-30,-48.2 3.1,-38.1 -9.3,-58.1 C-21.6,-78.1 18.4,-78.1 10.7,-58.1 C3.1,-38.1 30,-51.7 50,-50 C46.7,-30 61.3,-0.3 41.3,-7.4 C21.3,-14.4 21.3,25.6 41.3,12.6 C61.3,-0.3 50.7,30 50,50 C30,49.2 -6,59.8 7.4,39.8 C20.8,19.8 -19.2,19.8 -12.6,39.8 C-6,59.8 -30,48.3 -50,50 C-50.4,30 -58.3,5.7 -38.3,12.7 C-18.3,19.7 -18.3,-20.3 -38.3,-7.3 C-58.3,5.7 -46.6,-30 -50,-50 Z",
  "48": "M-50,-50 C-30,-48 0.3,-36.6 -9.9,-56.6 C-20,-76.6 20,-76.6 10.1,-56.6 C0.3,-36.6 30,-49.4 50,-50 C46.3,-30 43.6,2.6 63.6,-10.3 C83.6,-23.2 83.6,16.8 63.6,9.7 C43.6,2.6 49.8,30 50,50 L-50,50 C-48.8,30 -43,3 -63,9.5 C-83,16.1 -83,-23.9 -63,-10.5 C-43,3 -53.1,-30 -50,-50 Z",
};

const LEFT: Cluster[] = [
  { ids: [20, 21, 29, 30], cols: 2, rows: 2, tf: "translate(30,190) rotate(-9) scale(0.9)" },
  { ids: [27], cols: 1, rows: 1, tf: "translate(70,505) rotate(20) scale(0.9)" },
  { ids: [48], cols: 1, rows: 1, tf: "translate(150,368) rotate(-14) scale(0.8)" },
];
const RIGHT: Cluster[] = [
  { ids: [24, 25, 33, 34], cols: 2, rows: 2, tf: "translate(175,430) rotate(7) scale(0.9)" },
  { ids: [14], cols: 1, rows: 1, tf: "translate(200,100) rotate(-22) scale(0.9)" },
  { ids: [42], cols: 1, rows: 1, tf: "translate(150,615) rotate(16) scale(0.8)" },
];
// Extra pieces, only shown on very wide screens (>= 1400px).
const WIDE_LEFT: Cluster[] = [
  { ids: [11], cols: 1, rows: 1, tf: "translate(70,60) rotate(12) scale(0.8)" },
  { ids: [41], cols: 1, rows: 1, tf: "translate(125,625) rotate(-6) scale(0.8)" },
];
const WIDE_RIGHT: Cluster[] = [{ ids: [6], cols: 1, rows: 1, tf: "translate(80,300) rotate(20) scale(0.8)" }];
// Small corner pieces for narrow screens: [piece, css class].
const CORNERS: [number, string][] = [
  [14, "tr"],
  [27, "bl"],
  [42, "br"],
];

function Piece({ id, dx, dy }: { id: number; dx: number; dy: number }) {
  const r = Math.floor(id / 9);
  const c = id % 9;
  const d = PATHS[String(id)];
  return (
    <g transform={`translate(${dx},${dy})`}>
      <g clipPath={`url(#lp-c${id})`}>
        <use href="#lp-art" transform={`translate(${-(c * 100 + 50)},${-(r * 100 + 50)})`} />
      </g>
      <path d={d} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={5} strokeLinejoin="round" />
      <path d={d} fill="none" stroke="rgba(90,58,58,.45)" strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  );
}

function Group({ cl }: { cl: Cluster }) {
  return (
    <g transform={cl.tf}>
      {cl.ids.map((id, n) => {
        const dr = Math.floor(n / cl.cols);
        const dc = n % cl.cols;
        return <Piece key={id} id={id} dx={(dc - (cl.cols - 1) / 2) * 100} dy={(dr - (cl.rows - 1) / 2) * 100} />;
      })}
    </g>
  );
}

function Cursor({ cls, color, ink, name }: { cls: string; color: string; ink: string; name: string }) {
  return (
    <div className={`lp-cur ${cls}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M3.5 3.5l16 7-7 2.5-2.5 7z" fill={color} stroke="#fff" strokeWidth="3.4" strokeLinejoin="round" paintOrder="stroke" />
      </svg>
      <span style={{ background: color, color: ink }}>{name}</span>
    </div>
  );
}

export const LANDING_PIECES_CSS = `
.lp-main{padding-inline:16px}
.lp-defs{position:absolute;width:0;height:0;overflow:hidden}
.lp-edge,.lp-wide{position:absolute;top:0;height:100%;pointer-events:none;z-index:0;overflow:visible}
.lp-edge{width:clamp(90px,22vw,300px)}
.lp-edge.l{left:0}.lp-edge.r{right:0}
.lp-wide{display:none;width:clamp(120px,10vw,200px)}
.lp-wide.l{left:clamp(190px,14vw,280px)}.lp-wide.r{right:clamp(190px,14vw,280px)}
.lp-corner{display:none;position:absolute;pointer-events:none;z-index:0;overflow:visible;width:112px;height:112px}
.lp-corner.tr{top:4%;right:-22px;transform:rotate(14deg)}
.lp-corner.bl{bottom:5%;left:-26px;transform:rotate(-16deg)}
.lp-corner.br{bottom:9%;right:-6px;width:84px;height:84px;transform:rotate(22deg)}
.lp-cur{position:absolute;display:flex;align-items:flex-start;pointer-events:none;z-index:1;font-size:clamp(10px,.9vw + 4.5px,19px)}
.lp-cur svg{width:1.8em;height:1.8em;flex:none}
.lp-cur span{margin:.9em 0 0 -.45em;font-family:var(--font-fredoka),ui-rounded,system-ui,sans-serif;font-weight:600;font-size:1em;line-height:1;padding:.36em .8em .45em;border-radius:999px;white-space:nowrap;box-shadow:0 0 0 1.5px #fff}
.lp-cur.maya{left:clamp(120px,16vw,250px);top:44%}
.lp-cur.leo{right:clamp(120px,16vw,250px);top:47%;transform:scaleX(-1)}
.lp-cur.leo span{transform:scaleX(-1);margin:.9em -.45em 0 0}
@media (max-width:899px){
  .lp-cur.maya{left:68px;bottom:11%;top:auto}
  .lp-cur.leo{right:60px;top:10%}
}
@media (max-width:560px){
  .lp-cur.maya{left:52px}
  .lp-cur.leo{right:46px}
}
@media (min-width:1400px){.lp-wide{display:block}}
@media (max-width:899px){
  .lp-edge{display:none}
  .lp-corner{display:block}
}
@media (max-width:560px){
  .lp-corner{width:76px;height:76px}
  .lp-corner.tr{top:2%;right:-16px}
  .lp-corner.bl{bottom:3%;left:-18px}
  .lp-corner.br{width:58px;height:58px;bottom:7%;right:-4px}
}`;

export function LandingPieces() {
  return (
    <>
      <style>{LANDING_PIECES_CSS}</style>
      {/* Shared artwork + clip paths, in an always-rendered (never display:none) svg so every piece can reference them. */}
      <svg className="lp-defs" aria-hidden="true">
        <defs>
          <g id="lp-art">
            <image href="/puzzle-street.jpg" width={900} height={600} preserveAspectRatio="none" />
          </g>
          {Object.entries(PATHS).map(([id, d]) => (
            <clipPath key={id} id={`lp-c${id}`}>
              <path d={d} />
            </clipPath>
          ))}
        </defs>
      </svg>

      <svg className="lp-edge l" viewBox="0 0 260 700" preserveAspectRatio="xMinYMid slice" aria-hidden="true">
        {LEFT.map((cl) => (
          <Group key={cl.ids[0]} cl={cl} />
        ))}
      </svg>
      <svg className="lp-edge r" viewBox="0 0 260 700" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        {RIGHT.map((cl) => (
          <Group key={cl.ids[0]} cl={cl} />
        ))}
      </svg>

      <svg className="lp-wide l" viewBox="0 0 200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {WIDE_LEFT.map((cl) => (
          <Group key={cl.ids[0]} cl={cl} />
        ))}
      </svg>
      <svg className="lp-wide r" viewBox="0 0 200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {WIDE_RIGHT.map((cl) => (
          <Group key={cl.ids[0]} cl={cl} />
        ))}
      </svg>

      <Cursor cls="maya" color="#BE5560" ink="#fff" name="Maya" />
      <Cursor cls="leo" color="#E3A857" ink="#4A2F2F" name="Leo" />

      {CORNERS.map(([id, pos]) => (
        <svg key={id} className={`lp-corner ${pos}`} viewBox="-90 -90 180 180" aria-hidden="true">
          <Piece id={id} dx={0} dy={0} />
        </svg>
      ))}
    </>
  );
}