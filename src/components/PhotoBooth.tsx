import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, CameraOff, Download, RotateCcw, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const FILTERS = [
  { id: "normal", label: "Normal", css: "none" },
  { id: "bw", label: "Retro B&W", css: "grayscale(1) contrast(1.4)" },
  { id: "warm", label: "90s Warm Vintage", css: "sepia(0.55) saturate(1.6) hue-rotate(-10deg) brightness(1.05)" },
  { id: "cyber", label: "Cool Cyber", css: "hue-rotate(185deg) saturate(1.4) brightness(1.15) contrast(1.05)" },
  { id: "kodak", label: "Kodak Chrome", css: "contrast(1.35) saturate(1.3) sepia(0.2) brightness(1.02)" },
];

// Canvas-drawn colors (exported pixels) — literal values are required here.
const FRAMES = [
  { name: "Cream", bg: "#F8F5F0", ink: "#2B2420" },
  { name: "Charcoal", bg: "#1E1E1E", ink: "#F8F5F0" },
  { name: "Pastel Pink", bg: "#FDE2E4", ink: "#4A2A2E" },
  { name: "Retro Yellow", bg: "#FDF0D5", ink: "#3D2E14" },
  { name: "Sage", bg: "#E8AEB7", ink: "#3A2226" },
];

const SHOTS = 4;
const SHOT_W = 1200;
const SHOT_H = 900;

function beep(freq: number, dur = 0.12, type: OscillatorType = "sine") {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close().catch(() => {}), dur * 1000 + 100);
  } catch {
    /* audio blocked — ignore */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
}

export function PhotoBooth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<"loading" | "ready" | "denied">("loading");
  const [filter, setFilter] = useState(FILTERS[0]!);
  const [shots, setShots] = useState<string[]>([]);
  const [count, setCount] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<"camera" | "review">("camera");

  const startCamera = useCallback(async () => {
    setCamState("loading");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamState("ready");
    } catch {
      setCamState("denied");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [startCamera]);

  useEffect(() => {
    if (view === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [view]);

  const capture = (): string => {
    const v = videoRef.current!;
    const c = document.createElement("canvas");
    c.width = SHOT_W;
    c.height = SHOT_H;
    const ctx = c.getContext("2d")!;
    // cover-crop to 4:3
    const vw = v.videoWidth || SHOT_W;
    const vh = v.videoHeight || SHOT_H;
    const target = SHOT_W / SHOT_H;
    let sw = vw, sh = vh, sx = 0, sy = 0;
    if (vw / vh > target) { sw = vh * target; sx = (vw - sw) / 2; } else { sh = vw / target; sy = (vh - sh) / 2; }
    ctx.filter = filter.css;
    ctx.translate(SHOT_W, 0);
    ctx.scale(-1, 1); // mirror to match the preview
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, SHOT_W, SHOT_H);
    return c.toDataURL("image/jpeg", 0.95);
  };

  const runSequence = async () => {
    if (running || camState !== "ready") return;
    setRunning(true);
    setShots([]);
    const taken: string[] = [];
    for (let i = 0; i < SHOTS; i++) {
      for (const n of ["3", "2", "1"]) {
        setCount(n);
        beep(660);
        await sleep(1000);
      }
      setCount("Snap!");
      beep(1200, 0.08, "square");
      taken.push(capture());
      setShots([...taken]);
      setFlash(true);
      await sleep(180);
      setFlash(false);
      await sleep(500);
      setCount(null);
      await sleep(300);
    }
    setRunning(false);
    setView("review");
  };

  const retake = () => {
    setShots([]);
    setView("camera");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AnimatePresence>
        {flash && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 bg-flash"
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
        )}
      </AnimatePresence>

      <header className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-5 pt-8 pb-6 sm:pt-12">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Est. 2026 · Booth No. 4</p>
          <h1 className="font-display text-4xl font-extrabold leading-none sm:text-6xl">Photo Booth</h1>
        </div>
        <span className="hidden shrink-0 rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground sm:inline">
          {view === "camera" ? "● LIVE" : "DEVELOPED"}
        </span>
      </header>

      <AnimatePresence mode="wait">
        {view === "camera" ? (
          <motion.section
            key="camera"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 lg:grid-cols-[minmax(0,1fr)_200px]"
          >
            <div className="min-w-0">
              <div className="paper rounded-3xl p-3 sm:p-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-foreground">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full -scale-x-100 object-cover"
                    style={{ filter: filter.css }}
                  />
                  {camState !== "ready" && (
                    <div className="absolute inset-0 grid place-items-center bg-muted p-6 text-center">
                      {camState === "loading" ? (
                        <p className="font-mono text-sm text-muted-foreground">Warming up the camera…</p>
                      ) : (
                        <div className="max-w-sm space-y-4">
                          <CameraOff className="mx-auto h-10 w-10 text-primary" />
                          <h2 className="font-display text-2xl font-extrabold">The booth needs your camera</h2>
                          <p className="text-sm text-muted-foreground">
                            Camera access was blocked or isn't available. Allow access in your browser's address bar, then try again.
                          </p>
                          <button
                            onClick={startCamera}
                            className="btn-shutter rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"
                          >
                            Try again
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <AnimatePresence>
                    {count && (
                      <motion.div
                        key={count + shots.length}
                        initial={{ scale: 1.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute inset-0 grid place-items-center"
                      >
                        <span className="rounded-3xl bg-glass px-8 py-4 font-display text-6xl font-extrabold text-foreground backdrop-blur-md sm:text-8xl">
                          {count}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {running && (
                    <div className="absolute top-3 left-3 rounded-full bg-glass px-3 py-1 font-mono text-xs backdrop-blur">
                      Shot {Math.min(shots.length + 1, SHOTS)} / {SHOTS}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    disabled={running}
                    onClick={() => setFilter(f)}
                    className={`shrink-0 rounded-full border px-4 py-2 font-mono text-xs transition-colors ${
                      filter.id === f.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={runSequence}
                disabled={running || camState !== "ready"}
                className="btn-shutter mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-5 font-display text-xl font-extrabold text-primary-foreground disabled:opacity-60"
              >
                <Camera className="h-6 w-6" />
                {running ? "Smile! Shooting…" : "Start Photo Strip (4 Shots)"}
              </button>
            </div>

            <aside className="paper grid grid-cols-4 gap-2 rounded-2xl p-3 lg:grid-cols-1 lg:content-start">
              {Array.from({ length: SHOTS }).map((_, i) => (
                <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-dashed border-border bg-muted">
                  {shots[i] ? (
                    <motion.img
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={shots[i]}
                      alt={`Shot ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </div>
              ))}
            </aside>
          </motion.section>
        ) : (
          <StripEditor key="review" shots={shots} onRetake={retake} />
        )}
      </AnimatePresence>
    </main>
  );
}

const STRIP_W = 1200;
const STRIP_H = 3600;

function StripEditor({ shots, onRetake }: { shots: string[]; onRetake: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(FRAMES[0]!);
  const [caption, setCaption] = useState("MYSURU MEMORIES • 2026");
  const [grain, setGrain] = useState(true);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [dateStr] = useState(() => formatDate(new Date()));

  useEffect(() => {
    Promise.all(
      shots.map(
        (src) =>
          new Promise<HTMLImageElement>((res) => {
            const img = new Image();
            img.onload = () => res(img);
            img.src = src;
          }),
      ),
    ).then(setImages);
  }, [shots]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || images.length === 0) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = frame.bg;
    ctx.fillRect(0, 0, STRIP_W, STRIP_H);

    const m = 90;
    const gap = 60;
    const pw = STRIP_W - m * 2;
    const ph = pw * 0.75; // 765
    images.forEach((img, i) => {
      const y = m + i * (ph + gap);
      ctx.fillStyle = frame.ink;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(m - 12, y - 12, pw + 24, ph + 24);
      ctx.globalAlpha = 1;
      ctx.drawImage(img, m, y, pw, ph);
    });

    const footerTop = m + 4 * ph + 3 * gap;
    const mid = footerTop + (STRIP_H - footerTop) / 2;
    ctx.fillStyle = frame.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 78px Fraunces, Georgia, serif`;
    let size = 78;
    while (ctx.measureText(caption).width > pw && size > 30) {
      size -= 4;
      ctx.font = `800 ${size}px Fraunces, Georgia, serif`;
    }
    ctx.fillText(caption, STRIP_W / 2, mid - 40);
    ctx.font = `500 44px "DM Mono", monospace`;
    ctx.globalAlpha = 0.7;
    ctx.fillText(dateStr, STRIP_W / 2, mid + 55);
    ctx.globalAlpha = 1;

    if (grain) {
      const data = ctx.getImageData(0, 0, STRIP_W, STRIP_H);
      const d = data.data;
      for (let p = 0; p < d.length; p += 4) {
        const n = (Math.random() - 0.5) * 38;
        d[p] = d[p]! + n;
        d[p + 1] = d[p + 1]! + n;
        d[p + 2] = d[p + 2]! + n;
      }
      ctx.putImageData(data, 0, 0);
    }
  }, [images, frame, caption, grain, dateStr]);

  // re-render once fonts load
  useEffect(() => {
    document.fonts?.ready.then(() => setImages((i) => [...i]));
  }, []);

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "photo-booth-strip.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 md:grid-cols-[auto_minmax(0,1fr)]"
    >
      <motion.div
        initial={{ rotate: -4, y: 40 }}
        animate={{ rotate: -1.5, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="mx-auto w-[220px] sm:w-[260px]"
      >
        <canvas
          ref={canvasRef}
          width={STRIP_W}
          height={STRIP_H}
          className="h-auto w-full rounded-sm shadow-soft"
        />
      </motion.div>

      <div className="paper h-fit space-y-7 rounded-3xl p-6 sm:p-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Developed
          </p>
          <h2 className="font-display text-3xl font-extrabold">Customize Your Strip</h2>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Frame</p>
          <div className="flex flex-wrap gap-3">
            {FRAMES.map((f) => (
              <button
                key={f.name}
                onClick={() => setFrame(f)}
                title={f.name}
                aria-label={f.name}
                className={`h-11 w-11 rounded-full border-2 transition-transform hover:scale-110 ${
                  frame.name === f.name ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-card" : "border-border"
                }`}
                style={{ backgroundColor: f.bg }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label htmlFor="caption" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Footer text
          </label>
          <input
            id="caption"
            value={caption}
            maxLength={40}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="font-mono text-xs text-muted-foreground">Dated {dateStr}</p>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
          <label htmlFor="grain" className="text-sm font-medium">Vintage film grain</label>
          <Switch id="grain" checked={grain} onCheckedChange={setGrain} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={download}
            className="btn-shutter flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground"
          >
            <Download className="h-5 w-5" /> Download Photo Strip
          </button>
          <button
            onClick={onRetake}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-4 font-bold hover:bg-secondary"
          >
            <RotateCcw className="h-5 w-5" /> Retake Photos
          </button>
        </div>
      </div>
    </motion.section>
  );
}
