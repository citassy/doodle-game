import { boundsOfPieces, type PuzzleGame } from "./game";
import { homeOf, pathBounds, piecePath, pathToSvg, rotVec } from "./shapes";
import type { PathCmd, Vec } from "./types";
import { PT } from "./theme";

export interface Camera {
  /** World point shown at the middle of the screen. */
  x: number;
  y: number;
  zoom: number;
}

export interface Marquee {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Bitmap {
  canvas: HTMLCanvasElement;
  /** Where the bitmap's top-left sits, relative to the piece's cell centre, in world units. */
  ox: number;
  oy: number;
  w: number;
  h: number;
  /** Bitmap pixels per world unit this was baked at. */
  level: number;
  px: number;
}

const BITMAPS_PER_FRAME = 28;
const REBAKES_PER_FRAME = 14;
/** While bitmaps catch up after a zoom, this many pieces per frame are painted straight from the picture. */
const DIRECT_PER_FRAME = 70;
/** Longest side of one baked piece, in bitmap pixels. */
const MAX_BITMAP_SIDE = 900;
/** Soft cap on baked pixels held at once; pieces off screen are dropped first. */
const PIXEL_BUDGET = 90_000_000;

/** Round a scale up to the next half-octave so a piece is rebaked only now and then while zooming. */
const quantize = (v: number) => Math.pow(2, Math.ceil(Math.log2(Math.max(v, 0.01)) * 2) / 2);

/**
 * Draws the board on a single <canvas>. Piece pictures are baked once into
 * small bitmaps (lazily, only for pieces that scroll into view) so a thousand
 * pieces stay smooth.
 */
export class BoardRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly camera: Camera = { x: 0, y: 0, zoom: 0.5 };
  showGuide = true;
  marquee: Marquee | null = null;
  /** Pieces another player is holding right now -> that player's colour. */
  remoteHeld = new Map<number, string>();
  minZoom = 0.05;
  maxZoom = 5;
  /** Screen space covered by the top bar and bottom controls when framing the board. */
  insets = { top: 84, bottom: 84, left: 12, right: 12 };

  private ctx: CanvasRenderingContext2D;
  private hitCtx: CanvasRenderingContext2D;
  private game: PuzzleGame;
  private image: HTMLImageElement | null = null;
  private bitmaps = new Map<number, Bitmap>();
  private cmds = new Map<number, PathCmd[]>();
  private paths = new Map<number, Path2D>();
  private totalPx = 0;
  private cssW = 1;
  private cssH = 1;
  private dpr = 1;
  private raf = 0;
  private lastRev = -1;
  private dirty = true;
  private onFrame?: () => void;

  constructor(canvas: HTMLCanvasElement, game: PuzzleGame, onFrame?: () => void) {
    this.canvas = canvas;
    this.game = game;
    this.onFrame = onFrame;
    this.ctx = canvas.getContext("2d")!;
    this.hitCtx = document.createElement("canvas").getContext("2d")!;
  }

  setImage(img: HTMLImageElement) {
    this.image = img;
    this.bitmaps.clear();
    this.totalPx = 0;
    this.invalidate();
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    this.dpr = dpr;
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    this.invalidate();
  }

  get width() {
    return this.cssW;
  }
  get height() {
    return this.cssH;
  }

  invalidate() {
    this.dirty = true;
    if (!this.raf) this.raf = requestAnimationFrame(() => this.frame());
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // ------------------------------------------------------------- camera --
  screenToWorld(sx: number, sy: number): Vec {
    const c = this.camera;
    return { x: (sx - this.cssW / 2) / c.zoom + c.x, y: (sy - this.cssH / 2) / c.zoom + c.y };
  }

  worldToScreen(x: number, y: number): Vec {
    const c = this.camera;
    return { x: (x - c.x) * c.zoom + this.cssW / 2, y: (y - c.y) * c.zoom + this.cssH / 2 };
  }

  panBy(dxScreen: number, dyScreen: number) {
    this.camera.x -= dxScreen / this.camera.zoom;
    this.camera.y -= dyScreen / this.camera.zoom;
    this.invalidate();
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const before = this.screenToWorld(sx, sy);
    this.camera.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.camera.zoom * factor));
    const after = this.screenToWorld(sx, sy);
    this.camera.x += before.x - after.x;
    this.camera.y += before.y - after.y;
    this.invalidate();
  }

  zoomCentered(factor: number) {
    this.zoomAt(this.cssW / 2, this.cssH / 2, factor);
  }

  /** Frame everything: the guide and every piece. */
  fit(padding = 0.88) {
    const b = boundsOfPieces(this.game.g, this.game.pieces);
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    const { top, bottom, left, right } = this.insets;
    const availW = Math.max(100, this.cssW - left - right);
    const availH = Math.max(100, this.cssH - top - bottom);
    const z = Math.min(availW / w, availH / h) * padding;
    this.minZoom = z * 0.4;
    this.camera.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, z));
    // centre on the free area, not the whole canvas
    const shiftX = (left - right) / 2 / this.camera.zoom;
    const shiftY = (top - bottom) / 2 / this.camera.zoom;
    this.camera.x = (b.minX + b.maxX) / 2 - shiftX;
    this.camera.y = (b.minY + b.maxY) / 2 - shiftY;
    this.invalidate();
  }

  /** Frame just the guide rectangle. */
  fitGuide(padding = 0.7) {
    const g = this.game.g;
    const { top, bottom, left, right } = this.insets;
    const availW = Math.max(100, this.cssW - left - right);
    const availH = Math.max(100, this.cssH - top - bottom);
    this.camera.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, Math.min(availW / g.width, availH / g.height) * padding));
    this.camera.x = -((left - right) / 2) / this.camera.zoom;
    this.camera.y = -((top - bottom) / 2) / this.camera.zoom;
    this.invalidate();
  }

  // ------------------------------------------------------------ hit test --
  hitTest(world: Vec): number {
    const g = this.game.g;
    const reach = Math.max(g.cw, g.ch) * 0.85;
    const candidates: number[] = [];
    for (let i = 0; i < g.count; i++) {
      const p = this.game.pieces[i];
      if (Math.abs(p.x - world.x) <= reach && Math.abs(p.y - world.y) <= reach) candidates.push(i);
    }
    candidates.sort((a, b) => this.game.z[b] - this.game.z[a]);
    for (const i of candidates) {
      const p = this.game.pieces[i];
      const local = rotVec({ x: world.x - p.x, y: world.y - p.y }, -p.rot);
      if (this.hitCtx.isPointInPath(this.pathFor(i), local.x, local.y)) return i;
    }
    return -1;
  }

  /** Screen-space box around the selected pieces (for the floating toolbar). */
  selectionScreenRect(): { x0: number; y0: number; x1: number; y1: number } | null {
    const sel = this.game.selectedPieces();
    if (sel.length === 0) return null;
    const r = Math.max(this.game.g.cw, this.game.g.ch) * 0.55;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const i of sel) {
      const p = this.game.pieces[i];
      const a = this.worldToScreen(p.x - r, p.y - r);
      const b = this.worldToScreen(p.x + r, p.y + r);
      x0 = Math.min(x0, a.x);
      y0 = Math.min(y0, a.y);
      x1 = Math.max(x1, b.x);
      y1 = Math.max(y1, b.y);
    }
    return { x0, y0, x1, y1 };
  }

  // -------------------------------------------------------------- drawing --
  private frame() {
    this.raf = 0;
    this.lastRev = this.game.rev;
    this.dirty = false;
    const needMore = this.draw();
    this.onFrame?.();
    if (needMore) this.invalidate();
  }

  /** Called by the board when the game state has changed. */
  syncWithGame() {
    if (this.game.rev !== this.lastRev) this.invalidate();
  }

  private cmdsFor(i: number): PathCmd[] {
    let c = this.cmds.get(i);
    if (!c) {
      c = piecePath(this.game.g, this.game.edges, i);
      this.cmds.set(i, c);
    }
    return c;
  }

  private pathFor(i: number): Path2D {
    let p = this.paths.get(i);
    if (!p) {
      p = new Path2D(pathToSvg(this.cmdsFor(i)));
      this.paths.set(i, p);
    }
    return p;
  }

  /** Bitmap resolution wanted for the current zoom: sharp on screen, never beyond the picture's own pixels. */
  private wantedLevel(): { level: number; direct: boolean } {
    const g = this.game.g;
    const img = this.image;
    const src = img && img.naturalWidth > 0 ? img.naturalWidth / g.width : 4;
    const cap = MAX_BITMAP_SIDE / (Math.max(g.cw, g.ch) * 1.6);
    const need = this.camera.zoom * this.dpr;
    // Zoomed in past what a bitmap may hold: paint from the full-size picture instead, so
    // nothing is ever stretched beyond the picture's own pixels. Few pieces are on screen then.
    const direct = need > cap * 1.05 && !!img && img.complete && img.naturalWidth > 0;
    return { level: quantize(Math.min(need, src, cap)), direct };
  }

  /** Paints one piece straight from the source picture (used when zoomed far in). */
  private drawDirect(i: number, shadow: boolean) {
    const { ctx, image: img } = this;
    if (!img) return;
    const g = this.game.g;
    const home = homeOf(g, i);
    const cx = home.x + g.width / 2;
    const cy = home.y + g.height / 2;
    const path = this.pathFor(i);
    if (shadow) {
      ctx.shadowColor = "rgba(90,58,58,0.35)";
      ctx.shadowBlur = 16 * this.dpr;
      ctx.shadowOffsetY = 5 * this.dpr;
      ctx.fillStyle = "#fff";
      ctx.fill(path);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.clip(path);
    ctx.drawImage(img, -cx, -cy, g.width, g.height);
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = g.cw * 0.045;
    ctx.stroke(path);
    ctx.restore();
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(90,58,58,0.42)";
    ctx.lineWidth = g.cw * 0.014;
    ctx.stroke(path);
  }

  private bake(i: number, level: number): Bitmap | null {
    const old = this.bitmaps.get(i);
    const img = this.image;
    if (!img || !img.complete || img.naturalWidth === 0) return null;
    const g = this.game.g;
    const cmds = this.cmdsFor(i);
    const b = pathBounds(cmds);
    const pad = 2 / level;
    const minX = b.minX - pad;
    const minY = b.minY - pad;
    const w = b.maxX - b.minX + pad * 2;
    const h = b.maxY - b.minY + pad * 2;
    const s = level;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.ceil(w * s));
    canvas.height = Math.max(2, Math.ceil(h * s));
    const c = canvas.getContext("2d")!;
    c.imageSmoothingQuality = "high";
    c.scale(canvas.width / w, canvas.height / h);
    c.translate(-minX, -minY);

    // cell centre in picture coordinates (world units, origin at picture top-left)
    const home = homeOf(g, i);
    const cx = home.x + g.width / 2;
    const cy = home.y + g.height / 2;
    const path = this.pathFor(i);
    c.save();
    c.clip(path);
    c.drawImage(img, -cx, -cy, g.width, g.height);
    // soft inner rim so pieces read as chunky
    c.lineJoin = "round";
    c.strokeStyle = "rgba(255,255,255,0.38)";
    c.lineWidth = g.cw * 0.045;
    c.stroke(path);
    c.restore();
    c.lineJoin = "round";
    c.strokeStyle = "rgba(90,58,58,0.42)";
    c.lineWidth = g.cw * 0.014;
    c.stroke(path);

    const px = canvas.width * canvas.height;
    const bmp: Bitmap = { canvas, ox: minX, oy: minY, w, h, level, px };
    this.totalPx += px - (old?.px ?? 0);
    this.bitmaps.set(i, bmp);
    return bmp;
  }

  /** Draws one frame. Returns true if there is more to bake and another frame is needed. */
  private draw(): boolean {
    const { ctx, camera: cam, game } = this;
    const g = game.g;
    const dpr = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = PT.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const base = (extra?: (c: CanvasRenderingContext2D) => void) => {
      ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * (this.cssW / 2 - cam.x * cam.zoom), dpr * (this.cssH / 2 - cam.y * cam.zoom));
      extra?.(ctx);
    };

    // guide
    if (this.showGuide) {
      base();
      ctx.lineWidth = 3 / cam.zoom;
      ctx.setLineDash([10 / cam.zoom, 8 / cam.zoom]);
      ctx.strokeStyle = PT.guide;
      ctx.strokeRect(-g.width / 2, -g.height / 2, g.width, g.height);
      ctx.setLineDash([]);
    }

    // visible pieces, back to front
    const margin = Math.max(g.cw, g.ch) * 0.9;
    const left = cam.x - this.cssW / 2 / cam.zoom - margin;
    const right = cam.x + this.cssW / 2 / cam.zoom + margin;
    const top = cam.y - this.cssH / 2 / cam.zoom - margin;
    const bottom = cam.y + this.cssH / 2 / cam.zoom + margin;
    const visible: number[] = [];
    for (let i = 0; i < g.count; i++) {
      const p = game.pieces[i];
      if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) visible.push(i);
    }
    visible.sort((a, b) => game.z[a] - game.z[b]);

    let baked = 0;
    let rebaked = 0;
    let directDrawn = 0;
    let more = false;
    const { level: want, direct } = this.wantedLevel();
    const lifted = game.isDragging;
    for (const i of visible) {
      const p = game.pieces[i];
      const selected = game.isSelected(i);
      if (direct) {
        base();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 2);
        this.drawDirect(i, selected && lifted);
        continue;
      }
      let bmp = this.bitmaps.get(i) ?? null;
      if (!bmp) {
        if (baked < BITMAPS_PER_FRAME) {
          bmp = this.bake(i, want);
          if (bmp) baked++;
        } else more = true;
      } else if (bmp.level < want || bmp.level > want * 2.01) {
        // blurry (zoomed in) or oversized and shimmery (zoomed out): redo at the right resolution
        if (rebaked < REBAKES_PER_FRAME) {
          bmp = this.bake(i, want) ?? bmp;
          rebaked++;
        } else more = true;
      }
      // Still waiting on a sharp bitmap (just zoomed in, or not baked yet): paint from the picture itself.
      if ((!bmp || bmp.level < want * 0.99) && directDrawn < DIRECT_PER_FRAME && this.image && this.image.complete && this.image.naturalWidth > 0) {
        base();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 2);
        this.drawDirect(i, selected && lifted);
        directDrawn++;
        continue;
      }
      base();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 2);
      if (bmp) {
        if (selected && lifted) {
          ctx.shadowColor = "rgba(90,58,58,0.35)";
          ctx.shadowBlur = 16 * dpr;
          ctx.shadowOffsetY = 5 * dpr;
        }
        ctx.drawImage(bmp.canvas, bmp.ox, bmp.oy, bmp.w, bmp.h);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.fillStyle = "#F3E7DE";
        ctx.fill(this.pathFor(i));
        ctx.lineWidth = 1.5 / cam.zoom;
        ctx.strokeStyle = "rgba(90,58,58,0.3)";
        ctx.stroke(this.pathFor(i));
        if (!this.image) more = false;
      }
    }

    if (this.totalPx > PIXEL_BUDGET) {
      const keep = new Set(visible);
      for (const [i, b] of this.bitmaps) {
        if (keep.has(i)) continue;
        this.totalPx -= b.px;
        this.bitmaps.delete(i);
        if (this.totalPx <= PIXEL_BUDGET * 0.7) break;
      }
    }

    // outlines: selected pieces, and pieces another player is holding
    for (const i of visible) {
      const selected = game.isSelected(i);
      const held = this.remoteHeld.get(i);
      if (!selected && !held) continue;
      const p = game.pieces[i];
      base();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 2);
      ctx.lineJoin = "round";
      ctx.lineWidth = (selected ? 3.5 : 3) / cam.zoom;
      ctx.strokeStyle = selected ? PT.accent : held!;
      if (!selected) ctx.globalAlpha = 0.85;
      ctx.stroke(this.pathFor(i));
      ctx.globalAlpha = 1;
    }

    // rubber band
    if (this.marquee) {
      const a = this.worldToScreen(this.marquee.x0, this.marquee.y0);
      const b = this.worldToScreen(this.marquee.x1, this.marquee.y1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "rgba(190,85,96,0.08)";
      ctx.strokeStyle = PT.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.roundRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y), 6);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    return more;
  }
}
