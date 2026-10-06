"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { BoardCanvas, type BoardHandle, type BoardUi } from "./BoardCanvas";
import { PictureLightbox, SelectionToolbar, SnapButton, SolvedCard, Thumbnail, ZoomPill } from "./BoardOverlays";
import { TopBar, type BarPlayer } from "./TopBar";
import { RemoteCursors } from "./RemoteCursors";
import { SettingsDialog, type RoomSettings } from "./SettingsDialog";
import { PtButton, PtInput } from "./ui";
import { usePuzzleChannel } from "@/hooks/usePuzzleChannel";
import { getLocalPlayerId, getSavedName, saveName } from "@/lib/localPlayer";
import { PuzzleGame, type Change } from "@/lib/puzzle/game";
import { pushSamples, type CursorTrack } from "@/lib/puzzle/cursorTrack";
import { loadPrefs, savePrefs, type ViewPrefs } from "@/lib/puzzle/prefs";
import { makeGeometry } from "@/lib/puzzle/shapes";
import { loadImage } from "@/lib/puzzle/imageTools";
import type { CursorMsg, DragMsg, RowsMsg, SettingsMsg, TimeMsg } from "@/lib/puzzle/protocol";
import {
  addTime,
  imageUrl,
  loadPuzzle,
  markSolved,
  persistRows,
  setAutoSnapSetting,
  touchRoom,
  upsertPlayer,
  type LoadedPuzzle,
  type PuzzlePlayer,
} from "@/lib/puzzle/session";

const BAR_KEY = "puzzle:topbar";
const HELD_MS = 1400;
const TICK_SECONDS = 10;
const CURSOR_SAMPLE_MS = 30; // we note our pointer at most this often...
const CURSOR_FLUSH_MS = 80; // ...and send what we noted as one small batch this often

type Phase =
  | { kind: "name" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: LoadedPuzzle; me: PuzzlePlayer };

export function PuzzleRoom({ code }: { code: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [nameDraft, setNameDraft] = useState("");

  const runId = useRef(0);
  const enter = useCallback(
    async (name: string) => {
      const run = ++runId.current;
      const current = () => run === runId.current; // ignore answers from an older attempt
      setPhase({ kind: "loading" });
      try {
        const clientId = getLocalPlayerId();
        const data = await loadPuzzle(code, clientId);
        if (!current()) return;
        if (!data) return setPhase({ kind: "missing" });
        const me = await upsertPlayer(data.room.id, clientId, name, data.players.length);
        if (!current()) return;
        touchRoom(data.room.id);
        const players = data.players.some((p) => p.client_id === clientId) ? data.players : [...data.players, me];
        setPhase({ kind: "ready", data: { ...data, players }, me });
      } catch (e) {
        if (current()) setPhase({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong." });
      }
    },
    [code]
  );

  useEffect(() => {
    const saved = getSavedName();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- decide the first screen from localStorage
    if (!saved) setPhase({ kind: "name" });
    else void enter(saved);
  }, [enter]);

  if (phase.kind === "ready") return <RoomBoard key={phase.data.board.id} data={phase.data} me={phase.me} />;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      {phase.kind === "loading" && <p className="text-pt-muted text-lg">Opening room {code.toUpperCase()}…</p>}

      {phase.kind === "missing" && (
        <div className="max-w-sm">
          <h1 className="text-2xl font-medium">We couldn&apos;t find room {code.toUpperCase()}</h1>
          <p className="mt-2 text-pt-muted">Rooms close after 7 days with nobody in them. You can start a new puzzle any time.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/puzzle-together" className="h-12 px-6 inline-flex items-center rounded-full bg-pt-chip hover:bg-pt-line font-medium">
              Back
            </Link>
          </div>
        </div>
      )}

      {phase.kind === "error" && (
        <div className="max-w-sm">
          <h1 className="text-2xl font-medium">Something went wrong</h1>
          <p className="mt-2 text-pt-muted">{phase.message}</p>
          <PtButton className="mt-6" onClick={() => enter(getSavedName())}>
            Try again
          </PtButton>
        </div>
      )}

      {phase.kind === "name" && (
        <form
          className="w-full max-w-xs flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const n = nameDraft.trim();
            if (!n) return;
            saveName(n);
            void enter(n);
          }}
        >
          <h1 className="text-2xl font-medium mb-2">Joining room {code.toUpperCase()}</h1>
          <PtInput placeholder="Your name" value={nameDraft} maxLength={20} autoFocus onChange={(e) => setNameDraft(e.target.value)} aria-label="Your name" />
          <PtButton type="submit" disabled={!nameDraft.trim()}>
            Join
          </PtButton>
        </form>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------

function RoomBoard({ data, me }: { data: LoadedPuzzle; me: PuzzlePlayer }) {
  const { room, board } = data;
  const clientId = me.client_id;

  const game = useMemo(() => {
    const g = makeGeometry({
      seed: room.seed,
      cols: room.cols,
      rows: room.rows,
      imageW: room.image_width,
      imageH: room.image_height,
    });
    return new PuzzleGame(g, data.pieces, room.auto_snap);
    // the board is built once per room visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  const src = useMemo(() => imageUrl(room.image_path), [room.image_path]);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadImage(src)
      .then((img) => alive && setImage(img))
      .catch(() => alive && setImageFailed(true));
    return () => {
      alive = false;
    };
  }, [src]);

  const handleRef = useRef<BoardHandle | null>(null);
  const [ui, setUi] = useState<BoardUi>({ zoom: 0.5, selectedCount: 0, canSnap: false, selRect: null, dragging: false });
  const [prefs, setPrefs] = useState<ViewPrefs>(loadPrefs);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoSnap, setAutoSnap] = useState(room.auto_snap);
  const [barOpen, setBarOpen] = useState(true);
  const [lightbox, setLightbox] = useState(false);
  const [solved, setSolved] = useState(board.solved_at !== null || game.solved);
  const [showSolved, setShowSolved] = useState(true);
  const [saveTrouble, setSaveTrouble] = useState(false);
  const [areaSize, setAreaSize] = useState({ w: 1000, h: 700 });
  const areaRef = useRef<HTMLDivElement>(null);

  // Keep the browser's own page zoom and overscroll out of the board. Without this a pinch or
  // ctrl+wheel over a button (not the canvas) zooms the whole page and pushes the bar,
  // thumbnail and Snap button off screen.
  useEffect(() => {
    const stopZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const stop = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", stopZoom, { passive: false });
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    const html = document.documentElement;
    const prev = html.style.overscrollBehavior;
    html.style.overscrollBehavior = "none";
    return () => {
      window.removeEventListener("wheel", stopZoom);
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      html.style.overscrollBehavior = prev;
    };
  }, []);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- per-viewer preference from localStorage
      if (localStorage.getItem(BAR_KEY) === "closed") setBarOpen(false);
    } catch {
      /* storage can be unavailable */
    }
  }, []);
  const toggleBar = () =>
    setBarOpen((o) => {
      try {
        localStorage.setItem(BAR_KEY, o ? "closed" : "open");
      } catch {
        /* ignore */
      }
      return !o;
    });

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAreaSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ------------------------------------------------------------- the clock --
  // The clock only runs while someone is in the room. One person (the lowest
  // id in presence) writes it to the database; everyone shows the same value.
  const clock = useRef({ base: board.elapsed_seconds, at: 0 });
  useEffect(() => {
    clock.current.at = Date.now();
  }, []);
  const [elapsed, setElapsed] = useState(board.elapsed_seconds);
  const solvedRef = useRef(solved);
  useEffect(() => {
    solvedRef.current = solved;
  }, [solved]);

  const setClock = useCallback((seconds: number) => {
    clock.current = { base: seconds, at: Date.now() };
    setElapsed(seconds);
  }, []);

  // ---------------------------------------------------------------- channel --
  const heldRef = useRef(new Map<number, { color: string; at: number }>());
  const pushHeld = useCallback(() => {
    const out = new Map<number, string>();
    for (const [i, h] of heldRef.current) out.set(i, h.color);
    handleRef.current?.setRemoteHeld(out);
  }, []);

  const pointersRef = useRef(new Map<string, CursorTrack>());

  const channel = usePuzzleChannel({
    boardId: board.id,
    me: { clientId, name: me.name, color: me.color },
    handlers: {
      onDrag: (m: DragMsg) => {
        game.applyRemoteDrag(m.items);
        const now = Date.now();
        for (const it of m.items) heldRef.current.set(it.i, { color: m.color, at: now });
        pushHeld();
      },
      onRows: (m: RowsMsg) => {
        game.applyRemoteRows(m.rows);
        for (const r of m.rows) heldRef.current.delete(r.idx);
        pushHeld();
        handleRef.current?.invalidate();
        if (m.solved) {
          setClock(m.elapsed);
          setSolved(true);
          setShowSolved(true);
        }
      },
      onSettings: (m: SettingsMsg) => {
        game.setAutoSnap(m.autoSnap);
        setAutoSnap(m.autoSnap);
      },
      onTime: (m: TimeMsg) => {
        if (!solvedRef.current) setClock(m.elapsed);
      },
      onCursor: (m: CursorMsg) => {
        // put the batch on our own clock: each point happened `t` ms before it was sent
        const now = performance.now();
        let track = pointersRef.current.get(m.from);
        if (!track) pointersRef.current.set(m.from, (track = { samples: [] }));
        pushSamples(track, m.pts.map((p) => ({ x: p.x, y: p.y, at: now - p.t })));
      },
    },
  });
  const { online, connected, isTicker, sendDrag, sendRows, sendSettings, sendTime, sendCursor, setStats } = channel;

  // keep the guide in step with the setting
  useEffect(() => {
    handleRef.current?.setShowGuide(prefs.guide);
  }, [prefs.guide]);

  // Our own numbers for the avatar card: time in the room and joins made. They are kept on this device (per puzzle),
  // so a refresh doesn't reset them, and shared with everyone through presence.
  const statsKey = `puzzle:stats:${board.id}`;
  const statsRef = useRef({ secs: 0, joins: 0, at: 0 }); // totals as of `at`
  useEffect(() => {
    try {
      const raw = localStorage.getItem(statsKey);
      if (raw) {
        const v = JSON.parse(raw) as { secs?: number; joins?: number };
        statsRef.current = { secs: Number(v.secs) || 0, joins: Number(v.joins) || 0, at: Date.now() };
        return;
      }
    } catch {
      /* storage can be unavailable */
    }
    statsRef.current.at = Date.now();
  }, [statsKey]);
  const publishStats = useCallback(() => {
    const s = statsRef.current;
    const v = { secs: Math.round(s.secs + (s.at ? (Date.now() - s.at) / 1000 : 0)), joins: s.joins };
    try {
      localStorage.setItem(statsKey, JSON.stringify(v));
    } catch {
      /* ignore */
    }
    setStats(v);
  }, [statsKey, setStats]);
  useEffect(() => {
    if (!connected) return;
    publishStats();
    const t = setInterval(publishStats, 15_000);
    return () => clearInterval(t);
  }, [connected, publishStats]);
  const addJoins = useCallback(
    (n: number) => {
      const s = statsRef.current;
      const now = Date.now();
      statsRef.current = { secs: s.secs + (s.at ? (now - s.at) / 1000 : 0), joins: s.joins + n, at: now };
      publishStats();
    },
    [publishStats]
  );

  // share our pointer, a few times a second, and only while someone else is here to see it
  const othersHere = useRef(false);
  useEffect(() => {
    othersHere.current = online.some((o) => o.clientId !== clientId);
  }, [online, clientId]);
  const cursorBuf = useRef<Array<{ x: number | null; y: number | null; at: number }>>([]);
  const cursorTail = useRef<{ x: number | null; y: number | null; at: number } | null>(null);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushCursor = useCallback(() => {
    if (cursorTimer.current) clearTimeout(cursorTimer.current);
    cursorTimer.current = null;
    const buf = cursorBuf.current;
    const tail = cursorTail.current;
    if (tail && (buf.length === 0 || tail.at > buf[buf.length - 1].at)) buf.push(tail);
    cursorTail.current = null;
    cursorBuf.current = [];
    if (buf.length === 0) return;
    const now = performance.now();
    sendCursor({ from: clientId, pts: buf.map((p) => ({ x: p.x, y: p.y, t: Math.round(now - p.at) })) });
  }, [sendCursor, clientId]);
  const lastSampleAt = useRef(0);
  const onPointer = useCallback(
    (w: { x: number; y: number } | null) => {
      if (!othersHere.current) return;
      const now = performance.now();
      if (!w) {
        // left the board: tell everyone straight away
        cursorTail.current = null;
        cursorBuf.current.push({ x: null, y: null, at: now });
        flushCursor();
        return;
      }
      const pt = { x: Math.round(w.x * 10) / 10, y: Math.round(w.y * 10) / 10, at: now };
      if (now - lastSampleAt.current >= CURSOR_SAMPLE_MS) {
        lastSampleAt.current = now;
        cursorBuf.current.push(pt);
        cursorTail.current = null;
      } else {
        cursorTail.current = pt; // newest position, kept so a batch always ends where the pointer really is
      }
      if (!cursorTimer.current) cursorTimer.current = setTimeout(flushCursor, CURSOR_FLUSH_MS);
    },
    [flushCursor]
  );
  useEffect(
    () => () => {
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
    },
    []
  );

  // everyone else who is here right now
  const others = useMemo(
    () => online.filter((o) => o.clientId !== clientId).map((o) => ({ id: o.clientId, name: o.name, color: o.color })),
    [online, clientId]
  );

  // forget pieces nobody has touched for a moment (someone let go or left)
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [i, h] of heldRef.current) {
        if (now - h.at > HELD_MS) {
          heldRef.current.delete(i);
          changed = true;
        }
      }
      if (changed) pushHeld();
    }, 500);
    return () => clearInterval(t);
  }, [pushHeld]);

  // display tick, from timestamps so a throttled background tab doesn't drift
  useEffect(() => {
    if (!connected || solved) return;
    clock.current = { base: clock.current.base, at: Date.now() };
    const t = setInterval(() => {
      setElapsed(Math.floor(clock.current.base + (Date.now() - clock.current.at) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, [connected, solved]);

  // the ticker saves time and keeps everyone's clock in step
  useEffect(() => {
    if (!isTicker || solved) return;
    let lastSave = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      const secs = Math.round((now - lastSave) / 1000);
      lastSave = now;
      void addTime(board.id, secs);
      const current = Math.floor(clock.current.base + (now - clock.current.at) / 1000);
      sendTime({ from: clientId, elapsed: current });
    }, TICK_SECONDS * 1000);
    return () => clearInterval(t);
  }, [isTicker, solved, board.id, clientId, sendTime]);

  // ------------------------------------------------------------- committing --
  const save = useCallback(
    async (rows: Change["rows"]) => {
      const payload = rows.map((r) => ({ board_id: board.id, ...r }));
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await persistRows(payload);
          setSaveTrouble(false);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        }
      }
      setSaveTrouble(true);
    },
    [board.id]
  );

  const onCommit = useCallback(
    (change: Change) => {
      if (change.rows.length === 0) return;
      const now = Math.floor(clock.current.base + (Date.now() - clock.current.at) / 1000);
      void save(change.rows);
      if (change.merged > 0) addJoins(change.merged);
      sendRows({ from: clientId, color: me.color, rows: change.rows, solved: change.solved, elapsed: now });
      if (change.solved && !solvedRef.current) {
        setClock(now);
        setSolved(true);
        setShowSolved(true);
        void markSolved(board.id);
      }
    },
    [board.id, sendRows, clientId, me.color, save, setClock, addJoins]
  );

  const onLiveDrag = useCallback(() => {
    sendDrag({ from: clientId, color: me.color, items: game.livePositions() });
  }, [sendDrag, clientId, game, me.color]);

  const setAutoSnapTo = async (next: boolean) => {
    setAutoSnap(next);
    game.setAutoSnap(next);
    sendSettings({ from: clientId, autoSnap: next });
    try {
      await setAutoSnapSetting(room.id, next);
    } catch {
      /* the live broadcast already reached everyone present */
    }
  };

  // ------------------------------------------------------------------ view --
  const players: BarPlayer[] = useMemo(() => {
    const onlineIds = new Set(online.map((o) => o.clientId));
    const known = new Map<string, BarPlayer>();
    const here = new Map(online.map((o) => [o.clientId, o]));
    for (const p of data.players) {
      const o = here.get(p.client_id);
      known.set(p.client_id, { id: p.id, name: p.name, color: p.color, online: onlineIds.has(p.client_id), secs: o?.secs, joins: o?.joins });
    }
    for (const o of online) {
      if (!known.has(o.clientId)) known.set(o.clientId, { id: o.clientId, name: o.name, color: o.color, online: true, secs: o.secs, joins: o.joins });
    }
    return [...known.values()].sort((a, b) => Number(b.online) - Number(a.online));
  }, [data.players, online]);

  const aspect = room.image_width / room.image_height;
  const isHost = room.host_client_id === clientId;

  const saveSettings = (next: RoomSettings) => {
    const p: ViewPrefs = { guide: next.guide, cursors: next.cursors, names: next.names };
    setPrefs(p);
    savePrefs(p);
    if (isHost && next.autoSnap !== autoSnap) void setAutoSnapTo(next.autoSnap);
    setSettingsOpen(false);
  };

  return (
    <div ref={areaRef} className="fixed inset-0 overflow-hidden bg-pt-bg">
      <BoardCanvas
        game={game}
        image={image}
        onCommit={onCommit}
        onLiveDrag={onLiveDrag}
        onUi={setUi}
        onPointer={onPointer}
        onReady={(h) => {
          handleRef.current = h;
          h.setShowGuide(prefs.guide);
        }}
        paused={lightbox || settingsOpen || (solved && showSolved)}
      />

      {prefs.cursors && <RemoteCursors people={others} pointers={pointersRef} handleRef={handleRef} showNames={prefs.names} />}

      <TopBar
        code={room.code}
        elapsed={elapsed}
        solved={solved}
        players={players}
        onOpenSettings={() => setSettingsOpen(true)}
        expanded={barOpen}
        onToggleExpanded={toggleBar}
        dimmed={ui.dragging}
      />

      <SelectionToolbar ui={ui} area={areaSize} onRotate={(d) => handleRef.current?.rotate(d)} onClear={() => handleRef.current?.clearSelection()} />

      <Thumbnail src={src} aspect={aspect} onClick={() => setLightbox(true)} />
      <ZoomPill zoom={ui.zoom} onZoom={(f) => handleRef.current?.zoomBy(f)} onFit={() => handleRef.current?.fit()} />
      {!autoSnap && !solved && <SnapButton enabled={ui.canSnap} onClick={() => handleRef.current?.snap()} />}

      {imageFailed && (
        <div role="alert" className="absolute left-1/2 top-24 -translate-x-1/2 z-20 rounded-full bg-pt-surface border-2 border-pt-line px-5 py-2 text-sm text-pt-accent">
          The picture didn&apos;t load. Check your connection and refresh.
        </div>
      )}
      {saveTrouble && (
        <div role="status" className="absolute left-1/2 top-24 -translate-x-1/2 z-20 rounded-full bg-pt-surface border-2 border-pt-line px-5 py-2 text-sm text-pt-muted">
          Having trouble saving. Moves are still shared live.
        </div>
      )}

      {lightbox && <PictureLightbox src={src} onClose={() => setLightbox(false)} />}

      {settingsOpen && (
        <SettingsDialog
          initial={{ cursors: prefs.cursors, names: prefs.names, guide: prefs.guide, autoSnap }}
          isHost={isHost}
          onSave={saveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <AnimatePresence>
        {solved && showSolved && <SolvedCard key="solved" elapsed={elapsed} players={players} onLook={() => setShowSolved(false)} />}
      </AnimatePresence>
    </div>
  );
}