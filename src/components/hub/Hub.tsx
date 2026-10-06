import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { DoodleArt, PuzzleArt } from "./GameArt";

type Game = { href: string; title: string; blurb: string; tag: string; color: string; art: ReactNode };

/** Add a game here and it shows up on the hub. `color` appears on hover. */
const GAMES: Game[] = [
  {
    href: "/draw-n-guess",
    title: "Draw n' Guess",
    blurb: "Doodle 20 words super fast, then try to remember what each drawing was.",
    tag: "Competitive",
    color: "#3B2F2A",
    art: <DoodleArt />,
  },
  {
    href: "/puzzle-together",
    title: "Puzzle Together",
    blurb: "Build one big jigsaw at the same time.",
    tag: "Co-op",
    color: "#BE5560",
    art: <PuzzleArt />,
  },
];

export const HUB_CSS = `
.hub{--ink:#3B2F2A;--muted:#7C6B5E;--bg:#FDF8F3;--line:#EFDFD2;position:relative;isolation:isolate;min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--hub-sans),system-ui,sans-serif;padding:28px clamp(20px,5vw,64px) 72px;overflow:hidden}
.hub::before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(640px 360px at 50% 150px,rgba(255,196,170,.42),transparent 70%),radial-gradient(520px 420px at 100% 100%,rgba(244,170,185,.26),transparent 70%),radial-gradient(480px 380px at 0% 70%,rgba(255,222,190,.30),transparent 70%)}
.hub::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.05;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .15 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")}
.hub-in{max-width:1000px;margin:0 auto}
.hub-brand{display:flex;align-items:center;gap:10px;font-weight:600;font-size:17px;letter-spacing:-.01em}
.hub-brand b{width:18px;height:18px;background:currentColor;display:block;border-radius:6px}
.hub h1{margin:clamp(56px,9vw,104px) 0 0;font-weight:600;letter-spacing:-.03em;line-height:1.04;font-size:clamp(34px,5.2vw,54px);max-width:16ch;text-wrap:balance}
.hub-sub{margin:16px 0 0;color:var(--muted);max-width:54ch;font-size:17px;line-height:1.55}
.hub-sub strong{color:var(--ink);font-weight:600}
.hub-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;margin-top:40px}
@media (max-width:700px){.hub-grid{grid-template-columns:1fr}}
.hub-card{display:flex;flex-direction:column;min-width:0;background:#FFFDFA;border:1.5px solid var(--line);border-radius:28px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .22s ease,border-color .18s}
.hub-card:hover,.hub-card:focus-visible{transform:translateY(-4px);border-color:var(--gc)}
.hub-card:focus-visible{outline:2px solid var(--gc);outline-offset:3px}
.hub-art{height:250px;padding:18px 14px 0;display:flex;align-items:center;justify-content:center}
.hub-art-svg{height:100%;width:auto;max-width:100%;display:block;transition:transform .25s}
.hub-card:hover .hub-art-svg{transform:rotate(-1.5deg) scale(1.03)}
.hub-puzzle-stage{position:relative;height:100%;display:flex}
.hub-cursor{position:absolute;display:flex;align-items:flex-start;pointer-events:none;transition:transform .4s ease}
.hub-cursor span{margin:10px 0 0 -5px;font-family:var(--font-fredoka),ui-rounded,system-ui,sans-serif;font-weight:600;font-size:10px;line-height:1;padding:4px 8px 5px;border-radius:999px;white-space:nowrap;box-shadow:0 0 0 1.5px #fff}
.hub-card:hover .hub-cursor:nth-of-type(1){transform:translate(8px,-6px)}
.hub-card:hover .hub-cursor:nth-of-type(2){transform:translate(-8px,8px)}
.hub-txt{padding:14px 28px 22px;flex:1}
.hub-name{margin:0;font-size:24px;font-weight:600;letter-spacing:-.02em;line-height:1.1;transition:color .18s}
.hub-card:hover .hub-name{color:var(--gc)}
.hub-desc{margin:6px 0 0;color:var(--muted);font-size:15.5px;line-height:1.5}
.hub-ft{border-top:1.5px solid #F6E9E0;padding:14px 18px 14px 28px;display:flex;justify-content:space-between;align-items:center;gap:12px;color:#9A8878;font-family:var(--hub-mono),ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;transition:border-color .18s}
.hub-card:hover .hub-ft{border-color:color-mix(in srgb,var(--gc) 30%,#F6E9E0)}
.hub-play{font-family:var(--hub-sans),system-ui,sans-serif;letter-spacing:0;text-transform:none;font-size:14px;font-weight:600;padding:9px 18px;border-radius:999px;background:#F8E8DE;color:#7C6B5E;transition:background .18s,color .18s;white-space:nowrap}
.hub-card:hover .hub-play,.hub-card:focus-visible .hub-play{background:var(--gc);color:#fff}
.hub-soon{grid-column:1/-1;border:1.5px dashed #E6CFC2;border-radius:22px;color:#A8957F;display:flex;align-items:center;justify-content:center;min-height:96px;font-family:var(--hub-mono),ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
@media (prefers-reduced-motion:reduce){.hub-card,.hub-art-svg,.hub-cursor,.hub-name,.hub-play,.hub-ft{transition:none}.hub-card:hover{transform:none}}
`;

export function Hub() {
  return (
    <div className="hub">
      <style>{HUB_CSS}</style>
      <div className="hub-in">
        <header className="hub-brand">
          <b />
          {SITE_NAME}
        </header>

        <main>
          <h1>What are we playing tonight?</h1>
          <p className="hub-sub">
            Quick, cozy mini games for the friends and partners you can&apos;t be next to. Pick one, invite someone, and hang out.{" "}
            <strong>{SITE_TAGLINE}</strong>
          </p>

          <div className="hub-grid">
            {GAMES.map((g) => (
              <Link key={g.href} href={g.href} className="hub-card" style={{ "--gc": g.color } as CSSProperties}>
                <div className="hub-art">{g.art}</div>
                <div className="hub-txt">
                  <h2 className="hub-name">{g.title}</h2>
                  <p className="hub-desc">{g.blurb}</p>
                </div>
                <div className="hub-ft">
                  <span>{g.tag}</span>
                  <span className="hub-play">Play</span>
                </div>
              </Link>
            ))}
            <div className="hub-soon">More games soon</div>
          </div>
        </main>
      </div>
    </div>
  );
}