"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { PtButton, PtInput } from "./ui";
import { ASPECTS, defaultPresetIndex, presetsFor, aspectById } from "@/lib/puzzle/presets";
import {
  cropToBlob,
  fetchImageFromUrl,
  ImageError,
  loadImage,
  validateFile,
  type Cropped,
  type PixelArea,
} from "@/lib/puzzle/imageTools";
import { createPuzzleRoom, PuzzleError } from "@/lib/puzzle/session";
import { getLocalPlayerId, getSavedName } from "@/lib/localPlayer";
import type { AspectId } from "@/lib/puzzle/types";

type Step = "image" | "crop" | "settings";

function Stepper({ step }: { step: Step }) {
  const items: Array<[Step, string]> = [
    ["image", "Image"],
    ["crop", "Crop"],
    ["settings", "Settings"],
  ];
  const at = items.findIndex(([s]) => s === step);
  return (
    <ol className="flex items-center justify-center gap-3 text-[15px]" aria-label="Progress">
      {items.map(([s, label], i) => (
        <li key={s} className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${
              i === at ? "bg-pt-accent text-white" : i < at ? "text-pt-ink" : "text-pt-muted"
            }`}
          >
            <span className="font-medium">{i + 1}</span>
            {label}
          </span>
          {i < items.length - 1 && <span className="w-6 h-0.5 rounded bg-pt-line" />}
        </li>
      ))}
    </ol>
  );
}

export function CreateFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("image");
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  // step 1
  const [source, setSource] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  // step 2
  const [aspect, setAspect] = useState<AspectId>("4:3");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const area = useRef<PixelArea | null>(null);
  // step 3
  const [cropped, setCropped] = useState<(Cropped & { previewUrl: string }) | null>(null);
  const [presetIdx, setPresetIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const n = getSavedName();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage
    setName(n);
    if (!n) router.replace("/puzzle-together");
  }, [router]);

  const onCropComplete = useCallback((_: unknown, px: PixelArea) => {
    area.current = px;
  }, []);

  // ------------------------------------------------------------- step 1 --
  async function acceptBlob(blob: Blob) {
    setError("");
    try {
      const url = URL.createObjectURL(blob);
      const img = await loadImage(url);
      if (Math.min(img.naturalWidth, img.naturalHeight) < 300) throw new ImageError("That picture is too small. Try one that's at least 300 px wide.");
      if (source) URL.revokeObjectURL(source.url);
      setSource({ url, img });
      // start on whichever preset matches the picture best
      const r = img.naturalWidth / img.naturalHeight;
      const best = ASPECTS.reduce((a, b) => (Math.abs(b.w / b.h - r) < Math.abs(a.w / a.h - r) ? b : a));
      setAspect(best.id);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setStep("crop");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      validateFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return;
    }
    await acceptBlob(file);
  }

  // ------------------------------------------------------------- step 2 --
  async function confirmCrop() {
    if (!source || !area.current) return;
    setError("");
    try {
      const out = await cropToBlob(source.img, area.current);
      if (cropped) URL.revokeObjectURL(cropped.previewUrl);
      setCropped({ ...out, previewUrl: URL.createObjectURL(out.blob) });
      setPresetIdx(defaultPresetIndex(aspect));
      setStep("settings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  // ------------------------------------------------------------- step 3 --
  async function create() {
    if (!cropped) return;
    setBusy(true);
    setError("");
    try {
      const preset = presetsFor(aspect)[presetIdx];
      const code = await createPuzzleRoom({
        clientId: getLocalPlayerId(),
        name,
        image: cropped.blob,
        imageW: cropped.width,
        imageH: cropped.height,
        aspect,
        cols: preset.cols,
        rows: preset.rows,
        mode: "coop",
        autoSnap: true, // everyone can switch it off for themselves in the room settings
      });
      router.push(`/puzzle-together/${code}`);
    } catch (e) {
      setError(e instanceof PuzzleError || e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const back = () => {
    setError("");
    setStep(step === "settings" ? "crop" : "image");
  };

  return (
    <main className="flex-1 px-5 py-6 flex flex-col items-center">
      <div className="w-full max-w-3xl flex items-center justify-between">
        {step === "image" ? (
          <Link href="/puzzle-together" className="h-11 px-4 inline-flex items-center rounded-full text-pt-muted hover:bg-pt-chip">
            ← Back
          </Link>
        ) : (
          <button onClick={back} className="h-11 px-4 inline-flex items-center rounded-full text-pt-muted hover:bg-pt-chip cursor-pointer">
            ← Back
          </button>
        )}
        <Stepper step={step} />
        <span className="w-20" />
      </div>

      <div className="w-full max-w-3xl mt-8 flex-1">
        {step === "image" && <ImageStep onFile={onFile} onUrl={async (u) => {
          try {
            await acceptBlob(await fetchImageFromUrl(u));
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
          }
        }} />}

        {step === "crop" && source && (
          <div className="rounded-[32px] bg-pt-surface border-2 border-pt-line p-6 shadow-[0_8px_0_var(--pt-line)]">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <h1 className="text-2xl font-medium">Crop your picture</h1>
              <p className="text-sm text-pt-muted">Drag to reposition. Scroll or use the slider to zoom.</p>
            </div>

            <div className="relative mt-5 h-[340px] rounded-3xl overflow-hidden bg-pt-chip">
              <Cropper
                image={source.url}
                crop={crop}
                zoom={zoom}
                aspect={aspectById(aspect).w / aspectById(aspect).h}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid
                style={{ cropAreaStyle: { border: "3px solid #BE5560", borderRadius: 0, color: "rgba(250,248,245,0.78)" } }}
              />
            </div>

            <label className="mt-5 flex items-center gap-4 text-sm text-pt-muted">
              Zoom
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#BE5560] h-11"
                aria-label="Zoom"
              />
            </label>

            <div className="mt-3">
              <div className="text-sm text-pt-muted mb-2">Shape</div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Picture shape">
                {ASPECTS.map((a) => (
                  <button
                    key={a.id}
                    role="radio"
                    aria-checked={aspect === a.id}
                    onClick={() => {
                      setAspect(a.id);
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                    }}
                    className={`h-11 min-w-16 px-4 rounded-full text-[15px] font-medium cursor-pointer transition ${
                      aspect === a.id ? "bg-pt-accent text-white" : "bg-pt-chip text-pt-ink hover:bg-pt-line"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <PtButton variant="secondary" onClick={back}>
                Back
              </PtButton>
              <PtButton onClick={confirmCrop}>Use this crop</PtButton>
            </div>
          </div>
        )}

        {step === "settings" && cropped && (
          <SettingsStep
            cropped={cropped}
            aspect={aspect}
            presetIdx={presetIdx}
            setPresetIdx={setPresetIdx}
            busy={busy}
            onCreate={create}
          />
        )}

        {error && (
          <p role="alert" className="mt-4 text-center text-pt-accent">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

function ImageStep({ onFile, onUrl }: { onFile: (f: File | undefined) => void; onUrl: (u: string) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="max-w-xl mx-auto flex flex-col gap-5">
      <h1 className="text-3xl font-medium text-center">Choose your puzzle picture</h1>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-[32px] border-[3px] border-dashed h-56 flex flex-col items-center justify-center gap-3 transition ${
          over ? "border-pt-accent bg-pt-chip" : "border-pt-guide bg-pt-surface"
        }`}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#BE5560" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
        </svg>
        <div className="text-pt-muted">Drag a picture here</div>
        <PtButton small onClick={() => input.current?.click()}>
          Choose file
        </PtButton>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <div className="text-center text-sm text-pt-muted">or</div>
      <form
        className="flex gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!link.trim()) return;
          setLoading(true);
          await onUrl(link.trim());
          setLoading(false);
        }}
      >
        <PtInput placeholder="Paste a link to a picture" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Picture link" />
        <PtButton type="submit" variant="secondary" disabled={loading}>
          {loading ? "…" : "Load"}
        </PtButton>
      </form>
    </div>
  );
}

function SettingsStep(props: {
  cropped: Cropped & { previewUrl: string };
  aspect: AspectId;
  presetIdx: number;
  setPresetIdx: (n: number) => void;
  busy: boolean;
  onCreate: () => void;
}) {
  const { cropped, aspect, presetIdx, setPresetIdx, busy, onCreate } = props;
  const presets = presetsFor(aspect);
  const a = aspectById(aspect);
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
      <div className="flex flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
        <img
          src={cropped.previewUrl}
          alt="Your cropped picture"
          className="w-full border-[5px] border-pt-surface shadow-[0_6px_16px_rgba(90,58,58,0.16)]"
          style={{ aspectRatio: `${a.w} / ${a.h}` }}
        />
        <div className="text-sm text-pt-muted">{a.label} · your cropped picture</div>
        {cropped.enhanced && (
          <div className="text-sm text-pt-muted">
            Small picture: we smoothed and sharpened it. Fewer pieces will look cleanest up close.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-7">
        <section>
          <h2 className="text-sm text-pt-muted mb-2">How many pieces?</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Number of pieces">
            {presets.map((p, i) => (
              <button
                key={`${p.cols}x${p.rows}`}
                role="radio"
                aria-checked={presetIdx === i}
                onClick={() => setPresetIdx(i)}
                className={`h-14 px-4 rounded-2xl text-left cursor-pointer transition ${
                  presetIdx === i ? "bg-pt-accent text-white" : "bg-pt-chip text-pt-ink hover:bg-pt-line"
                }`}
              >
                <div className="text-lg leading-none font-medium">{p.cols * p.rows}</div>
                <div className={`text-xs ${presetIdx === i ? "text-white/80" : "text-pt-muted"}`}>{p.label}</div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-pt-muted">The options follow the picture&apos;s shape.</p>
        </section>

        <section>
          <h2 className="text-sm text-pt-muted mb-2">Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border-2 border-pt-accent bg-pt-surface p-4">
              <div className="font-medium">Co-op</div>
              <div className="text-[13px] text-pt-muted leading-snug mt-1">One puzzle, everyone builds it together.</div>
            </div>
            <div className="rounded-3xl border-2 border-pt-line bg-pt-surface p-4 opacity-60" aria-disabled="true">
              <div className="font-medium">Competition</div>
              <div className="text-[13px] text-pt-muted leading-snug mt-1">Everyone gets their own copy. Coming soon.</div>
            </div>
          </div>
        </section>

        <PtButton onClick={onCreate} disabled={busy} className="w-full">
          {busy ? "Making your room…" : "Create room"}
        </PtButton>
        <p className="-mt-4 text-center text-[13px] text-pt-muted">Share the room number from the top bar. Others can join any time.</p>
      </div>
    </div>
  );
}